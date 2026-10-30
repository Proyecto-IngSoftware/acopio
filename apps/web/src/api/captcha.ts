import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/pbkdf2';
import { api, desenvolver, ErrorApi } from './cliente';

/**
 * Prueba de ALTCHA para el siguiente envío de un formulario público (ADR-0024): pide un reto a
 * la API, lo resuelve en el navegador (menos de un segundo en un computador) y la devuelve lista para el
 * encabezado X-Captcha. Cada prueba sirve una vez, así que se pide una por envío. Con el captcha
 * apagado devuelve una cadena vacía, que la API no revisa.
 */
export async function pruebaCaptcha(): Promise<string> {
  const { reto } = await desenvolver(api.GET('/api/captcha/reto'));
  if (!reto) return '';
  const challenge = reto as unknown as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  if (!solution) {
    throw new ErrorApi(
      0,
      'CAPTCHA_SIN_RESOLVER',
      'No pudimos completar la verificación. Vuelve a intentarlo.',
    );
  }
  return btoa(JSON.stringify({ challenge, solution }));
}
