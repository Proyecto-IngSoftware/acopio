import { createChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';

/** Un reto de ALTCHA de verdad pero fácil, para simular GET /api/captcha/reto (ADR-0024). */
export async function retoDePrueba() {
  const reto = await createChallenge({
    algorithm: 'PBKDF2/SHA-256',
    cost: 100,
    counter: 30,
    deriveKey,
    hmacSignatureSecret: 'llave-de-prueba-del-captcha-en-la-web',
  });
  return { reto };
}
