import { Inject, Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { restriccionUnicaViolada } from '../../../comun/prisma/errores-prisma';
import type { Prisma } from '../../../generado/prisma/client';
import type { EstadoUsuario, Rol, TipoUbicacion } from '../../../generado/prisma/enums';
import { BitacoraService } from '../../auditoria/bitacora.service';
import { NotificacionService } from '../../notificaciones/notificacion.service';
import { plantillas } from '../../notificaciones/plantillas';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import {
  VERIFICADOR_UBICACIONES,
  type VerificadorUbicaciones,
} from '../../../comun/ubicaciones/verificador-ubicaciones';
import { InvitacionesService, type InvitacionEmitida } from '../invitaciones/invitaciones.service';

/** Dominio de los correos que se generan para quien no tiene uno (RF-IDE-001). */
export const DOMINIO_SINTETICO = 'usuarios.acopio.local';

/** Roles que solo actúan donde tienen una asignación. El Administrador es global. */
const ROLES_CON_ALCANCE: Rol[] = ['OPERADOR', 'RECEPTOR', 'AUDITOR'];

export interface Asignacion {
  tipo: TipoUbicacion;
  ubicacionId: string;
}

export interface DatosNuevoUsuario {
  username: string;
  nombre: string;
  rol: Exclude<Rol, 'DONADOR'>;
  correo?: string | null;
  asignaciones: Asignacion[];
}

const detalleUsuario = {
  id: true,
  username: true,
  nombre: true,
  correo: true,
  correo_sintetico: true,
  rol: true,
  estado: true,
  creado_en: true,
  asignaciones: {
    select: { ubicacion_tipo: true, ubicacion_id: true, asignado_por: true, asignado_en: true },
  },
  invitaciones: {
    where: { usada_en: null, revocada_en: null },
    select: { es_restablecimiento: true, expira_en: true, creada_en: true },
    orderBy: { creada_en: 'desc' },
    take: 1,
  },
} satisfies Prisma.UsuarioSelect;

type FilaUsuario = Prisma.UsuarioGetPayload<{ select: typeof detalleUsuario }>;

/** Forma pública de un usuario en la API. */
export function presentarUsuario(u: FilaUsuario) {
  const pendiente = u.invitaciones[0];
  const vigente = pendiente && pendiente.expira_en > new Date() ? pendiente : undefined;
  return {
    id: u.id,
    username: u.username,
    nombre: u.nombre,
    correo: u.correo_sintetico ? null : u.correo,
    sinCorreoReal: u.correo_sintetico,
    rol: u.rol,
    estado: u.estado,
    creadoEn: u.creado_en,
    asignaciones: u.asignaciones.map((a) => ({
      tipo: a.ubicacion_tipo,
      ubicacionId: a.ubicacion_id,
      asignadoPor: a.asignado_por,
      asignadoEn: a.asignado_en,
    })),
    invitacionPendiente:
      vigente && !vigente.es_restablecimiento ? { venceEn: vigente.expira_en } : null,
    // Se marca en la matriz de acceso mientras está pendiente (RF-IDE-009)
    restablecimientoPendiente: vigente?.es_restablecimiento ? { venceEn: vigente.expira_en } : null,
  };
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly notificaciones: NotificacionService,
    private readonly invitaciones: InvitacionesService,
    @Inject(VERIFICADOR_UBICACIONES) private readonly ubicaciones: VerificadorUbicaciones,
  ) {}

  /** 422 si alguna ubicación no existe (B-05). Devuelve los nombres para los correos. */
  private async exigirUbicaciones(asignaciones: Asignacion[]): Promise<string[]> {
    const nombres = await this.ubicaciones.nombres(asignaciones);
    const faltan = asignaciones.filter((_, i) => nombres[i] === null);
    if (faltan.length) {
      throw new ErrorDominio(
        'UBICACION_INEXISTENTE',
        'Alguna de las ubicaciones asignadas no existe',
        422,
        faltan.map((f) => ({ campo: 'asignaciones', mensaje: `${f.tipo} ${f.ubicacionId}` })),
      );
    }
    return nombres as string[];
  }

  /** RF-IDE-001 y RF-IDE-002: crea el usuario INVITADO y su invitación. */
  async crear(admin: UsuarioAutenticado, datos: DatosNuevoUsuario) {
    if (ROLES_CON_ALCANCE.includes(datos.rol) && datos.asignaciones.length === 0) {
      throw new ErrorDominio(
        'ASIGNACION_REQUERIDA',
        'Un operador, receptor o auditor necesita al menos una ubicación asignada',
      );
    }
    await this.exigirUbicaciones(datos.asignaciones);
    const correoReal = datos.correo?.trim() || null;
    const correo = correoReal ?? `${datos.username.toLowerCase()}@${DOMINIO_SINTETICO}`;

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario
        .create({
          data: {
            username: datos.username,
            nombre: datos.nombre,
            correo,
            correo_sintetico: !correoReal,
            rol: datos.rol,
            asignaciones: {
              create: datos.asignaciones.map((a) => ({
                ubicacion_tipo: a.tipo,
                ubicacion_id: a.ubicacionId,
                asignado_por: admin.id,
              })),
            },
          },
          select: detalleUsuario,
        })
        .catch(traducirDuplicado);

      const invitacion = await this.invitaciones.emitir(tx, {
        usuarioId: usuario.id,
        creadaPor: admin.id,
      });
      if (correoReal) {
        await this.notificaciones.encolar(
          tx,
          correoReal,
          plantillas.invitacion({ nombre: datos.nombre, username: datos.username, ...invitacion }),
        );
      }
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'usuario.creado',
        entidad: 'usuario',
        entidadId: usuario.id,
        despues: { username: datos.username, rol: datos.rol, asignaciones: datos.asignaciones },
      });
      return {
        usuario: await this.obtenerCon(tx, usuario.id),
        invitacion: presentarInvitacion(invitacion),
      };
    });
  }

  async listar(filtro: { rol?: Rol; estado?: EstadoUsuario; q?: string }) {
    const filas = await this.prisma.usuario.findMany({
      where: {
        rol: filtro.rol,
        estado: filtro.estado,
        ...(filtro.q
          ? {
              OR: [
                { username: { contains: filtro.q, mode: 'insensitive' } },
                { nombre: { contains: filtro.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      select: detalleUsuario,
    });
    return filas.map(presentarUsuario);
  }

  async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: detalleUsuario });
    if (!usuario) throw new ErrorDominio('USUARIO_NO_ENCONTRADO', 'El usuario no existe', 404);
    return presentarUsuario(usuario);
  }

  /** Cambia nombre, correo o rol. El rol se protege con RF-IDE-008. */
  async actualizar(
    admin: UsuarioAutenticado,
    id: string,
    cambios: { nombre?: string; rol?: Exclude<Rol, 'DONADOR'>; correo?: string | null },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearAdmins(tx);
      const antes = await this.bloquearUsuario(tx, id);
      if (antes.rol === 'DONADOR') {
        throw new ErrorDominio('ES_DONADOR', 'Un Donador no se edita desde la consola');
      }
      const cambiaRol = cambios.rol !== undefined && cambios.rol !== antes.rol;
      if (cambiaRol) {
        if (id === admin.id) {
          throw new ErrorDominio('PROPIO_ROL', 'No puedes cambiar tu propio rol', 403);
        }
        if (antes.rol === 'ADMIN' && antes.estado === 'ACTIVO') {
          await this.exigirOtroAdmin(tx, id, 'degradar');
        }
      }
      const correoReal = cambios.correo === undefined ? undefined : cambios.correo?.trim() || null;
      const despues = await tx.usuario
        .update({
          where: { id },
          data: {
            nombre: cambios.nombre,
            rol: cambios.rol,
            ...(correoReal === undefined
              ? {}
              : correoReal
                ? { correo: correoReal, correo_sintetico: false }
                : { correo: `${antes.username}@${DOMINIO_SINTETICO}`, correo_sintetico: true }),
          },
          select: detalleUsuario,
        })
        .catch(traducirDuplicado);

      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: cambiaRol ? 'usuario.rol_cambiado' : 'usuario.actualizado',
        entidad: 'usuario',
        entidadId: id,
        antes: { nombre: antes.nombre, rol: antes.rol, correo: antes.correo },
        despues: { nombre: despues.nombre, rol: despues.rol, correo: despues.correo },
        destacado: cambiaRol,
      });
      return presentarUsuario(despues);
    });
  }

  /** RF-IDE-007 y RF-IDE-008. Nunca se elimina un usuario: se suspende. */
  async suspender(admin: UsuarioAutenticado, id: string) {
    if (id === admin.id) {
      throw new ErrorDominio('PROPIA_SUSPENSION', 'No puedes suspender tu propia cuenta', 403);
    }
    return this.prisma.$transaction(async (tx) => {
      await this.bloquearAdmins(tx);
      const antes = await this.bloquearUsuario(tx, id);
      if (antes.estado === 'SUSPENDIDO') return this.obtenerCon(tx, id);
      if (antes.rol === 'ADMIN' && antes.estado === 'ACTIVO') {
        await this.exigirOtroAdmin(tx, id, 'suspender');
      }
      await tx.usuario.update({ where: { id }, data: { estado: 'SUSPENDIDO' } });
      await this.invitaciones.revocarPendientes(tx, id);
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'usuario.suspendido',
        entidad: 'usuario',
        entidadId: id,
        antes: { estado: antes.estado },
        despues: { estado: 'SUSPENDIDO' },
      });
      return this.obtenerCon(tx, id);
    });
  }

  /** Reactiva sin repetir la invitación si ya tenía cuenta (RF-IDE-007). */
  async reactivar(admin: UsuarioAutenticado, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await this.bloquearUsuario(tx, id);
      if (antes.estado !== 'SUSPENDIDO') return this.obtenerCon(tx, id);
      const estado: EstadoUsuario = antes.supabase_uid ? 'ACTIVO' : 'INVITADO';
      await tx.usuario.update({ where: { id }, data: { estado } });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'usuario.reactivado',
        entidad: 'usuario',
        entidadId: id,
        antes: { estado: 'SUSPENDIDO' },
        despues: { estado },
      });
      return this.obtenerCon(tx, id);
    });
  }

  /** Vuelve a invitar a quien todavía no canjeó su invitación (RF-IDE-002). */
  async reinvitar(admin: UsuarioAutenticado, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.bloquearUsuario(tx, id);
      if (usuario.estado !== 'INVITADO') {
        throw new ErrorDominio(
          'NO_ES_INVITADO',
          'Solo se reinvita a quien no ha canjeado su invitación. Para un usuario activo, usa «restablecer acceso»',
          409,
        );
      }
      const invitacion = await this.invitaciones.emitir(tx, { usuarioId: id, creadaPor: admin.id });
      if (!usuario.correo_sintetico && usuario.correo) {
        await this.notificaciones.encolar(
          tx,
          usuario.correo,
          plantillas.invitacion({
            nombre: usuario.nombre,
            username: usuario.username ?? '',
            ...invitacion,
          }),
        );
      }
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'invitacion.regenerada',
        entidad: 'usuario',
        entidadId: id,
      });
      return presentarInvitacion(invitacion);
    });
  }

  async revocarInvitacion(admin: UsuarioAutenticado, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const revocadas = await this.invitaciones.revocarPendientes(tx, id);
      if (revocadas > 0) {
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'invitacion.revocada',
          entidad: 'usuario',
          entidadId: id,
        });
      }
      return { revocadas };
    });
  }

  /**
   * Restablecer acceso (RF-IDE-009): acción distinta de invitar, con motivo, aviso a
   * la persona y a todos los administradores, y evento destacado en la bitácora.
   */
  async restablecer(admin: UsuarioAutenticado, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.bloquearUsuario(tx, id);
      if (usuario.estado !== 'ACTIVO') {
        throw new ErrorDominio(
          'NO_ACTIVO',
          'Solo se restablece el acceso de un usuario activo. A un invitado se le reinvita',
          409,
        );
      }
      const invitacion = await this.invitaciones.emitir(tx, {
        usuarioId: id,
        creadaPor: admin.id,
        restablecimiento: { motivo },
      });
      if (!usuario.correo_sintetico && usuario.correo) {
        await this.notificaciones.encolar(
          tx,
          usuario.correo,
          plantillas.restablecimiento({
            nombre: usuario.nombre,
            username: usuario.username ?? '',
            ...invitacion,
          }),
        );
      }
      const admins = await tx.usuario.findMany({
        where: { rol: 'ADMIN', estado: 'ACTIVO', correo_sintetico: false },
        select: { nombre: true, correo: true },
      });
      for (const a of admins) {
        await this.notificaciones.encolar(
          tx,
          a.correo!,
          plantillas.avisoRestablecimientoAdmin({
            admin: a.nombre,
            afectado: usuario.username ?? usuario.nombre,
            autor: admin.nombre,
            motivo,
          }),
        );
      }
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'acceso.restablecido',
        entidad: 'usuario',
        entidadId: id,
        despues: { motivo },
        destacado: true,
      });
      return presentarInvitacion(invitacion);
    });
  }

  /** RF-IDE-006: agregar una ubicación. */
  async asignar(admin: UsuarioAutenticado, id: string, asignacion: Asignacion) {
    const [nombre] = await this.exigirUbicaciones([asignacion]);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.bloquearUsuario(tx, id);
      if (usuario.rol === 'DONADOR') {
        throw new ErrorDominio('ES_DONADOR', 'Un Donador no tiene ubicaciones asignadas');
      }
      await tx.usuarioAsignacion
        .create({
          data: {
            usuario_id: id,
            ubicacion_tipo: asignacion.tipo,
            ubicacion_id: asignacion.ubicacionId,
            asignado_por: admin.id,
          },
        })
        .catch(traducirDuplicado);
      if (!usuario.correo_sintetico && usuario.correo) {
        await this.notificaciones.encolar(
          tx,
          usuario.correo,
          plantillas.asignacion({
            nombre: usuario.nombre,
            ubicacion: describir(asignacion, nombre),
          }),
        );
      }
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'asignacion.creada',
        entidad: 'usuario',
        entidadId: id,
        ubicacionId: asignacion.ubicacionId,
        despues: asignacion,
      });
      return this.obtenerCon(tx, id);
    });
  }

  /**
   * RF-IDE-006: quitar una ubicación. Si la deja sin ningún responsable activo, se
   * advierte primero (409 UBICACION_SIN_RESPONSABLE) y se confirma con `confirmar`.
   */
  async desasignar(
    admin: UsuarioAutenticado,
    id: string,
    asignacion: Asignacion,
    confirmar: boolean,
  ) {
    const [nombre] = await this.ubicaciones.nombres([asignacion]);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await this.bloquearUsuario(tx, id);
      const donde = {
        ubicacion_tipo: asignacion.tipo,
        ubicacion_id: asignacion.ubicacionId,
      };
      const existe = await tx.usuarioAsignacion.findUnique({
        where: { usuario_id_ubicacion_tipo_ubicacion_id: { usuario_id: id, ...donde } },
      });
      if (!existe)
        throw new ErrorDominio('SIN_ASIGNACION', 'El usuario no tiene esa ubicación', 404);

      const otrosResponsables = await tx.usuarioAsignacion.count({
        where: { ...donde, usuario_id: { not: id }, usuario: { estado: 'ACTIVO' } },
      });
      if (otrosResponsables === 0 && !confirmar) {
        throw new ErrorDominio(
          'UBICACION_SIN_RESPONSABLE',
          'La ubicación quedará sin ningún responsable activo. Confirma para continuar',
          409,
        );
      }
      await tx.usuarioAsignacion.delete({
        where: { usuario_id_ubicacion_tipo_ubicacion_id: { usuario_id: id, ...donde } },
      });
      if (!usuario.correo_sintetico && usuario.correo) {
        await this.notificaciones.encolar(
          tx,
          usuario.correo,
          plantillas.revocacion({
            nombre: usuario.nombre,
            ubicacion: describir(asignacion, nombre ?? undefined),
          }),
        );
      }
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'asignacion.eliminada',
        entidad: 'usuario',
        entidadId: id,
        ubicacionId: asignacion.ubicacionId,
        antes: asignacion,
      });
      return this.obtenerCon(tx, id);
    });
  }

  /** Bloquea la fila del usuario para que dos cambios simultáneos no se pisen. */
  private async bloquearUsuario(tx: ClienteBd, id: string) {
    await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${id}::uuid FOR UPDATE`;
    const usuario = await tx.usuario.findUnique({ where: { id } });
    if (!usuario) throw new ErrorDominio('USUARIO_NO_ENCONTRADO', 'El usuario no existe', 404);
    return usuario;
  }

  /**
   * RF-IDE-008. Antes de suspender o cambiar un rol se bloquean los administradores
   * activos, siempre en el mismo orden: dos administradores que se suspenden el uno
   * al otro a la vez se atienden en fila, sin interbloqueo, y el segundo ya ve que
   * sería el último.
   */
  private async bloquearAdmins(tx: ClienteBd) {
    await tx.$queryRaw`
      SELECT id FROM usuario WHERE rol = 'ADMIN' AND estado = 'ACTIVO' ORDER BY id FOR UPDATE`;
  }

  /** Con los administradores ya bloqueados por bloquearAdmins. */
  private async exigirOtroAdmin(tx: ClienteBd, excepto: string, accion: string) {
    const otros = await tx.usuario.count({
      where: { rol: 'ADMIN', estado: 'ACTIVO', id: { not: excepto } },
    });
    if (otros === 0) {
      throw new ErrorDominio(
        'ULTIMO_ADMIN',
        `No se puede ${accion} al último administrador activo: el sistema quedaría sin quién lo gobierne`,
        409,
      );
    }
  }

  private async obtenerCon(tx: ClienteBd, id: string) {
    const usuario = await tx.usuario.findUniqueOrThrow({ where: { id }, select: detalleUsuario });
    return presentarUsuario(usuario);
  }
}

function presentarInvitacion(i: InvitacionEmitida) {
  return { enlace: i.enlace, venceEn: i.venceEn };
}

function describir(a: Asignacion, nombre?: string): string {
  if (nombre) return `${a.tipo === 'ACOPIO' ? 'el acopio' : 'la zona'} ${nombre}`;
  return a.tipo === 'ACOPIO' ? 'un acopio' : 'una zona';
}

function traducirDuplicado(error: unknown): never {
  const restriccion = restriccionUnicaViolada(error);
  if (restriccion === null) throw error;
  const mensaje = restriccion.includes('username')
    ? 'Ese nombre de usuario ya existe'
    : restriccion.includes('correo')
      ? 'Ese correo ya está registrado'
      : restriccion.startsWith('usuario_asignacion')
        ? 'El usuario ya tiene esa ubicación asignada'
        : 'El registro ya existe';
  throw new ErrorDominio('DUPLICADO', mensaje, 409);
}
