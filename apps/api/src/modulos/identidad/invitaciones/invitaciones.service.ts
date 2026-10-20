import { Inject, Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { Transacciones } from '../../../comun/prisma/transacciones';
import { InvitacionDao } from '../dao/invitacion.dao';
import { UsuarioDao } from '../dao/usuario.dao';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import { BitacoraService } from '../../auditoria/bitacora.service';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';
import { motivoRechazo } from './politica-contrasena';
import { generarToken, hashToken, venceEn } from './token-invitacion';

/** Un token vencido, usado, revocado o inexistente produce el mismo mensaje (RF-IDE-003). */
const INVITACION_INVALIDA = () =>
  new ErrorDominio(
    'INVITACION_INVALIDA',
    'El enlace no es válido o ya venció. Pide uno nuevo a un administrador.',
    404,
  );

export interface InvitacionEmitida {
  token: string;
  enlace: string;
  venceEn: Date;
}

@Injectable()
export class InvitacionesService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly invitaciones: InvitacionDao,
    private readonly usuarios: UsuarioDao,
    private readonly bitacora: BitacoraService,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /**
   * Emite una invitación nueva y revoca las pendientes del mismo usuario
   * (RF-IDE-002). El token en claro solo existe en la respuesta y en el correo.
   */
  async emitir(
    tx: ClienteBd,
    datos: { usuarioId: string; creadaPor: string; restablecimiento?: { motivo: string } },
  ): Promise<InvitacionEmitida> {
    await this.revocarPendientes(tx, datos.usuarioId);
    const token = generarToken();
    const vence = venceEn();
    await this.invitaciones.crear(
      {
        usuario_id: datos.usuarioId,
        token_hash: hashToken(token),
        expira_en: vence,
        creada_por: datos.creadaPor,
        es_restablecimiento: Boolean(datos.restablecimiento),
        motivo: datos.restablecimiento?.motivo ?? null,
      },
      tx,
    );
    return { token, enlace: `${this.entorno.APP_URL}/invitacion/${token}`, venceEn: vence };
  }

  revocarPendientes(tx: ClienteBd, usuarioId: string): Promise<number> {
    return this.invitaciones.revocarPendientes(usuarioId, tx);
  }

  /** Lo que ve la persona al abrir el enlace (RF-IDE-003). Público. */
  async consultar(token: string) {
    const invitacion = await this.buscarVigente(token);
    const u = invitacion.usuario;
    return {
      username: u.username,
      nombre: u.nombre,
      rol: u.rol,
      esRestablecimiento: invitacion.es_restablecimiento,
      venceEn: invitacion.expira_en,
      asignaciones: u.asignaciones.map((a) => ({
        tipo: a.ubicacion_tipo,
        ubicacionId: a.ubicacion_id,
      })),
    };
  }

  /**
   * Canjea la invitación y define la contraseña (RF-IDE-003, RF-IDE-009).
   *
   * La invitación se reclama con un UPDATE condicionado a que siga sin usar. Si dos
   * canjes llegan a la vez, PostgreSQL bloquea la fila: el segundo espera, vuelve a
   * evaluar la condición y no encuentra nada. Solo uno crea la cuenta.
   */
  async canjear(token: string, contrasena: string): Promise<{ username: string | null }> {
    // Primero se valida la contraseña, sin consumir la invitación
    const previa = await this.buscarVigente(token);
    const rechazo = motivoRechazo(contrasena, [
      previa.usuario.username ?? '',
      ...previa.usuario.nombre.split(/\s+/),
    ]);
    if (rechazo) throw new ErrorDominio('CONTRASENA_DEBIL', rechazo, 422);

    const hash = hashToken(token);
    return this.transacciones.ejecutar(async (tx) => {
      const ahora = new Date();
      if (!(await this.invitaciones.reclamar(hash, ahora, tx))) throw INVITACION_INVALIDA();

      const invitacion = await this.invitaciones.conUsuario(hash, tx);
      const usuario = invitacion.usuario;

      if (usuario.supabase_uid) {
        // Restablecimiento: la cuenta ya existe; cambia la contraseña y caducan las
        // sesiones anteriores
        await this.proveedor.cambiarContrasena(usuario.supabase_uid, contrasena);
        await this.usuarios.marcar(usuario.id, { tokens_validos_desde: ahora }, tx);
      } else {
        const { uid } = await this.proveedor.crearUsuario(usuario.correo!, contrasena);
        await this.usuarios.marcar(
          usuario.id,
          { supabase_uid: uid, estado: 'ACTIVO', tokens_validos_desde: ahora },
          tx,
        );
      }

      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: invitacion.es_restablecimiento
          ? 'acceso.restablecimiento_canjeado'
          : 'invitacion.canjeada',
        entidad: 'usuario',
        entidadId: usuario.id,
        destacado: invitacion.es_restablecimiento,
      });
      return { username: usuario.username };
    });
  }

  private async buscarVigente(token: string) {
    const invitacion = await this.invitaciones.paraCanje(hashToken(token));
    if (
      !invitacion ||
      invitacion.usada_en ||
      invitacion.revocada_en ||
      invitacion.expira_en <= new Date() ||
      invitacion.usuario.estado === 'SUSPENDIDO'
    ) {
      throw INVITACION_INVALIDA();
    }
    return invitacion;
  }
}
