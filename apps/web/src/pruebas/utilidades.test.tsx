import { conEstado, responderSegun } from './utilidades';

describe('responderSegun', () => {
  it('toma la ruta al pie de la letra, salvo el comodín *', async () => {
    responderSegun({ 'GET /api/a+b/*': { ok: true } });
    expect((await fetch(new Request('http://x/api/a+b/7'))).status).toBe(200);
    expect((await fetch(new Request('http://x/api/aab/7'))).status).toBe(404);
    expect((await fetch(new Request('http://x/api/a+b/7/8'))).status).toBe(404);
  });
});

it('responderSegun responde un 204 sin cuerpo con conEstado(204, null)', async () => {
  responderSegun({ 'DELETE /api/algo/*': conEstado(204, null) });
  const r = await fetch(new Request('http://localhost/api/algo/1', { method: 'DELETE' }));
  expect(r.status).toBe(204);
  expect(await r.text()).toBe('');
});
