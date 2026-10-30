import { Inject, Injectable } from '@nestjs/common';
import { createChallenge, randomInt, verifySolution, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { CaptchaUsadoDao } from './dao/captcha-usado.dao';

/** Cuánto tiempo sirve un reto: alcanza para llenar el formulario con calma. */
const VIGENCIA_MS = 10 * 60_000;

const invalido = () =>
  new ErrorDominio(
    'CAPTCHA_INVALIDO',
    'No pudimos comprobar que eres una persona. Vuelve a intentarlo.',
    400,
  );

/**
 * ALTCHA (ADR-0024): la API firma un reto de prueba de trabajo, el navegador lo resuelve y
 * la API verifica la solución sin consultar a nadie. Cada reto sirve una sola vez.
 */
@Injectable()
export class CaptchaService {
  constructor(
    private readonly usados: CaptchaUsadoDao,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  get activo(): boolean {
    return this.entorno.CAPTCHA_ACTIVO;
  }

  /** Un reto nuevo, o null con el captcha apagado. */
  async crearReto(): Promise<Challenge | null> {
    if (!this.activo) return null;
    const maximo = this.entorno.CAPTCHA_DIFICULTAD;
    return createChallenge({
      algorithm: 'SHA-256',
      cost: 1,
      counter: randomInt(Math.ceil(maximo / 4), maximo),
      deriveKey,
      expiresAt: new Date(Date.now() + VIGENCIA_MS),
      hmacSignatureSecret: this.entorno.CAPTCHA_LLAVE!,
    });
  }

  /** Verifica la prueba del encabezado X-Captcha y la gasta; si no sirve, lanza CAPTCHA_INVALIDO. */
  async verificar(prueba: string | undefined): Promise<void> {
    if (!this.activo) return;
    const leida = leer(prueba);
    if (!leida) throw invalido();
    const resultado = await verifySolution({
      challenge: leida.challenge,
      solution: leida.solution,
      deriveKey,
      hmacSignatureSecret: this.entorno.CAPTCHA_LLAVE!,
    }).catch(() => null);
    if (!resultado?.verified) throw invalido();

    await this.usados.borrarVencidas();
    const vence = leida.challenge.parameters.expiresAt;
    const expiraEn = new Date(vence ? vence * 1000 : Date.now() + VIGENCIA_MS);
    if (!(await this.usados.marcar(leida.challenge.parameters.nonce, expiraEn))) throw invalido();
  }
}

/** El widget y la web mandan `base64(JSON({ challenge, solution }))`. */
function leer(prueba: string | undefined) {
  if (!prueba) return null;
  try {
    const datos = JSON.parse(Buffer.from(prueba, 'base64').toString('utf8'));
    if (typeof datos?.challenge?.parameters?.nonce !== 'string' || !datos.solution) return null;
    return datos as {
      challenge: Challenge;
      solution: Parameters<typeof verifySolution>[0]['solution'];
    };
  } catch {
    return null;
  }
}
