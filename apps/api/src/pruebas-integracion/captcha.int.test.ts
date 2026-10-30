import { captcha, crearAppPrueba, unico, type AppPrueba } from '../../test/app-prueba';

/** ADR-0024: el registro de Donador exige una prueba de ALTCHA válida y de un solo uso. */
describe('captcha (ADR-0024)', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  const registrar = (prueba?: string) => {
    const r = a.http().post('/api/auth/registro');
    if (prueba !== undefined) r.set('X-Captcha', prueba);
    return r.send({ correo: `${unico('captcha')}@correo.test`, nombre: 'Ana Donadora' });
  };

  it('el reto es público y viene firmado', async () => {
    const { body } = await a.http().get('/api/captcha/reto').expect(200);
    expect(body.reto.signature).toEqual(expect.any(String));
    expect(body.reto.parameters).toMatchObject({ algorithm: 'PBKDF2/SHA-256', cost: 5000 });
  });

  it('con una prueba válida el registro pasa', async () => {
    await registrar(await captcha(a)).expect(202);
  });

  it('sin prueba responde 400 CAPTCHA_INVALIDO', async () => {
    const r = await registrar().expect(400);
    expect(r.body.codigo).toBe('CAPTCHA_INVALIDO');
  });

  it('una prueba que no es de ALTCHA responde 400', async () => {
    const r = await registrar('no-es-una-prueba').expect(400);
    expect(r.body.codigo).toBe('CAPTCHA_INVALIDO');
  });

  it('una prueba con la solución alterada responde 400', async () => {
    const prueba = JSON.parse(Buffer.from(await captcha(a), 'base64').toString());
    prueba.solution.counter += 1;
    const alterada = Buffer.from(JSON.stringify(prueba)).toString('base64');
    expect((await registrar(alterada).expect(400)).body.codigo).toBe('CAPTCHA_INVALIDO');
  });

  it('una prueba sirve una sola vez', async () => {
    const prueba = await captcha(a);
    await registrar(prueba).expect(202);
    expect((await registrar(prueba).expect(400)).body.codigo).toBe('CAPTCHA_INVALIDO');
  });

  it('una prueba usada se borra cuando vence', async () => {
    await a.prisma.captchaUsado.create({
      data: { nonce: unico('vencido'), expira_en: new Date(Date.now() - 1000) },
    });
    await registrar(await captcha(a)).expect(202);
    expect(await a.prisma.captchaUsado.count({ where: { expira_en: { lt: new Date() } } })).toBe(0);
  });
});
