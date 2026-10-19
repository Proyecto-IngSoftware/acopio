import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuarioDao } from '../dao/usuario.dao';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';

const CREDENCIALES_INVALIDAS = () => new UnauthorizedException('Usuario o contraseña incorrectos');

/**
 * Inicio de sesión de todas las cuentas, con correo o nombre de usuario (RF-IDE-004,
 * RF-IDE-013). La API resuelve la cuenta a su correo y se lo pasa al proveedor: el correo
 * de una cuenta del equipo nunca sale hacia el navegador.
 */
@Injectable()
export class SesionService {
  constructor(
    private readonly usuarios: UsuarioDao,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
  ) {}

  async iniciar(identificador: string, contrasena: string) {
    // Un nombre de usuario no admite «@», así que la arroba decide cómo se busca
    const usuario = await this.usuarios.paraSesion(
      identificador.includes('@')
        ? { correo: identificador.trim().toLowerCase() }
        : { username: identificador },
    );
    // Mismo mensaje para cuenta inexistente, contraseña equivocada, invitada o
    // suspendida: no se revela cuál de las cuatro fue
    if (!usuario?.correo || usuario.estado !== 'ACTIVO') {
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
    const usuario = await this.usuarios.perfil(usuarioId);
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
