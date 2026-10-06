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
 * Cuenta del Donador (RF-IDE-013, C-03): se registra por la API, confirma su correo con
 * un enlace que llega por la cola, y entra con correo. Es la única cuenta que no crea
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

  /** Responde siempre lo mismo (C-09): nadie averigua qué correos tienen cuenta. */
  async registrar(datos: { correo: string; contrasena: string; nombre: string }) {
    const correo = datos.correo.trim().toLowerCase();
    const rechazo = motivoRechazo(datos.contrasena, [correo, datos.nombre]);
    if (rechazo) throw new ErrorDominio('CONTRASENA_DEBIL', rechazo, 422);

    const existente = await this.prisma.usuario.findUnique({
      where: { correo },
      select: { id: true, rol: true, nombre: true },
    });
    if (existente) {
      const pendiente =
        existente.rol === 'DONADOR' &&
        (await this.prisma.verificacionCorreo.findFirst({
          where: { usuario_id: existente.id, usado_en: null },
        }));
      await this.prisma.$transaction(async (tx) => {
        if (pendiente) {
          await this.emitirEnlace(tx, existente.id, existente.nombre, correo);
        } else {
          await this.correo.encolar(
            tx,
            correo,
            plantillas.cuentaExistente({ enlaceEntrar: `${this.entorno.APP_URL}/donador` }),
          );
        }
      });
      return;
    }

    let uid: string;
    try {
      ({ uid } = await this.proveedor.crearUsuario(correo, datos.contrasena, {
        confirmado: false,
      }));
    } catch (error) {
      // Carrera: otro registro del mismo correo ganó. Se responde igual (C-09).
      const codigo = (error as { code?: string }).code;
      if (codigo === 'P2002' || codigo === 'email_exists') return;
      throw error;
    }
    try {
      await this.crearCuenta(uid, correo, datos.nombre);
    } catch (error) {
      // Sin esto queda una credencial huérfana y el correo no se puede volver a registrar
      await this.proveedor.eliminarUsuario(uid).catch(() => undefined);
      throw error;
    }
  }

  private async crearCuenta(uid: string, correo: string, nombre: string) {
    await this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          nombre: nombre.trim(),
          correo,
          rol: 'DONADOR',
          estado: 'ACTIVO',
          supabase_uid: uid,
          tokens_validos_desde: new Date(),
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'donador.registrado',
        entidad: 'usuario',
        entidadId: usuario.id,
        despues: { correo },
      });
      await this.emitirEnlace(tx, usuario.id, usuario.nombre, correo);
    });
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

  async confirmar(token: string) {
    const fila = await this.prisma.verificacionCorreo.findUnique({
      where: { token_hash: hashToken(token) },
      include: { usuario: { select: { id: true, supabase_uid: true } } },
    });
    if (!fila || fila.usado_en || fila.vence_en < new Date() || !fila.usuario.supabase_uid) {
      throw ENLACE_INVALIDO();
    }
    await this.proveedor.confirmarCorreo(fila.usuario.supabase_uid);
    await this.prisma.$transaction(async (tx) => {
      // Un enlace confirma la cuenta: los demás pendientes del mismo usuario se cierran
      await tx.verificacionCorreo.updateMany({
        where: { usuario_id: fila.usuario_id, usado_en: null },
        data: { usado_en: new Date() },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: fila.usuario_id,
        accion: 'donador.correo_confirmado',
        entidad: 'usuario',
        entidadId: fila.usuario_id,
      });
    });
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
    if ('sinConfirmar' in sesion) {
      throw new ErrorDominio(
        'CORREO_SIN_CONFIRMAR',
        'Confirma tu correo con el enlace que te enviamos antes de entrar',
        403,
      );
    }
    return {
      accessToken: sesion.accessToken,
      expiraEn: sesion.expiraEn,
      usuario: { id: usuario.id, username: null, nombre: usuario.nombre, rol: usuario.rol },
    };
  }
}
