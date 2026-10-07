import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Zona } from '../../generado/prisma/client';
import type { EstadoZona } from '../../generado/prisma/enums';
import { BitacoraService } from '../auditoria/bitacora.service';

export interface DatosZona {
  emergenciaId: string;
  nombre: string;
  municipio: string;
  lat: number;
  lng: number;
  poblacionEstimada: number;
  poblacionFuente: string;
  poblacionFecha: Date;
  estado?: EstadoZona;
}

/** Zonas afectadas (RF-MOT-001). Una zona de una emergencia cerrada queda en solo lectura. */
@Injectable()
export class ZonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(emergenciaId?: string) {
    const filas = await this.prisma.zona.findMany({
      where: { emergencia_id: emergenciaId },
      orderBy: { nombre: 'asc' },
    });
    return filas.map(presentarZona);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosZona) {
    return this.prisma.$transaction(async (tx) => {
      await exigirEmergenciaAbierta(tx, datos.emergenciaId);
      const z = await tx.zona.create({
        data: {
          emergencia_id: datos.emergenciaId,
          nombre: datos.nombre.trim(),
          municipio: datos.municipio.trim(),
          lat: datos.lat,
          lng: datos.lng,
          poblacion_estimada: datos.poblacionEstimada,
          poblacion_fuente: datos.poblacionFuente.trim(),
          poblacion_fecha: datos.poblacionFecha,
          estado: datos.estado ?? 'SIN_ATENDER',
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'zona.creada',
        entidad: 'zona',
        entidadId: z.id,
        ubicacionId: z.id,
        despues: presentarZona(z),
      });
      return presentarZona(z);
    });
  }

  async actualizar(
    admin: UsuarioAutenticado,
    id: string,
    cambios: Partial<Omit<DatosZona, 'emergenciaId'>>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await tx.zona.findUnique({ where: { id } });
      if (!antes) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
      await exigirEmergenciaAbierta(tx, antes.emergencia_id);
      // RF-MOT-012: un número nuevo llega con su fuente y la fecha de esa estimación
      if (
        cambios.poblacionEstimada !== undefined &&
        cambios.poblacionEstimada !== antes.poblacion_estimada &&
        (!cambios.poblacionFuente?.trim() ||
          !cambios.poblacionFecha ||
          cambios.poblacionFecha.getTime() === antes.poblacion_fecha.getTime())
      ) {
        throw new ErrorDominio(
          'POBLACION_SIN_FUENTE_NUEVA',
          'Un número nuevo de población necesita su fuente y la fecha de esa estimación',
        );
      }
      const despues = await tx.zona.update({
        where: { id },
        data: {
          nombre: cambios.nombre?.trim(),
          municipio: cambios.municipio?.trim(),
          lat: cambios.lat,
          lng: cambios.lng,
          poblacion_estimada: cambios.poblacionEstimada,
          poblacion_fuente: cambios.poblacionFuente?.trim(),
          poblacion_fecha: cambios.poblacionFecha,
          estado: cambios.estado,
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'zona.actualizada',
        entidad: 'zona',
        entidadId: id,
        ubicacionId: id,
        antes: presentarZona(antes),
        despues: presentarZona(despues),
      });
      return presentarZona(despues);
    });
  }
}

async function exigirEmergenciaAbierta(tx: Pick<PrismaService, 'emergencia'>, id: string) {
  const e = await tx.emergencia.findUnique({ where: { id }, select: { estado: true } });
  if (!e) throw new ErrorDominio('EMERGENCIA_NO_ENCONTRADA', 'La emergencia no existe', 404);
  if (e.estado === 'CERRADA') {
    throw new ErrorDominio(
      'ZONA_SOLO_LECTURA',
      'La emergencia está cerrada: sus zonas quedan en solo lectura',
      409,
    );
  }
}

export function presentarZona(z: Zona) {
  return {
    id: z.id,
    emergenciaId: z.emergencia_id,
    nombre: z.nombre,
    municipio: z.municipio,
    lat: Number(z.lat),
    lng: Number(z.lng),
    poblacionEstimada: z.poblacion_estimada,
    poblacionFuente: z.poblacion_fuente,
    poblacionFecha: z.poblacion_fecha,
    estado: z.estado,
    actualizadoEn: z.actualizado_en,
  };
}
