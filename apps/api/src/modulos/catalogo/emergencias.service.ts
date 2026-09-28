import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { EstadoEmergencia } from '../../generado/prisma/enums';
import { BitacoraService } from '../auditoria/bitacora.service';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';

export interface DatosEmergencia {
  nombre: string;
  tipo: string;
  inicio: Date;
  horizonteDias?: number;
  destacadaHasta: Date;
}

/** Fecha de hoy en Colombia, sin hora: así se compara `destacada_hasta`. */
export function hoyEnBogota(ahora = new Date()): Date {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora);
  return new Date(`${iso}T00:00:00Z`);
}

/**
 * Emergencias (RF-CAT-005, ADR-0010). Varias pueden estar activas. Al pasar
 * `destacada_hasta` bajan solas a EN_SEGUIMIENTO; cerrarlas es manual y con motivo.
 */
@Injectable()
export class EmergenciasService {
  private readonly log = new Logger(EmergenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  /** Activas primero, de la más reciente a la más antigua; después en seguimiento. */
  async listar(estado?: EstadoEmergencia) {
    const filas = await this.prisma.emergencia.findMany({
      where: { estado },
      orderBy: [{ inicio: 'desc' }],
    });
    const orden: Record<EstadoEmergencia, number> = { ACTIVA: 0, EN_SEGUIMIENTO: 1, CERRADA: 2 };
    return filas.sort((a, b) => orden[a.estado] - orden[b.estado]).map(presentar);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosEmergencia) {
    exigirFechas(datos.inicio, datos.destacadaHasta);
    return this.prisma.$transaction(async (tx) => {
      const e = await tx.emergencia.create({
        data: {
          nombre: datos.nombre.trim(),
          tipo: datos.tipo.trim(),
          inicio: datos.inicio,
          horizonte_dias: datos.horizonteDias ?? 7,
          destacada_hasta: datos.destacadaHasta,
          estado: datos.destacadaHasta < hoyEnBogota() ? 'EN_SEGUIMIENTO' : 'ACTIVA',
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'emergencia.creada',
        entidad: 'emergencia',
        entidadId: e.id,
        despues: datos,
      });
      return presentar(e);
    });
  }

  /**
   * Edita nombre, tipo, horizonte o fecha de destaque. Extender la fecha de una
   * emergencia en seguimiento la devuelve a ACTIVA (RF-CAT-005).
   */
  async actualizar(admin: UsuarioAutenticado, id: string, cambios: Partial<DatosEmergencia>) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await this.obtenerFila(tx, id);
      if (antes.estado === 'CERRADA') {
        throw new ErrorDominio(
          'EMERGENCIA_CERRADA',
          'Una emergencia cerrada queda en solo lectura',
          409,
        );
      }
      const destacadaHasta = cambios.destacadaHasta ?? antes.destacada_hasta;
      exigirFechas(cambios.inicio ?? antes.inicio, destacadaHasta);
      const estado: EstadoEmergencia = destacadaHasta < hoyEnBogota() ? 'EN_SEGUIMIENTO' : 'ACTIVA';
      const despues = await tx.emergencia.update({
        where: { id },
        data: {
          nombre: cambios.nombre?.trim(),
          tipo: cambios.tipo?.trim(),
          inicio: cambios.inicio,
          horizonte_dias: cambios.horizonteDias,
          destacada_hasta: destacadaHasta,
          estado,
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'emergencia.actualizada',
        entidad: 'emergencia',
        entidadId: id,
        antes: presentar(antes),
        despues: presentar(despues),
      });
      return presentar(despues);
    });
  }

  /**
   * Cierre manual con motivo (RF-CAT-005). La advertencia por déficit o remisiones
   * en tránsito de sus zonas se agrega en los bloques 1 y 4, cuando existan.
   */
  async cerrar(admin: UsuarioAutenticado, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await this.obtenerFila(tx, id);
      if (antes.estado === 'CERRADA') return presentar(antes);
      const despues = await tx.emergencia.update({
        where: { id },
        data: { estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: motivo.trim() },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'emergencia.cerrada',
        entidad: 'emergencia',
        entidadId: id,
        antes: { estado: antes.estado },
        despues: { estado: 'CERRADA', motivo },
        destacado: true,
      });
      return presentar(despues);
    });
  }

  /** Cada día a las 00:05 en Colombia: las que pasaron su fecha bajan a EN_SEGUIMIENTO. */
  @Cron('5 0 * * *', { name: 'emergencias-en-seguimiento', timeZone: 'America/Bogota' })
  async pasarASeguimiento(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const vencidas = await tx.emergencia.findMany({
        where: { estado: 'ACTIVA', destacada_hasta: { lt: hoyEnBogota() } },
        select: { id: true },
      });
      for (const { id } of vencidas) {
        await tx.emergencia.update({ where: { id }, data: { estado: 'EN_SEGUIMIENTO' } });
        await this.bitacora.registrar(tx, {
          usuarioId: null,
          accion: 'emergencia.en_seguimiento',
          entidad: 'emergencia',
          entidadId: id,
          antes: { estado: 'ACTIVA' },
          despues: { estado: 'EN_SEGUIMIENTO' },
        });
      }
      if (vencidas.length) this.log.log(`${vencidas.length} emergencias pasaron a seguimiento`);
      return vencidas.length;
    });
  }

  private async obtenerFila(tx: Pick<PrismaService, 'emergencia'>, id: string) {
    const e = await tx.emergencia.findUnique({ where: { id } });
    if (!e) throw new ErrorDominio('EMERGENCIA_NO_ENCONTRADA', 'La emergencia no existe', 404);
    return e;
  }
}

function exigirFechas(inicio: Date, destacadaHasta: Date) {
  if (destacadaHasta < inicio) {
    throw new ErrorDominio(
      'FECHAS_INVALIDAS',
      'La fecha hasta la que se destaca no puede ser anterior al inicio',
    );
  }
}

function presentar(e: {
  id: string;
  nombre: string;
  tipo: string;
  inicio: Date;
  horizonte_dias: number;
  estado: EstadoEmergencia;
  destacada_hasta: Date;
  cerrada_en: Date | null;
  motivo_cierre: string | null;
}) {
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    inicio: e.inicio,
    horizonteDias: e.horizonte_dias,
    estado: e.estado,
    destacadaHasta: e.destacada_hasta,
    cerradaEn: e.cerrada_en,
    motivoCierre: e.motivo_cierre,
  };
}
