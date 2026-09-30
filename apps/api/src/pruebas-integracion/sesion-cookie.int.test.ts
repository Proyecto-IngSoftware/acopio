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

  it('/auth/salir vence la cookie', async () => {
    const r = await a.http().post('/api/auth/salir').expect(204);
    const cookie = cookies(r).join(';');
    expect(cookie).toMatch(/acopio_sesion=;/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });

  const nueva = (nombre: string) => ({
    nombre,
    tipo: 'sismo',
    inicio: '2026-09-01',
    destacadaHasta: '2099-12-31',
  });

  it('una escritura con cookie desde otro origen: 403', async () => {
    const r = await entrar();
    const res = await a
      .http()
      .post('/api/emergencias')
      .set('Cookie', cookies(r))
      .set('Origin', 'https://otro.sitio')
      .send(nueva('Desde otro sitio'))
      .expect(403);
    expect(res.body.codigo).toBe('ORIGEN_NO_PERMITIDO');
  });

  it('la misma escritura desde el origen de la web pasa', async () => {
    const r = await entrar();
    await a
      .http()
      .post('/api/emergencias')
      .set('Cookie', cookies(r))
      .set('Origin', 'http://localhost:5173')
      .send(nueva('Desde la web'))
      .expect(201);
  });

  it('con Bearer y otro origen no aplica el control: la cookie es lo que se protege', async () => {
    const r = await entrar();
    const token = /acopio_sesion=([^;]+)/.exec(cookies(r).join(';'))![1]!;
    await a
      .http()
      .post('/api/emergencias')
      .set('authorization', `Bearer ${decodeURIComponent(token)}`)
      .set('Origin', 'https://otro.sitio')
      .send(nueva('Con Bearer'))
      .expect(201);
  });
});
