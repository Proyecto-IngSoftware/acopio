import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';

const CREDENCIALES_INVALIDAS = () => new UnauthorizedException('Usuario o contraseña incorrectos');

/**
 * Inicio de sesión con nombre de usuario (RF-IDE-004). La API resuelve el usuario a
 * su correo y se lo pasa al proveedor: el correo nunca sale hacia el navegador, y no
 * hace falta un endpoint público que lo revele.
 */
@Injectable()
export class SesionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
  ) {}

  async iniciar(username: string, contrasena: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id: true, username: true, nombre: true, rol: true, estado: true, correo: true },
    });
    // Mismo mensaje para usuario inexistente, contraseña equivocada, invitado o
    // suspendido: no se revela cuál de las cuatro fue
    if (!usuario?.correo || usuario.estado !== 'ACTIVO' || usuario.rol === 'DONADOR') {
      await this.proveedor.iniciarSesion('no-existe@acopio.local', contrasena);
      throw CREDENCIALES_INVALIDAS();
    }
    const sesion = await this.proveedor.iniciarSesion(usuario.correo, contrasena);
    if (!sesion) throw CREDENCIALES_INVALIDAS();
    return {
      accessToken: sesion.accessToken,
      expiraEn: sesion.expiraEn,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }

  /** El usuario de la sesión, con sus ubicaciones para el conmutador de contexto (RF-IDE-010). */
  async yo(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        asignaciones: { select: { ubicacion_tipo: true, ubicacion_id: true } },
      },
    });
    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      rol: usuario.rol,
      alcanceGlobal: usuario.rol === 'ADMIN',
      asignaciones: usuario.asignaciones.map((a) => ({
        tipo: a.ubicacion_tipo,
        ubicacionId: a.ubicacion_id,
      })),
    };
  }
}
