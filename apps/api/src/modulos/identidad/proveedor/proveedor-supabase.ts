import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { JSONWebKeySet } from 'jose';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import type { ProveedorIdentidad, SesionEmitida } from './proveedor-identidad';

/**
 * Supabase Auth en la nube (ADR-0001). Escrito en el Bloque 0 y probado contra un
 * proyecto real cuando exista. La `service_role` vive solo aquí, en el servidor.
 */
@Injectable()
export class ProveedorSupabase implements ProveedorIdentidad {
  private clienteAdmin?: SupabaseClient;

  constructor(@Inject(ENTORNO) private readonly entorno: Entorno) {}

  /** Se crea al primer uso: con AUTH_PROVEEDOR=local no hay llaves de Supabase. */
  private get admin(): SupabaseClient {
    this.clienteAdmin ??= createClient(
      this.entorno.SUPABASE_URL!,
      this.entorno.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    return this.clienteAdmin;
  }

  async crearUsuario(
    correo: string,
    contrasena: string,
    opciones?: { confirmado?: boolean },
  ): Promise<{ uid: string }> {
    const { data, error } = await this.admin.auth.admin.createUser({
      email: correo,
      password: contrasena,
      email_confirm: opciones?.confirmado !== false,
    });
    if (error || !data.user) throw error ?? new Error('Supabase no devolvió el usuario');
    return { uid: data.user.id };
  }

  async confirmarCorreo(uid: string): Promise<void> {
    const { error } = await this.admin.auth.admin.updateUserById(uid, { email_confirm: true });
    if (error) throw error;
  }

  async cambiarContrasena(uid: string, contrasena: string): Promise<void> {
    const { error } = await this.admin.auth.admin.updateUserById(uid, { password: contrasena });
    if (error) throw error;
  }

  async eliminarUsuario(uid: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(uid);
    if (error) throw error;
  }

  async iniciarSesion(
    correo: string,
    contrasena: string,
  ): Promise<SesionEmitida | { sinConfirmar: true } | null> {
    // Con la llave pública, como lo haría el navegador; la sesión la guarda el cliente
    const cliente = createClient(this.entorno.SUPABASE_URL!, this.entorno.SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    // Supabase verifica la contraseña antes de avisar que falta confirmar el correo
    if (error?.code === 'email_not_confirmed') return { sinConfirmar: true };
    if (error || !data.session) return null;
    return {
      accessToken: data.session.access_token,
      expiraEn: new Date((data.session.expires_at ?? 0) * 1000),
    };
  }

  async jwks(): Promise<JSONWebKeySet> {
    const respuesta = await fetch(this.entorno.SUPABASE_JWKS_URL);
    return (await respuesta.json()) as JSONWebKeySet;
  }
}
