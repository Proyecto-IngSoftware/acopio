import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Prisma } from '../../generado/prisma/client';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { NotificacionService } from '../notificaciones/notificacion.service';
import { plantillas } from '../notificaciones/plantillas';
import {
  aComprobanteVista,
  buscarPorFolio,
  CON_LINEAS,
  estadoInvalido,
  type ComprobanteConLineas,
} from './vistas';

export const MOTIVOS = {
  DUPLICADO: 'La donación está registrada dos veces',
  NO_CUADRA_MOVIMIENTOS: 'Lo confirmado no coincide con lo que entró al inventario',
  DIFERENCIA_SIN_EXPLICAR: 'Hay una diferencia sin explicar entre lo declarado y lo recibido',
  OTRO: 'Otro motivo',
} as const;
export type Motivo = keyof typeof MOTIVOS;

const CATORCE_DIAS = 14 * 86_400_000;
const redondo = (n: number) => Math.round(n * 1000) / 1000;
const noVinculable = (mensaje: string) => new ErrorDominio('MOVIMIENTO_NO_VINCULABLE', mensaje);
const conDiferencia = (c: ComprobanteConLineas) =>
  c.lineas.some(
    (l) => l.cantidad_confirmada !== null && !l.cantidad_confirmada.equals(l.cantidad_declarada),
  );

/** El Auditor: bandeja, vínculos, conciliar y rechazar (RF-CMP-003 a 005). */
@Injectable()
export class ConciliacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly correo: NotificacionService,
  ) {}

  private async exigirAlcance(usuario: UsuarioAutenticado, acopioId: string) {
    if (!(await this.alcance.puede(usuario, 'ACOPIO', acopioId))) {
      throw new ForbiddenException('No tienes asignado este acopio');
    }
  }

  async bandeja(
    usuario: UsuarioAutenticado,
    filtro: {
      estado?: 'PENDIENTE' | 'CONCILIADO' | 'RECHAZADO';
      acopioId?: string;
      desde?: Date;
      hasta?: Date;
    },
  ) {
    const asignados = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    const acopios = filtro.acopioId
      ? asignados === null || asignados.includes(filtro.acopioId)
        ? [filtro.acopioId]
        : []
      : asignados;
    const enAlcance: Prisma.ComprobanteWhereInput =
      acopios === null ? {} : { acopio_id: { in: acopios } };
    const filas = await this.prisma.comprobante.findMany({
      where: {
        ...enAlcance,
        estado: filtro.estado ?? 'PENDIENTE',
        creado_en: { gte: filtro.desde, lte: filtro.hasta },
      },
      include: CON_LINEAS,
      orderBy: { creado_en: 'asc' },
      take: 200,
    });
    // El contador cubre todo el alcance aunque la lista venga filtrada por un acopio
    const grupos = await this.prisma.comprobante.groupBy({
      by: ['acopio_id'],
      where: {
        ...(asignados === null ? {} : { acopio_id: { in: asignados } }),
        estado: 'PENDIENTE',
      },
      _count: { _all: true },
    });
    const nombres = await this.prisma.acopio.findMany({
      where: { id: { in: grupos.map((g) => g.acopio_id) } },
      select: { id: true, nombre: true },
    });
    return {
      comprobantes: filas.map((c) => ({
        ...aComprobanteVista(c),
        conDiferencia: conDiferencia(c),
      })),
      porAcopio: grupos.map((g) => ({
        acopioId: g.acopio_id,
        nombre: nombres.find((n) => n.id === g.acopio_id)?.nombre ?? '',
        pendientes: g._count._all,
      })),
    };
  }

  async detalle(usuario: UsuarioAutenticado, texto: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    await this.exigirAlcance(usuario, c.acopio_id);
    const vinculos = await this.prisma.comprobanteMovimiento.findMany({
      where: { comprobante_id: c.id },
      include: {
        movimiento: {
          include: {
            categoria: { select: { nombre: true, unidad_base: true } },
            usuario: { select: { nombre: true } },
          },
        },
      },
      orderBy: { vinculado_en: 'asc' },
    });
    const resumen = new Map<
      string,
      { categoria: string; unidad: string; confirmado: number; entradas: number }
    >();
    for (const l of c.lineas) {
      const fila = resumen.get(l.categoria_id) ?? {
        categoria: l.categoria.nombre,
        unidad: l.categoria.unidad_base,
        confirmado: 0,
        entradas: 0,
      };
      fila.confirmado += Number(l.cantidad_confirmada ?? 0) * Number(l.contenido_unitario);
      resumen.set(l.categoria_id, fila);
    }
    for (const v of vinculos) {
      const fila = resumen.get(v.movimiento.categoria_id) ?? {
        categoria: v.movimiento.categoria.nombre,
        unidad: v.movimiento.categoria.unidad_base,
        confirmado: 0,
        entradas: 0,
      };
      fila.entradas += Number(v.movimiento.cantidad);
      resumen.set(v.movimiento.categoria_id, fila);
    }
    return {
      ...aComprobanteVista(c),
      conDiferencia: conDiferencia(c),
      entradas: vinculos.map((v) => ({
        movimientoId: v.movimiento_id,
        categoriaId: v.movimiento.categoria_id,
        categoria: v.movimiento.categoria.nombre,
        unidad: v.movimiento.categoria.unidad_base,
        cantidad: Number(v.movimiento.cantidad),
        ocurridoEn: v.movimiento.ocurrido_en,
        origen: v.origen,
        registradoPor: v.movimiento.usuario.nombre,
      })),
      resumen: [...resumen].map(([categoriaId, f]) => ({
        categoriaId,
        categoria: f.categoria,
        unidad: f.unidad,
        confirmado: redondo(f.confirmado),
        entradas: redondo(f.entradas),
        cuadra: redondo(f.confirmado) === redondo(f.entradas),
      })),
    };
  }

  async vinculables(usuario: UsuarioAutenticado, texto: string, acopioId?: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    const acopio = acopioId ?? c.acopio_id;
    await this.exigirAlcance(usuario, acopio);
    const filas = await this.prisma.movimiento.findMany({
      where: {
        acopio_id: acopio,
        tipo: 'ENTRADA',
        vinculo: null,
        registrado_en: { gte: new Date(Date.now() - CATORCE_DIAS) },
      },
      include: {
        categoria: { select: { nombre: true, unidad_base: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { secuencia: 'desc' },
      take: 100,
    });
    return filas.map((m) => ({
      id: m.id,
      categoriaId: m.categoria_id,
      categoria: m.categoria.nombre,
      unidad: m.categoria.unidad_base,
      cantidad: Number(m.cantidad),
      ocurridoEn: m.ocurrido_en,
      origenOffline: m.origen_offline,
      registradoPor: m.usuario.nombre,
    }));
  }

  async vincular(usuario: UsuarioAutenticado, texto: string, movimientoIds: string[]) {
    const c = await buscarPorFolio(this.prisma, texto);
    if (c.estado !== 'PREPARADO' && c.estado !== 'PENDIENTE')
      throw estadoInvalido(c.estado, 'vincular entradas');
    const ids = [...new Set(movimientoIds)];
    const movs = await this.prisma.movimiento.findMany({
      where: { id: { in: ids } },
      include: { vinculo: true },
    });
    if (movs.length !== ids.length) throw noVinculable('Una de las entradas no existe');
    if (movs.some((m) => m.tipo !== 'ENTRADA')) throw noVinculable('Solo se vinculan entradas');
    if (movs.some((m) => m.vinculo))
      throw noVinculable('Una de las entradas ya es de otra donación');
    if (new Set(movs.map((m) => m.acopio_id)).size !== 1)
      throw noVinculable('Las entradas tienen que ser de un mismo acopio');
    const acopioId = movs[0]!.acopio_id;
    await this.exigirAlcance(usuario, acopioId);
    // Reasignar el folio saca el comprobante del alcance de quien lo tenía
    await this.exigirAlcance(usuario, c.acopio_id);
    // Reasignar el acopio solo vale en un folio sin vínculos: con ellos, el lote no se mezcla
    const previos = await this.prisma.comprobanteMovimiento.findMany({
      where: { comprobante_id: c.id },
      select: { movimiento: { select: { acopio_id: true } } },
    });
    if (previos.some((v) => v.movimiento.acopio_id !== acopioId))
      throw noVinculable('Las entradas tienen que ser del mismo acopio que las ya vinculadas');

    try {
      const hecho = await this.prisma.$transaction(async (tx) => {
        // Condicionado al estado leído: una recepción o cancelación concurrente no se pisa
        const { count } = await tx.comprobante.updateMany({
          where: { id: c.id, estado: c.estado },
          data: {
            acopio_id: acopioId,
            // Entregado sin red: nadie lo recibió por folio, así que entra a la bandeja ahora
            ...(c.estado === 'PREPARADO'
              ? { estado: 'PENDIENTE' as const, recibido_en: new Date() }
              : {}),
          },
        });
        if (count === 0) {
          const actual = await tx.comprobante.findUniqueOrThrow({ where: { id: c.id } });
          throw estadoInvalido(actual.estado, 'vincular entradas');
        }
        await tx.comprobanteMovimiento.createMany({
          data: ids.map((id) => ({
            comprobante_id: c.id,
            movimiento_id: id,
            origen: 'AUDITOR' as const,
            vinculado_por: usuario.id,
          })),
        });
        const actualizado = await tx.comprobante.findUniqueOrThrow({
          where: { id: c.id },
          include: CON_LINEAS,
        });
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'comprobante.vinculado',
          entidad: 'comprobante',
          entidadId: c.id,
          ubicacionId: acopioId,
          antes: { estado: c.estado, acopioId: c.acopio_id },
          despues: { estado: actualizado.estado, acopioId, movimientos: ids },
          destacado: acopioId !== c.acopio_id,
        });
        return actualizado;
      });
      return aComprobanteVista(hecho);
    } catch (e) {
      // Otro Auditor vinculó la misma entrada entre la lectura y la escritura
      if (esLlaveDuplicada(e)) throw noVinculable('Una de las entradas ya es de otra donación');
      throw e;
    }
  }

  async conciliar(usuario: UsuarioAutenticado, texto: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    await this.exigirAlcance(usuario, c.acopio_id);
    if (c.estado !== 'PENDIENTE') throw estadoInvalido(c.estado, 'conciliar');
    if (
      (await this.prisma.comprobanteMovimiento.count({ where: { comprobante_id: c.id } })) === 0
    ) {
      throw new ErrorDominio('SIN_VINCULOS', 'Vincula al menos una entrada antes de conciliar');
    }
    const ahora = new Date();
    return this.cambiar(usuario, c, 'comprobante.conciliado', 'conciliar', false, {
      estado: 'CONCILIADO',
      verificado_por: usuario.id,
      verificado_en: ahora,
      cerrado_en: ahora,
    });
  }

  async rechazar(
    usuario: UsuarioAutenticado,
    texto: string,
    datos: { motivo: Motivo; nota?: string },
  ) {
    const c = await buscarPorFolio(this.prisma, texto);
    await this.exigirAlcance(usuario, c.acopio_id);
    if (c.estado !== 'PENDIENTE') throw estadoInvalido(c.estado, 'rechazar');
    const nota = datos.nota?.trim() || null;
    const donador = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: c.donador_id },
      select: { nombre: true, correo: true },
    });
    const ahora = new Date();
    return this.cambiar(
      usuario,
      c,
      'comprobante.rechazado',
      'rechazar',
      true,
      {
        estado: 'RECHAZADO',
        motivo_rechazo: datos.motivo,
        nota_rechazo: nota,
        verificado_por: usuario.id,
        verificado_en: ahora,
        cerrado_en: ahora,
      },
      async (tx) => {
        if (!donador.correo) return;
        await this.correo.encolar(
          tx,
          donador.correo,
          plantillas.rechazoDonacion({
            nombre: donador.nombre,
            folio: c.folio,
            motivo: MOTIVOS[datos.motivo],
            nota,
          }),
        );
      },
    );
  }

  async revertirRechazo(usuario: UsuarioAutenticado, texto: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    await this.exigirAlcance(usuario, c.acopio_id);
    if (c.estado !== 'RECHAZADO') throw estadoInvalido(c.estado, 'revertir el rechazo');
    return this.cambiar(usuario, c, 'comprobante.rechazo_revertido', 'revertir el rechazo', true, {
      estado: 'PENDIENTE',
      motivo_rechazo: null,
      nota_rechazo: null,
      verificado_por: null,
      verificado_en: null,
      cerrado_en: null,
    });
  }

  private async cambiar(
    usuario: UsuarioAutenticado,
    c: ComprobanteConLineas,
    accion: string,
    verbo: string,
    destacado: boolean,
    data: Prisma.ComprobanteUncheckedUpdateInput,
    ademas?: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    const hecho = await this.prisma.$transaction(async (tx) => {
      // updateMany con el estado leído: si otro Auditor cambió el folio en medio, no pisa
      const { count } = await tx.comprobante.updateMany({
        where: { id: c.id, estado: c.estado },
        data,
      });
      if (count === 0) {
        const ahora = await tx.comprobante.findUniqueOrThrow({ where: { id: c.id } });
        throw estadoInvalido(ahora.estado, verbo);
      }
      const actualizado = await tx.comprobante.findUniqueOrThrow({
        where: { id: c.id },
        include: CON_LINEAS,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion,
        entidad: 'comprobante',
        entidadId: c.id,
        ubicacionId: c.acopio_id,
        antes: { estado: c.estado, motivo: c.motivo_rechazo, nota: c.nota_rechazo },
        despues: {
          estado: actualizado.estado,
          motivo: actualizado.motivo_rechazo,
          nota: actualizado.nota_rechazo,
        },
        destacado,
      });
      await ademas?.(tx);
      return actualizado;
    });
    return aComprobanteVista(hecho);
  }
}
