import { ADMIN, crearAppPrueba, type AppPrueba } from '../../test/app-prueba';

/** ADR-0014: la sesión viaja en una cookie HttpOnly. */
describe('sesión en cookie', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  const entrar = () =>
    a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: ADMIN.username, contrasena: ADMIN.contrasena })
      .expect(200);
  const cookies = (r: { headers: Record<string, unknown> }) =>
    ([] as string[]).concat((r.headers['set-cookie'] as string[] | undefined) ?? []);

  it('devuelve la cookie HttpOnly y el cuerpo no trae el token', async () => {
    const r = await entrar();
    const cookie = cookies(r).join(';');
    expect(cookie).toMatch(/acopio_sesion=[^;]+/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/i);
    expect(r.body.accessToken).toBeUndefined();
    expect(r.body.usuario).toMatchObject({ username: ADMIN.username });
  });

  it('/auth/yo responde con solo la cookie', async () => {
    const r = await entrar();
    await a.http().get('/api/auth/yo').set('Cookie', cookies(r)).expect(200);
  });
});
