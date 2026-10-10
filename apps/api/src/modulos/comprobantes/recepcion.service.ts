import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { BitacoraService } from '../auditoria/bitacora.service';
import { NoRecibirDao } from '../inventario/dao/no-recibir.dao';
import { MovimientosService } from '../inventario/movimientos.service';
import { ComprobanteDao } from './dao/comprobante.dao';
import { aComprobanteVista, buscarPorFolio, estadoInvalido } from './vistas';

export interface LineaRecibida {
  lineaId: string;
  cantidadConfirmada: number;
  venceEn?: Date;
  motivoDiferencia?: string;
}

const TRANSACCION = { timeout: 20_000, maxWait: 10_000 };
// Presentaciones por contenido, en la unidad base con tres decimales como movimiento.cantidad
const aBase = (presentaciones: number, contenido: number) =>
  Math.round(presentaciones * contenido * 1000) / 1000;

/** El Operador recibe una donación preparada (RF-CMP-001C). */
@Injectable()
export class RecepcionService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly comprobantes: ComprobanteDao,
    private readonly noRecibir: NoRecibirDao,
    private readonly bitacora: BitacoraService,
    private readonly movimientos: MovimientosService,
  ) {}

  async consultar(texto: string) {
    return aComprobanteVista(await buscarPorFolio(this.comprobantes, texto));
  }

  async recibir(
    usuario: UsuarioAutenticado,
    texto: string,
    datos: { acopioId: string; lineas: LineaRecibida[] },
  ) {
    await this.movimientos.exigirOperador(usuario, datos.acopioId);
    const previo = await buscarPorFolio(this.comprobantes, texto);
    // El estado manda sobre la forma del cuerpo: un reintento sobre un folio ya recibido es 409
    if (previo.estado !== 'PREPARADO') throw estadoInvalido(previo.estado, 'recibir');
    const ids = new Set(datos.lineas.map((l) => l.lineaId));
    if (
      ids.size !== datos.lineas.length ||
      ids.size !== previo.lineas.length ||
      previo.lineas.some((l) => !ids.has(l.id))
    ) {
      throw new ErrorDominio(
        'LINEAS_INCOMPLETAS',
        'Confirma cada línea de la donación una vez, aunque sea en cero',
      );
    }
    const porLinea = new Map(datos.lineas.map((l) => [l.lineaId, l]));
    const ahora = new Date();

    const c = await this.transacciones.ejecutar(async (tx) => {
      // El UPDATE condicionado toma el candado de la fila: otra recepción o una cancelación
      // espera aquí y luego ve que ya no está PREPARADO
      const cambiadas = await this.comprobantes.cambiarSiEstado(tx, previo.id, 'PREPARADO', {
        estado: 'PENDIENTE',
        acopio_id: datos.acopioId,
        recibido_por: usuario.id,
        recibido_en: ahora,
      });
      if (cambiadas === 0) {
        throw estadoInvalido(await this.comprobantes.estado(tx, previo.id), 'recibir');
      }

      // Las entradas toman un candado por acopio y categoría hasta el commit: todas las
      // transacciones los piden en el mismo orden para que dos recepciones no se crucen
      const lineas = [...previo.lineas].sort(
        (x, y) => x.categoria_id.localeCompare(y.categoria_id) || x.id.localeCompare(y.id),
      );
      for (const linea of lineas) {
        const recibida = porLinea.get(linea.id)!;
        const venceEn = recibida.venceEn ?? linea.vence_en;
        if (recibida.cantidadConfirmada > 0) {
          if (linea.categoria.perecedero && !venceEn) {
            throw new ErrorDominio(
              'VENCIMIENTO_REQUERIDO',
              `${linea.categoria.nombre} es perecedera: indica la fecha de vencimiento`,
            );
          }
          const { fila } = await this.movimientos.entradaEnTransaccion(
            tx,
            usuario,
            datos.acopioId,
            {
              categoriaId: linea.categoria_id,
              cantidad: aBase(recibida.cantidadConfirmada, Number(linea.contenido_unitario)),
              venceEn: venceEn ?? null,
              ocurridoEn: ahora,
              origenOffline: false,
            },
          );
          await this.comprobantes.vincular(tx, previo.id, [fila.id], {
            origen: 'RECEPCION',
            usuarioId: usuario.id,
          });
        }
        await this.comprobantes.actualizarLinea(tx, linea.id, {
          cantidad_confirmada: recibida.cantidadConfirmada,
          vence_en: linea.categoria.perecedero ? (venceEn ?? null) : null,
          motivo_diferencia: recibida.motivoDiferencia?.trim() || null,
        });
      }

      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'comprobante.recibido',
        entidad: 'comprobante',
        entidadId: previo.id,
        ubicacionId: datos.acopioId,
        antes: { estado: 'PREPARADO', acopioId: previo.acopio_id },
        despues: { estado: 'PENDIENTE', acopioId: datos.acopioId },
        // Llegó a otro acopio: el cambio tiene que saltar a la vista del Auditor
        destacado: previo.acopio_id !== datos.acopioId,
      });
      return this.comprobantes.conLineas(tx, previo.id);
    }, TRANSACCION);

    const marcas = await this.noRecibir.vigentesEnAcopio(
      datos.acopioId,
      c.lineas.map((l) => l.categoria_id),
      new Date(ahora.toISOString().slice(0, 10)),
    );
    return { comprobante: aComprobanteVista(c), noRecibe: marcas.map((m) => m.categoria_id) };
  }
}
