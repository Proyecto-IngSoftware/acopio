import { Inject, Injectable } from '@nestjs/common';
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import { EMISOR_LOCAL } from '../proveedor/proveedor-local';
import { PROVEEDOR_IDENTIDAD, type ProveedorIdentidad } from '../proveedor/proveedor-identidad';

export interface TokenVerificado {
  sub: string;
  emitidoEn: Date;
}

/**
 * Verifica la firma del token contra el JWKS del proveedor (RF-IDE-005). Con
 * Supabase, el JWKS remoto del proyecto, en caché. Con el adaptador local, sus
 * llaves se leen en proceso: son las mismas que publica /api/auth/.well-known/jwks.json.
 */
@Injectable()
export class VerificadorToken {
  private llaves?: Promise<JWTVerifyGetKey>;
  private readonly emisor: string;

  constructor(
    @Inject(ENTORNO) private readonly entorno: Entorno,
    @Inject(PROVEEDOR_IDENTIDAD) private readonly proveedor: ProveedorIdentidad,
  ) {
    this.emisor =
      entorno.AUTH_PROVEEDOR === 'local' ? EMISOR_LOCAL : `${entorno.SUPABASE_URL}/auth/v1`;
  }

  private obtenerLlaves(): Promise<JWTVerifyGetKey> {
    this.llaves ??=
      this.entorno.AUTH_PROVEEDOR === 'local'
        ? this.proveedor.jwks().then((jwks) => createLocalJWKSet(jwks))
        : Promise.resolve(createRemoteJWKSet(new URL(this.entorno.SUPABASE_JWKS_URL)));
    return this.llaves;
  }

  /** Devuelve null si el token no es válido por cualquier motivo. */
  async verificar(token: string): Promise<TokenVerificado | null> {
    try {
      const { payload } = await jwtVerify(token, await this.obtenerLlaves(), {
        issuer: this.emisor,
      });
      return aTokenVerificado(payload);
    } catch {
      return null;
    }
  }
}

function aTokenVerificado(payload: JWTPayload): TokenVerificado | null {
  if (!payload.sub || typeof payload.iat !== 'number') return null;
  return { sub: payload.sub, emitidoEn: new Date(payload.iat * 1000) };
}
