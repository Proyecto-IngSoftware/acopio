import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { SignJWT, type JSONWebKeySet } from 'jose';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import { ENTORNO, type Entorno } from '../../../config/entorno';
import { ALGORITMO, cargarOCrearLlaves, type LlavesLocales } from './llaves-locales';
import type { ProveedorIdentidad, SesionEmitida } from './proveedor-identidad';

/** Vigencia del token local. Sin renovación: la trae Supabase (RTA-03). */
const VIGENCIA_HORAS = 8;
/** Mismo costo que usa Supabase, para que los hash se importen tal cual. */
const COSTO_BCRYPT = 10;
export const EMISOR_LOCAL = 'acopio-local';

/**
 * Hace, mientras el desarrollo es local, lo que después hará Supabase Auth
 * (P-025): guarda la credencial con bcrypt y firma el token con RS256.
 */
@Injectable()
export class ProveedorLocal implements ProveedorIdentidad {
  private llaves?: Promise<LlavesLocales>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  private obtenerLlaves(): Promise<LlavesLocales> {
    this.llaves ??= cargarOCrearLlaves(this.entorno.AUTH_LLAVES_DIR);
    return this.llaves;
  }

  async crearUsuario(correo: string, contrasena: string): Promise<{ uid: string }> {
    const identidad = await this.prisma.identidadLocal.create({
      data: {
        correo,
        password_hash: await bcrypt.hash(contrasena, COSTO_BCRYPT),
        // Nace confirmada: la invitación o el enlace del Donador ya probaron el correo
        correo_confirmado_en: new Date(),
      },
    });
    return { uid: identidad.id };
  }

  async cambiarContrasena(uid: string, contrasena: string): Promise<void> {
    await this.prisma.identidadLocal.update({
      where: { id: uid },
      data: { password_hash: await bcrypt.hash(contrasena, COSTO_BCRYPT) },
    });
  }

  async eliminarUsuario(uid: string): Promise<void> {
    await this.prisma.identidadLocal.deleteMany({ where: { id: uid } });
  }

  async iniciarSesion(correo: string, contrasena: string): Promise<SesionEmitida | null> {
    const identidad = await this.prisma.identidadLocal.findUnique({ where: { correo } });
    // Se compara igual aunque no exista, para no revelar por tiempo si el correo existe
    const hash = identidad?.password_hash ?? HASH_SENUELO;
    const coincide = await bcrypt.compare(contrasena, hash);
    if (!identidad || !coincide) return null;

    const { privada, publica } = await this.obtenerLlaves();
    const expiraEn = new Date(Date.now() + VIGENCIA_HORAS * 3600 * 1000);
    const accessToken = await new SignJWT({ email: identidad.correo })
      .setProtectedHeader({ alg: ALGORITMO, kid: publica.kid! })
      .setSubject(identidad.id)
      .setIssuer(EMISOR_LOCAL)
      .setIssuedAt()
      .setExpirationTime(expiraEn)
      .sign(privada);
    return { accessToken, expiraEn };
  }

  async jwks(): Promise<JSONWebKeySet> {
    const { publica } = await this.obtenerLlaves();
    return { keys: [publica] };
  }
}

const HASH_SENUELO = bcrypt.hashSync('señuelo-para-igualar-tiempos', COSTO_BCRYPT);
