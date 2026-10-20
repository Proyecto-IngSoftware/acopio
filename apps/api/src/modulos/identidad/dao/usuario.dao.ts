import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import type { EstadoUsuario, Rol } from '../../../generado/prisma/enums';

/** Lo que muestra la consola de un usuario: datos, asignaciones e invitación pendiente. */
export const detalleUsuario = {
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

export type FilaUsuario = Prisma.UsuarioGetPayload<{ select: typeof detalleUsuario }>;

/** Consultas de `usuario` (ADR-0019). */
@Injectable()
export class UsuarioDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Nombre y correo para escribirle a alguien. */
  contacto(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: { nombre: true, correo: true },
    });
  }

  /** La cuenta que intenta iniciar sesión, por correo o por nombre de usuario. */
  paraSesion(por: { correo: string } | { username: string }) {
    return this.prisma.usuario.findUnique({
      where: por,
      select: { id: true, username: true, nombre: true, rol: true, estado: true, correo: true },
    });
  }

  /** Lo que el guard lee en cada petición, por el `sub` del token. */
  paraGuard(supabaseUid: string) {
    return this.prisma.usuario.findUnique({
      where: { supabase_uid: supabaseUid },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        estado: true,
        tokens_validos_desde: true,
      },
    });
  }

  /** El usuario de la sesión con sus ubicaciones. */
  perfil(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        asignaciones: { select: { ubicacion_tipo: true, ubicacion_id: true } },
      },
    });
  }

  /** Para el registro del Donador: si el correo ya tiene cuenta y en qué estado. */
  porCorreo(correo: string) {
    return this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, rol: true, estado: true, nombre: true },
    });
  }

  crearDonador(datos: { nombre: string; correo: string }, tx: ClienteBd) {
    return tx.usuario.create({
      data: { ...datos, rol: 'DONADOR', estado: 'INVITADO' },
    });
  }

  crear(datos: Prisma.UsuarioCreateInput, tx: ClienteBd) {
    return tx.usuario.create({ data: datos, select: detalleUsuario });
  }

  listar(where: Prisma.UsuarioWhereInput) {
    return this.prisma.usuario.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { nombre: 'asc' }],
      select: detalleUsuario,
    });
  }

  detalle(id: string, bd: ClienteBd = this.prisma) {
    return bd.usuario.findUnique({ where: { id }, select: detalleUsuario });
  }

  actualizar(id: string, datos: Prisma.UsuarioUpdateInput, tx: ClienteBd) {
    return tx.usuario.update({ where: { id }, data: datos, select: detalleUsuario });
  }

  /** Cambia columnas sin devolver el detalle (estado, credencial, vigencia de tokens). */
  marcar(
    id: string,
    datos: {
      estado?: EstadoUsuario;
      supabase_uid?: string;
      tokens_validos_desde?: Date;
      nombre?: string;
    },
    tx: ClienteBd,
  ) {
    return tx.usuario.update({ where: { id }, data: datos });
  }

  /** Bloquea la fila para que dos cambios simultáneos no se pisen, y la devuelve. */
  async bloquear(id: string, tx: ClienteBd) {
    await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${id}::uuid FOR UPDATE`;
    return tx.usuario.findUnique({ where: { id } });
  }

  /** Bloquea a los administradores activos, siempre en el mismo orden (RF-IDE-008). */
  async bloquearAdmins(tx: ClienteBd) {
    await tx.$queryRaw`
      SELECT id FROM usuario WHERE rol = 'ADMIN' AND estado = 'ACTIVO' ORDER BY id FOR UPDATE`;
  }

  contarAdminsActivos(excepto: string, tx: ClienteBd) {
    return tx.usuario.count({ where: { rol: 'ADMIN', estado: 'ACTIVO', id: { not: excepto } } });
  }

  /** Administradores activos con correo real, para avisarles. */
  adminsConCorreo(tx: ClienteBd) {
    return tx.usuario.findMany({
      where: { rol: 'ADMIN' satisfies Rol, estado: 'ACTIVO', correo_sintetico: false },
      select: { nombre: true, correo: true },
    });
  }
}
