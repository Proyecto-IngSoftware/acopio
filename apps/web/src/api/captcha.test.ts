import { createChallenge, verifySolution } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/sha';
import { responderSegun } from '../pruebas/utilidades';
import { pruebaCaptcha } from './captcha';

const LLAVE = 'llave-de-prueba-del-captcha-en-la-web';

it('resuelve el reto de la API y la prueba la puede verificar el servidor (ADR-0024)', async () => {
  const reto = await createChallenge({
    algorithm: 'SHA-256',
    cost: 1,
    counter: 30,
    deriveKey,
    hmacSignatureSecret: LLAVE,
  });
  responderSegun({ 'GET /api/captcha/reto': { reto } });

  const prueba = await pruebaCaptcha();

  const { challenge, solution } = JSON.parse(atob(prueba));
  const resultado = await verifySolution({
    challenge,
    solution,
    deriveKey,
    hmacSignatureSecret: LLAVE,
  });
  expect(resultado.verified).toBe(true);
});

it('con el captcha apagado no hay nada que resolver', async () => {
  responderSegun({ 'GET /api/captcha/reto': { reto: null } });
  await expect(pruebaCaptcha()).resolves.toBe('');
});
