import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { MovimientosService } from '../inventario/movimientos.service';
import { aComprobanteVista, buscarPorFolio, CON_LINEAS, estadoInvalido } from './vistas';

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
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly movimientos: MovimientosService,
  ) {}

  async consultar(texto: string) {
    return aComprobanteVista(await buscarPorFolio(this.prisma, texto));
  }

  async recibir(
    usuario: UsuarioAutenticado,
    texto: string,
    datos: { acopioId: string; lineas: LineaRecibida[] },
  ) {
    await this.movimientos.exigirOperador(usuario, datos.acopioId);
    const previo = await buscarPorFolio(this.prisma, texto);
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

    const c = await this.prisma.$transaction(async (tx) => {
      // El UPDATE condicionado toma el candado de la fila: otra recepción o una cancelación
      // espera aquí y luego ve que ya no está PREPARADO
      const { count } = await tx.comprobante.updateMany({
        where: { id: previo.id, estado: 'PREPARADO' },
        data: {
          estado: 'PENDIENTE',
          acopio_id: datos.acopioId,
          recibido_por: usuario.id,
          recibido_en: ahora,
        },
      });
      if (count === 0) {
        const actual = await tx.comprobante.findUniqueOrThrow({
          where: { id: previo.id },
          select: { estado: true },
        });
        throw estadoInvalido(actual.estado, 'recibir');
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
          await tx.comprobanteMovimiento.create({
            data: {
              comprobante_id: previo.id,
              movimiento_id: fila.id,
              origen: 'RECEPCION',
              vinculado_por: usuario.id,
            },
          });
        }
        await tx.lineaComprobante.update({
          where: { id: linea.id },
          data: {
            cantidad_confirmada: recibida.cantidadConfirmada,
            vence_en: linea.categoria.perecedero ? (venceEn ?? null) : null,
            motivo_diferencia: recibida.motivoDiferencia?.trim() || null,
          },
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
      return tx.comprobante.findUniqueOrThrow({ where: { id: previo.id }, include: CON_LINEAS });
    }, TRANSACCION);

    const marcas = await this.prisma.noRecibir.findMany({
      where: {
        acopio_id: datos.acopioId,
        categoria_id: { in: c.lineas.map((l) => l.categoria_id) },
        OR: [{ hasta: null }, { hasta: { gte: new Date(ahora.toISOString().slice(0, 10)) } }],
      },
      select: { categoria_id: true },
    });
    return { comprobante: aComprobanteVista(c), noRecibe: marcas.map((m) => m.categoria_id) };
  }
}
