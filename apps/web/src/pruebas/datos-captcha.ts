import { createChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';

/** Un reto de ALTCHA de verdad pero fácil, para simular GET /api/captcha/reto (ADR-0024). */
export async function retoDePrueba() {
  const reto = await createChallenge({
    algorithm: 'SHA-256',
    cost: 1,
    counter: 30,
    deriveKey,
    hmacSignatureSecret: 'llave-de-prueba-del-captcha-en-la-web',
  });
  return { reto };
}
