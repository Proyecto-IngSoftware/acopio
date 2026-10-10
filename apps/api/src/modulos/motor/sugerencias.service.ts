import { estadoZona } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { exigirCantidad } from '../inventario/cantidades';
import { candadoSaldo } from '../inventario/dao/saldo.dao';
import { RemisionesBorradorService } from './remisiones-borrador.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BLOQUEO_DESCARTE_HORAS, clavePar, emparejar, type EntradaMotor } from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { EstadoSugerencia } from '../../generado/prisma/enums';
import { bloquearMotor, leerConfiguracion } from './configuracion';
import { EstadoMotorService, type ZonaCargada } from './estado-motor.service';
import { INCLUIR_SUGERENCIA, aSugerenciaVista } from './vistas';

const HORA = 3_600_000;

/** C11 Motor de sugerencias (RF-MOT-005 a 007). */
@Injectable()
export class SugerenciasService {
  private readonly log = new Logger(SugerenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estado: EstadoMotorService,
    private readonly borradores: RemisionesBorradorService,
    private readonly bitacora: BitacoraService,
    private readonly acopios: AcopiosService,
  ) {}

  /** Todo lo que el emparejamiento necesita, leído con el cliente de quien llama. */
  async cargarEntrada(
    cliente: ClienteBd,
    ahora: Date,
  ): Promise<{ entrada: EntradaMotor; zonas: ZonaCargada[] }> {
    const zonas = await this.estado.zonas(cliente, {});
    const acopios = await this.estado.acopios(cliente, {});
    const demandas = await this.estado.demandas(cliente, ahora, zonas);
    const ofertas = await this.estado.ofertas(cliente, ahora, acopios);
    const categorias = await this.estado.categorias(
      cliente,
      demandas.map((d) => d.categoriaId),
    );
    const descartadas = await cliente.sugerencia.findMany({
      where: {
        estado: 'DESCARTADA',
        decidida_en: { gt: new Date(ahora.getTime() - BLOQUEO_DESCARTE_HORAS * HORA) },
      },
      select: { acopio_id: true, zona_id: true, categoria_id: true },
    });
    const bloqueados = new Set(
      descartadas.map((d) => clavePar(d.acopio_id, d.zona_id, d.categoria_id)),
    );
    return { entrada: { zonas, acopios, categorias, demandas, ofertas, bloqueados }, zonas };
  }

  /** Cada 15 minutos y bajo demanda: borra las PROPUESTA y guarda la ronda nueva (M-04). */
  @Cron('*/15 * * * *', { name: 'motor-recalculo', timeZone: 'America/Bogota' })
  async recalcular(ahora = new Date()): Promise<{ ronda: Date; generadas: number }> {
    const r = await this.prisma.$transaction(
      async (tx) => {
        await bloquearMotor(tx);
        const { pesos, cantidadMinima } = await leerConfiguracion(tx);
        const { entrada, zonas } = await this.cargarEntrada(tx, ahora);
        const calculadas = emparejar(entrada, pesos, cantidadMinima);
        const emergencia = new Map(zonas.map((z) => [z.id, z.emergenciaId]));
        await tx.sugerencia.deleteMany({ where: { estado: 'PROPUESTA' } });
        await tx.sugerencia.createMany({
          data: calculadas.map((s) => ({
            ronda: ahora,
            emergencia_id: emergencia.get(s.zonaId)!,
            acopio_id: s.acopioId,
            zona_id: s.zonaId,
            categoria_id: s.categoriaId,
            cantidad: s.cantidad,
            puntaje: s.puntaje,
            desglose: { ...s.desglose },
            justificacion: s.justificacion,
          })),
        });
        return { ronda: ahora, generadas: calculadas.length };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    this.log.log(`Motor: ${r.generadas} sugerencias`);
    return r;
  }

  async listar(filtro: {
    zonaId?: string;
    acopioId?: string;
    categoriaId?: string;
    estado?: EstadoSugerencia;
  }) {
    const filas = await this.prisma.sugerencia.findMany({
      where: {
        zona_id: filtro.zonaId,
        acopio_id: filtro.acopioId,
        categoria_id: filtro.categoriaId,
        estado: filtro.estado ?? 'PROPUESTA',
      },
      include: INCLUIR_SUGERENCIA,
      orderBy: [{ puntaje: 'desc' }, { cantidad: 'desc' }, { zona: { nombre: 'asc' } }],
      take: 200,
    });
    return filas.map(aSugerenciaVista);
  }

  /**
   * RF-MOT-007. Con el candado del motor y el de saldo, valida contra el cálculo del
   * momento (M-04) y agrega la línea a la remisión en borrador (M-07).
   */
  async aprobar(admin: UsuarioAutenticado, id: string, cantidadPedida?: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await bloquearMotor(tx);
        const s = await tx.sugerencia.findUnique({
          where: { id },
          include: { categoria: { select: { nombre: true, unidad_base: true } } },
        });
        if (!s) throw noEncontrada();
        if (s.estado !== 'PROPUESTA') throw decidida();
        await this.acopios.exigirAbierto(s.acopio_id);
        // Una emergencia cerrada después del recálculo deja su zona en solo lectura
        const zona = await tx.zona.findUniqueOrThrow({
          where: { id: s.zona_id },
          select: { emergencia: { select: { estado: true } } },
        });
        if (zona.emergencia.estado === 'CERRADA') {
          throw new ErrorDominio(
            'ZONA_SOLO_LECTURA',
            'La emergencia está cerrada: sus zonas quedan en solo lectura',
            409,
          );
        }
        const cantidad = cantidadPedida ?? Number(s.cantidad);
        exigirCantidad(cantidad, s.categoria.unidad_base);
        await candadoSaldo(tx, s.acopio_id, s.categoria_id);

        const ahora = new Date();
        const zonas = await this.estado.zonas(tx, { zonaIds: [s.zona_id] });
        const [demanda] = await this.estado.demandas(tx, ahora, zonas, [s.categoria_id]);
        const acopios = await this.estado.acopios(tx, { acopioIds: [s.acopio_id] });
        const [oferta] = await this.estado.ofertas(tx, ahora, acopios, [s.categoria_id]);
        const deficit = demanda
          ? (estadoZona(demanda.necesidad, demanda.recibido, demanda.enCamino)?.deficit ?? 0)
          : 0;
        const maximo = Math.min(oferta?.movible ?? 0, deficit);
        if (cantidad > maximo + 1e-9) {
          throw new ErrorDominio(
            'SUGERENCIA_DESACTUALIZADA',
            `La situación cambió: hoy se pueden mandar hasta ${maximo}. Recalcula el motor`,
            409,
            { maximo },
          );
        }

        const remision = await this.borradores.agregarLinea(tx, admin, {
          acopioId: s.acopio_id,
          zonaId: s.zona_id,
          categoriaId: s.categoria_id,
          cantidad,
        });
        const { count } = await tx.sugerencia.updateMany({
          where: { id, estado: 'PROPUESTA' },
          data: {
            estado: 'APROBADA',
            cantidad_aprobada: cantidad,
            remision_id: remision.id,
            decidida_por: admin.id,
            decidida_en: ahora,
          },
        });
        // Si otra decisión llegó primero, la transacción se revierte con la remisión incluida
        if (count === 0) throw decidida();
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'sugerencia.aprobada',
          entidad: 'sugerencia',
          entidadId: id,
          ubicacionId: s.acopio_id,
          antes: { estado: 'PROPUESTA', cantidad: Number(s.cantidad) },
          despues: {
            estado: 'APROBADA',
            categoria: s.categoria.nombre,
            cantidad,
            zonaId: s.zona_id,
            remision: remision.codigo,
          },
        });
        return { sugerenciaId: id, cantidad, remision };
      },
      { timeout: 15_000, maxWait: 10_000 },
    );
  }

  async descartar(admin: UsuarioAutenticado, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      // Mismo candado que aprobar y recalcular: un descarte no se cruza con ninguno de los dos
      await bloquearMotor(tx);
      const texto = motivo.trim();
      // Condicionado al estado: un recálculo o una aprobación a la vez no lo pisan
      const { count } = await tx.sugerencia.updateMany({
        where: { id, estado: 'PROPUESTA' },
        data: {
          estado: 'DESCARTADA',
          motivo_descarte: texto,
          decidida_por: admin.id,
          decidida_en: new Date(),
        },
      });
      if (count === 0) {
        const existe = await tx.sugerencia.findUnique({ where: { id }, select: { id: true } });
        throw existe ? decidida() : noEncontrada();
      }
      const s = await tx.sugerencia.findUniqueOrThrow({
        where: { id },
        include: { categoria: { select: { nombre: true } } },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'sugerencia.descartada',
        entidad: 'sugerencia',
        entidadId: id,
        ubicacionId: s.acopio_id,
        antes: { estado: 'PROPUESTA' },
        despues: {
          estado: 'DESCARTADA',
          categoria: s.categoria.nombre,
          cantidad: Number(s.cantidad),
          zonaId: s.zona_id,
          motivo: texto,
        },
      });
      return { id, estado: 'DESCARTADA' as const };
    });
  }

  /** RF-MOT-007: los motivos de descarte agregados, para afinar los pesos. */
  async descartes(desde?: Date, hasta?: Date) {
    const filas = await this.prisma.sugerencia.findMany({
      where: { estado: 'DESCARTADA', decidida_en: { gte: desde, lte: hasta } },
      include: INCLUIR_SUGERENCIA,
      orderBy: { decidida_en: 'desc' },
    });
    const contar = (claves: string[]) =>
      [...claves.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>())]
        .map(([nombre, veces]) => ({ nombre, veces }))
        .sort((x, y) => y.veces - x.veces || x.nombre.localeCompare(y.nombre, 'es'));
    return {
      total: filas.length,
      porMotivo: contar(filas.map((f) => (f.motivo_descarte ?? '').trim().toLowerCase())),
      porCategoria: contar(filas.map((f) => f.categoria.nombre)),
      porAcopio: contar(filas.map((f) => f.acopio.nombre)),
      recientes: filas.slice(0, 50).map(aSugerenciaVista),
    };
  }
}

const noEncontrada = () =>
  new ErrorDominio(
    'SUGERENCIA_NO_ENCONTRADA',
    'La sugerencia ya no existe: el motor recalculó. Revisa la lista nueva',
    404,
  );
const decidida = () =>
  new ErrorDominio('SUGERENCIA_DECIDIDA', 'Esta sugerencia ya se decidió', 409);
