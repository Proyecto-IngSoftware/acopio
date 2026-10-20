import { Injectable } from '@nestjs/common';
import { errorDeLinea, type UnidadBase } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { CodigosBarrasService } from '../catalogo/codigos-barras.service';
import { PresentacionesService } from '../catalogo/presentaciones.service';
import { NoRecibirDao } from '../inventario/dao/no-recibir.dao';
import { MovimientosService } from '../inventario/movimientos.service';
import { ComprobanteDao } from './dao/comprobante.dao';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import type { ComprobanteConLineas } from './dao/comprobante.dao';
import { aComprobanteVista, buscarPorFolio, estadoInvalido } from './vistas';

export interface LineaRecibida {
  lineaId: string;
  presentacionId?: string;
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
    private readonly codigosServicio: CodigosBarrasService,
    private readonly presentaciones: PresentacionesService,
    private readonly categorias: CategoriaDao,
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
    const porLinea0 = new Map(datos.lineas.map((l) => [l.lineaId, l]));
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
    for (const l of previo.lineas) {
      if (porLinea0.get(l.id)?.presentacionId && !l.ean) {
        throw new ErrorDominio(
          'LINEA_SIN_CODIGO',
          'Una línea sin código de barras no admite presentación',
          422,
        );
      }
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

      // Las correcciones se resuelven antes de ordenar: el orden de candados usa la categoría nueva
      // Cada EAN se resuelve una vez, en orden ascendente: dos recepciones toman las filas de
      // código y presentación en el mismo orden y no se cruzan
      const porId = [...previo.lineas].sort((x, y) => x.id.localeCompare(y.id));
      const destinos = new Map<string, string | null>();
      const eans = [...new Set(porId.flatMap((l) => (l.ean ? [l.ean] : [])))].sort();
      const pedidos = eans.map((ean) => ({
        ean,
        presentacionId: porId
          .filter((l) => l.ean === ean)
          .map((l) => porLinea.get(l.id)!.presentacionId)
          .find((id) => id !== undefined),
      }));
      // Primero las presentaciones (por id) y luego los códigos (por EAN): un solo orden de filas
      await this.codigosServicio.validarPresentacionesDeRecepcion(tx, usuario, pedidos);
      for (const { ean, presentacionId: dada } of pedidos) {
        destinos.set(ean, await this.codigosServicio.resolverEnRecepcion(tx, usuario, ean, dada));
      }
      const resueltas = [];
      for (const linea of previo.lineas) {
        const destino = linea.ean ? destinos.get(linea.ean) : null;
        resueltas.push(
          await this.resolver(
            tx,
            usuario,
            previo.id,
            linea,
            porLinea.get(linea.id)!,
            destino ?? null,
          ),
        );
      }
      // Las entradas toman un candado por acopio y categoría hasta el commit: todas las
      // transacciones los piden en el mismo orden para que dos recepciones no se crucen
      const lineas = resueltas.sort(
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
              cantidad: aBase(recibida.cantidadConfirmada, linea.contenido),
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
          categoria_id: linea.categoria_id,
          contenido_unitario: linea.contenido,
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

  /**
   * Devuelve la línea con la categoría y el contenido que valen para la entrada (los de la
   * presentación destino del código, ya resuelto), y escribe `comprobante.linea_corregida`
   * si cambiaron. Aplica el tope de línea.
   */
  private async resolver(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    comprobanteId: string,
    linea: ComprobanteConLineas['lineas'][number],
    recibida: LineaRecibida,
    destinoId: string | null,
  ) {
    let categoria = { id: linea.categoria_id, ...linea.categoria };
    let contenido = Number(linea.contenido_unitario);
    if (destinoId) {
      const p = await this.presentaciones.buscarEnTransaccion(tx, destinoId);
      if (!p)
        throw new ErrorDominio('PRESENTACION_NO_ENCONTRADA', 'La presentación no existe', 404);
      if (p.categoriaId !== categoria.id) {
        const c = await this.categorias.buscar(p.categoriaId, tx);
        categoria = {
          id: c!.id,
          nombre: c!.nombre,
          unidad_base: c!.unidad_base,
          perecedero: c!.perecedero,
        };
      }
      if (p.categoriaId !== linea.categoria_id || p.tamano !== contenido) {
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'comprobante.linea_corregida',
          entidad: 'comprobante',
          entidadId: comprobanteId,
          antes: {
            lineaId: linea.id,
            ean: linea.ean,
            categoriaId: linea.categoria_id,
            contenidoUnitario: contenido,
          },
          despues: {
            lineaId: linea.id,
            ean: linea.ean,
            categoriaId: p.categoriaId,
            presentacionId: p.id,
            contenidoUnitario: p.tamano,
          },
        });
        contenido = p.tamano;
      }
    }
    const tope = errorDeLinea(
      aBase(recibida.cantidadConfirmada, contenido),
      categoria.unidad_base as UnidadBase,
    );
    if (tope) throw new ErrorDominio('CANTIDAD_FUERA_DE_TOPE', tope, 422);
    return {
      id: linea.id,
      categoria_id: categoria.id,
      categoria,
      contenido,
      vence_en: linea.vence_en,
    };
  }
}
