import { Injectable } from '@nestjs/common';
import {
  abiertoAhora,
  distanciaKm,
  erroresHorario,
  type Horario,
  type Punto,
} from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Prisma } from '../../generado/prisma/client';
import type { EstadoAcopio } from '../../generado/prisma/enums';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';

export interface DatosAcopio {
  entidadId: string;
  nombre: string;
  direccion: string;
  municipio: string;
  lat: number;
  lng: number;
  telefono?: string | null;
  indicacionesAcceso?: string | null;
  horario: Horario;
  estado?: EstadoAcopio;
}

/** Lo que el Operador asignado puede cambiar de su acopio (B-03). */
export interface DatosOperacion {
  estado?: 'ACTIVO' | 'PAUSADO';
  horario?: Horario;
  indicacionesAcceso?: string | null;
  telefono?: string | null;
}

const conEntidad = { entidad: { select: { id: true, nombre: true } } } as const;
type FilaAcopio = Prisma.AcopioGetPayload<{ include: typeof conEntidad }>;
const json = (h: Horario | undefined) => h as unknown as Prisma.InputJsonValue | undefined;

/** Acopios operados (RF-RED-001 a 003). Uno con historia no se borra: se cierra. */
@Injectable()
export class AcopiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
  ) {}

  async listarPublicos(filtro: { abiertoAhora?: boolean; cerca?: Punto }, ahora = new Date()) {
    const filas = await this.prisma.acopio.findMany({
      where: { estado: { in: ['ACTIVO', 'PAUSADO'] } },
      include: conEntidad,
      orderBy: { nombre: 'asc' },
    });
    let vistas = filas.map((f) => presentarAcopio(f, ahora));
    if (filtro.abiertoAhora) vistas = vistas.filter((v) => v.abiertoAhora);
    if (filtro.cerca) {
      const desde = filtro.cerca;
      vistas = vistas
        .map((v) => ({ ...v, distanciaKm: Math.round(distanciaKm(desde, v) * 10) / 10 }))
        .sort((x, y) => x.distanciaKm - y.distanciaKm);
    }
    return vistas;
  }

  async obtenerPublico(id: string) {
    const f = await this.prisma.acopio.findUnique({ where: { id }, include: conEntidad });
    if (!f || f.estado === 'CERRADO') {
      throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe o ya cerró', 404);
    }
    return presentarAcopio(f);
  }

  async listarGestion(usuario: UsuarioAutenticado) {
    const ids = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    const filas = await this.prisma.acopio.findMany({
      where: ids === null ? {} : { id: { in: ids } },
      include: conEntidad,
      orderBy: { nombre: 'asc' },
    });
    return filas.map(presentarGestion);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosAcopio) {
    exigirHorario(datos.horario);
    return this.prisma.$transaction(async (tx) => {
      await exigirEntidad(tx, datos.entidadId);
      const f = await tx.acopio.create({
        data: {
          entidad_id: datos.entidadId,
          nombre: datos.nombre.trim(),
          direccion: datos.direccion.trim(),
          municipio: datos.municipio.trim(),
          lat: datos.lat,
          lng: datos.lng,
          telefono: datos.telefono ?? null,
          indicaciones_acceso: datos.indicacionesAcceso ?? null,
          horario: json(datos.horario)!,
          estado: datos.estado ?? 'ACTIVO',
        },
        include: conEntidad,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'acopio.creado',
        entidad: 'acopio',
        entidadId: f.id,
        ubicacionId: f.id,
        despues: presentarGestion(f),
      });
      return presentarGestion(f);
    });
  }

  async actualizar(admin: UsuarioAutenticado, id: string, cambios: Partial<DatosAcopio>) {
    if (cambios.horario) exigirHorario(cambios.horario);
    return this.prisma.$transaction(async (tx) => {
      const antes = await obtenerFila(tx, id);
      if (cambios.entidadId) await exigirEntidad(tx, cambios.entidadId);
      const despues = await tx.acopio.update({
        where: { id },
        data: {
          entidad_id: cambios.entidadId,
          nombre: cambios.nombre?.trim(),
          direccion: cambios.direccion?.trim(),
          municipio: cambios.municipio?.trim(),
          lat: cambios.lat,
          lng: cambios.lng,
          telefono: cambios.telefono,
          indicaciones_acceso: cambios.indicacionesAcceso,
          horario: json(cambios.horario),
          estado: cambios.estado,
        },
        include: conEntidad,
      });
      const cerrado = despues.estado === 'CERRADO' && antes.estado !== 'CERRADO';
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: cerrado ? 'acopio.cerrado' : 'acopio.actualizado',
        entidad: 'acopio',
        entidadId: id,
        ubicacionId: id,
        antes: presentarGestion(antes),
        despues: presentarGestion(despues),
        destacado: cerrado,
      });
      return presentarGestion(despues);
    });
  }

  async operar(usuario: UsuarioAutenticado, id: string, cambios: DatosOperacion) {
    await this.alcance.exigir(usuario, 'ACOPIO', id);
    if (cambios.horario) exigirHorario(cambios.horario);
    return this.prisma.$transaction(async (tx) => {
      const antes = await obtenerFila(tx, id);
      if (antes.estado === 'CERRADO') {
        throw new ErrorDominio(
          'ACOPIO_CERRADO',
          'El acopio está cerrado; solo el Administrador lo reabre',
          409,
        );
      }
      const despues = await tx.acopio.update({
        where: { id },
        data: {
          estado: cambios.estado,
          horario: json(cambios.horario),
          indicaciones_acceso: cambios.indicacionesAcceso,
          telefono: cambios.telefono,
        },
        include: conEntidad,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'acopio.operado',
        entidad: 'acopio',
        entidadId: id,
        ubicacionId: id,
        antes: presentarGestion(antes),
        despues: presentarGestion(despues),
      });
      return presentarGestion(despues);
    });
  }

  /** Para inventario: 404 si no existe, 409 si está cerrado. */
  async exigirAbierto(id: string, bd: ClienteBd = this.prisma): Promise<void> {
    const f = await bd.acopio.findUnique({ where: { id }, select: { estado: true } });
    if (!f) throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
    if (f.estado === 'CERRADO') {
      throw new ErrorDominio('ACOPIO_CERRADO', 'El acopio está cerrado', 409);
    }
  }
}

function exigirHorario(h: Horario) {
  const errores = erroresHorario(h);
  if (errores.length) {
    throw new ErrorDominio(
      'HORARIO_INVALIDO',
      `Revisa el horario: ${errores.join('; ')}`,
      422,
      errores.map((mensaje) => ({ campo: 'horario', mensaje })),
    );
  }
}

async function exigirEntidad(tx: Pick<PrismaService, 'entidad'>, id: string) {
  const e = await tx.entidad.findUnique({ where: { id }, select: { id: true } });
  if (!e) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
}

/**
 * Lee el acopio con la fila bloqueada hasta el fin de la transacción: un cierre que
 * llega en medio espera, y quien sigue ve el estado nuevo (revisión final, I-1).
 */
async function obtenerFila(tx: ClienteBd, id: string) {
  await tx.$queryRaw`SELECT id FROM acopio WHERE id = ${id}::uuid FOR UPDATE`;
  const f = await tx.acopio.findUnique({ where: { id }, include: conEntidad });
  if (!f) throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
  return f;
}

export function presentarAcopio(f: FilaAcopio, ahora = new Date()) {
  const horario = f.horario as unknown as Horario;
  return {
    id: f.id,
    nombre: f.nombre,
    entidad: f.entidad,
    direccion: f.direccion,
    municipio: f.municipio,
    lat: Number(f.lat),
    lng: Number(f.lng),
    telefono: f.telefono,
    indicacionesAcceso: f.indicaciones_acceso,
    horario,
    estado: f.estado,
    abiertoAhora: f.estado === 'ACTIVO' && abiertoAhora(horario, ahora),
    actualizadoEn: f.actualizado_en,
  };
}

function presentarGestion(f: FilaAcopio) {
  return { ...presentarAcopio(f), creadoEn: f.creado_en };
}
