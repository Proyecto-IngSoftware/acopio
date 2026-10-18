import { responderSegun } from './utilidades';

describe('responderSegun', () => {
  it('toma la ruta al pie de la letra, salvo el comodín *', async () => {
    responderSegun({ 'GET /api/a+b/*': { ok: true } });
    expect((await fetch(new Request('http://x/api/a+b/7'))).status).toBe(200);
    expect((await fetch(new Request('http://x/api/aab/7'))).status).toBe(404);
    expect((await fetch(new Request('http://x/api/a+b/7/8'))).status).toBe(404);
  });
});
