import { ADMIN, crearAppPrueba, unico, type AppPrueba } from '../../test/app-prueba';

describe('registro del Donador (RF-IDE-013)', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  const registrar = (correo: string, contrasena = 'una frase larga para donar') =>
    a.http().post('/api/auth/registro').send({ correo, contrasena, nombre: 'Ana Donadora' });

  const enlaceDe = async (correo: string) => {
    const c = await a.prisma.correoSaliente.findFirstOrThrow({
      where: { destinatario: correo },
      orderBy: { creado_en: 'desc' },
    });
    return { asunto: c.asunto, token: /donador\/confirmar\/(\S+)/.exec(c.cuerpo_texto)?.[1] };
  };

  it('crea la cuenta, envía el enlace y no deja entrar hasta confirmar', async () => {
    const correo = `${unico('ana')}@correo.test`;
    const r = await registrar(correo).expect(202);
    expect(r.body.mensaje).toBe('Te enviamos un correo para confirmar tu cuenta');

    const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
    expect(usuario).toMatchObject({ rol: 'DONADOR', estado: 'ACTIVO', username: null });

    const entrar = () =>
      a
        .http()
        .post('/api/auth/donador/sesion')
        .send({ correo, contrasena: 'una frase larga para donar' });
    const sinConfirmar = await entrar().expect(403);
    expect(sinConfirmar.body.codigo).toBe('CORREO_SIN_CONFIRMAR');

    const { token } = await enlaceDe(correo);
    await a.http().post('/api/auth/registro/confirmar').send({ token }).expect(200);
    const dentro = await entrar().expect(200);
    expect(([] as string[]).concat(dentro.headers['set-cookie'] ?? []).join(';')).toMatch(
      /acopio_sesion=/,
    );
    expect(dentro.body.usuario.rol).toBe('DONADOR');
  });

  it('un correo que ya tiene cuenta recibe la misma respuesta y un aviso en vez del enlace', async () => {
    const r = await registrar(ADMIN.correo).expect(202);
    expect(r.body.mensaje).toBe('Te enviamos un correo para confirmar tu cuenta');
    expect((await enlaceDe(ADMIN.correo)).asunto).toBe('Ya tienes una cuenta en Acopio');
  });

  it('una contraseña débil no crea nada', async () => {
    const correo = `${unico('debil')}@correo.test`;
    const r = await registrar(correo, 'corta').expect(400);
    expect(r.body.codigo).toBe('VALIDACION');
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).toBeNull();
  });

  it('un enlace usado o inventado no sirve', async () => {
    await a.http().post('/api/auth/registro/confirmar').send({ token: 'inventado' }).expect(404);
  });

  it('el Donador no entra por la puerta de la consola', async () => {
    const correo = `${unico('puerta')}@correo.test`;
    await registrar(correo).expect(202);
    await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: correo, contrasena: 'una frase larga para donar' })
      .expect(401);
  });

  it('una cuenta interna no entra por la puerta del Donador', async () => {
    await a
      .http()
      .post('/api/auth/donador/sesion')
      .send({ correo: ADMIN.correo, contrasena: ADMIN.contrasena })
      .expect(401);
  });
});
