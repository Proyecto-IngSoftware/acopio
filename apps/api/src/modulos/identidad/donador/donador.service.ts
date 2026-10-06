import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import { BitacoraService } from '../../auditoria/bitacora.service';
import { NotificacionService } from '../../notificaciones/notificacion.service';
import { plantillas } from '../../notificaciones/plantillas';
import { motivoRechazo } from '../invitaciones/politica-contrasena';
import { generarToken, hashToken } from '../invitaciones/token-invitacion';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';

const VIGENCIA_ENLACE_MS = 48 * 3600_000;
const CREDENCIALES_INVALIDAS = () => new UnauthorizedException('Correo o contraseña incorrectos');
const ENLACE_INVALIDO = () =>
  new ErrorDominio(
    'ENLACE_INVALIDO',
    'El enlace no es válido o ya venció. Regístrate de nuevo para recibir otro.',
    404,
  );

/**
 * Cuenta del Donador (RF-IDE-013, C-03): se registra por la API con nombre y correo, y
 * con el enlace que llega por la cola confirma el correo y elige su contraseña. Es la única cuenta que no crea
 * un administrador.
 */
@Injectable()
export class DonadorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly correo: NotificacionService,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /**
   * Responde siempre lo mismo (C-09): nadie averigua qué correos tienen cuenta. No pide
   * contraseña: la elige quien recibe el enlace, al confirmar (P-040).
   */
  async registrar(datos: { correo: string; nombre: string }) {
    const correo = datos.correo.trim().toLowerCase();
    const existente = await this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, rol: true, estado: true, nombre: true },
    });
    try {
      await this.prisma.$transaction(async (tx) => {
        if (!existente) {
          const usuario = await tx.usuario.create({
            data: { nombre: datos.nombre.trim(), correo, rol: 'DONADOR', estado: 'INVITADO' },
          });
          await this.bitacora.registrar(tx, {
            usuarioId: usuario.id,
            accion: 'donador.registrado',
            entidad: 'usuario',
            entidadId: usuario.id,
            despues: { correo },
          });
          await this.emitirEnlace(tx, usuario.id, usuario.nombre, correo);
        } else if (existente.rol === 'DONADOR' && existente.estado === 'INVITADO') {
          await this.emitirEnlace(tx, existente.id, existente.nombre, correo);
        } else {
          await this.correo.encolar(
            tx,
            correo,
            plantillas.cuentaExistente({ enlaceEntrar: `${this.entorno.APP_URL}/donador` }),
          );
        }
      });
    } catch (error) {
      // Carrera: otro registro del mismo correo ganó. Se responde igual (C-09).
      if ((error as { code?: string }).code === 'P2002') return;
      throw error;
    }
  }

  private async emitirEnlace(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    usuarioId: string,
    nombre: string,
    correo: string,
  ) {
    const token = generarToken();
    const venceEn = new Date(Date.now() + VIGENCIA_ENLACE_MS);
    await tx.verificacionCorreo.create({
      data: { usuario_id: usuarioId, token_hash: hashToken(token), vence_en: venceEn },
    });
    await this.correo.encolar(
      tx,
      correo,
      plantillas.confirmarDonador({
        nombre,
        enlace: `${this.entorno.APP_URL}/donador/confirmar/${token}`,
        venceEn,
      }),
    );
  }

  /** Datos del enlace para pintar el formulario antes de pedir la contraseña. */
  async validarEnlace(token: string) {
    const fila = await this.enlaceVigente(token);
    return { nombre: fila.usuario.nombre, correo: fila.usuario.correo! };
  }

  private async enlaceVigente(token: string) {
    const fila = await this.prisma.verificacionCorreo.findUnique({
      where: { token_hash: hashToken(token) },
      include: { usuario: { select: { id: true, nombre: true, correo: true, estado: true } } },
    });
    if (
      !fila ||
      fila.usado_en ||
      fila.vence_en < new Date() ||
      fila.usuario.estado !== 'INVITADO'
    ) {
      throw ENLACE_INVALIDO();
    }
    return fila;
  }

  /** El Donador elige su contraseña con el enlace: se crea la credencial y entra (P-040). */
  async confirmar(token: string, contrasena: string, nombre?: string) {
    const fila = await this.enlaceVigente(token);
    const correo = fila.usuario.correo!;
    const nombreFinal = nombre?.trim() || fila.usuario.nombre;
    const rechazo = motivoRechazo(contrasena, [correo, nombreFinal]);
    if (rechazo) throw new ErrorDominio('CONTRASENA_DEBIL', rechazo, 422);

    let uid: string;
    try {
      ({ uid } = await this.proveedor.crearUsuario(correo, contrasena));
    } catch (error) {
      // Carrera: otra confirmación del mismo correo ganó; aquí no hay nada que compensar
      const codigo = (error as { code?: string }).code;
      if (codigo === 'P2002' || codigo === 'email_exists') throw ENLACE_INVALIDO();
      throw error;
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        // Gana quien cierre primero el enlace; el otro falla y compensa
        const gastado = await tx.verificacionCorreo.updateMany({
          where: { id: fila.id, usado_en: null },
          data: { usado_en: new Date() },
        });
        if (gastado.count === 0) throw ENLACE_INVALIDO();
        // Un enlace confirma la cuenta: los demás pendientes del mismo usuario se cierran
        await tx.verificacionCorreo.updateMany({
          where: { usuario_id: fila.usuario_id, usado_en: null },
          data: { usado_en: new Date() },
        });
        await tx.usuario.update({
          where: { id: fila.usuario_id },
          data: {
            supabase_uid: uid,
            estado: 'ACTIVO',
            tokens_validos_desde: new Date(),
            nombre: nombreFinal,
          },
        });
        await this.bitacora.registrar(tx, {
          usuarioId: fila.usuario_id,
          accion: 'donador.confirmado',
          entidad: 'usuario',
          entidadId: fila.usuario_id,
          antes: { estado: 'INVITADO' },
          despues: { estado: 'ACTIVO' },
        });
      });
    } catch (error) {
      // Sin esto queda una credencial huérfana y el correo no se puede volver a confirmar
      await this.proveedor.eliminarUsuario(uid).catch(() => undefined);
      throw error;
    }
    return this.iniciarSesion(correo, contrasena);
  }

  async iniciarSesion(correoCrudo: string, contrasena: string) {
    const correo = correoCrudo.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, nombre: true, rol: true, estado: true },
    });
    if (!usuario || usuario.rol !== 'DONADOR' || usuario.estado !== 'ACTIVO') {
      await this.proveedor.iniciarSesion('no-existe@acopio.local', contrasena);
      throw CREDENCIALES_INVALIDAS();
    }
    const sesion = await this.proveedor.iniciarSesion(correo, contrasena);
    if (!sesion) throw CREDENCIALES_INVALIDAS();
    return {
      accessToken: sesion.accessToken,
      expiraEn: sesion.expiraEn,
      usuario: { id: usuario.id, username: null, nombre: usuario.nombre, rol: usuario.rol },
    };
  }
}
