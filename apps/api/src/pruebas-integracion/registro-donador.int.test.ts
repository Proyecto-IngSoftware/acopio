import { BitacoraService } from '../modulos/auditoria/bitacora.service';
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

  it('un enlace vencido da 404 ENLACE_INVALIDO', async () => {
    const correo = `${unico('vencido')}@correo.test`;
    await registrar(correo).expect(202);
    const { token } = await enlaceDe(correo);
    const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
    await a.prisma.verificacionCorreo.updateMany({
      where: { usuario_id: usuario.id },
      data: { vence_en: new Date(Date.now() - 60_000) },
    });
    const r = await a.http().post('/api/auth/registro/confirmar').send({ token }).expect(404);
    expect(r.body.codigo).toBe('ENLACE_INVALIDO');
  });

  it('un segundo registro sobre una cuenta pendiente encola un enlace nuevo', async () => {
    const correo = `${unico('pendiente')}@correo.test`;
    await registrar(correo).expect(202);
    const primero = (await enlaceDe(correo)).token;
    await registrar(correo).expect(202);
    const segundo = await enlaceDe(correo);
    expect(segundo.asunto).not.toBe('Ya tienes una cuenta en Acopio');
    expect(segundo.token).toBeDefined();
    expect(segundo.token).not.toBe(primero);
    expect(await a.prisma.correoSaliente.count({ where: { destinatario: correo } })).toBe(2);
  });

  it('una contraseña débil no crea nada', async () => {
    const correo = `${unico('debil')}@correo.test`;
    const r = await registrar(correo, 'corta').expect(400);
    expect(r.body.codigo).toBe('VALIDACION');
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).toBeNull();
  });

  it('un enlace inventado no sirve', async () => {
    await a.http().post('/api/auth/registro/confirmar').send({ token: 'inventado' }).expect(404);
  });

  it('un enlace ya usado no sirve una segunda vez', async () => {
    const correo = `${unico('doble')}@correo.test`;
    await registrar(correo).expect(202);
    const { token } = await enlaceDe(correo);
    await a.http().post('/api/auth/registro/confirmar').send({ token }).expect(200);
    const otra = await a.http().post('/api/auth/registro/confirmar').send({ token }).expect(404);
    expect(otra.body.codigo).toBe('ENLACE_INVALIDO');
  });

  it('una contraseña que el DTO acepta pero la política rechaza da 422', async () => {
    const correo = `${unico('comun')}@correo.test`;
    const r = await registrar(correo, 'contrasena2026').expect(422);
    expect(r.body.codigo).toBe('CONTRASENA_DEBIL');
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).toBeNull();
  });

  it('si el alta falla a medias no queda una credencial huérfana y se puede reintentar', async () => {
    const correo = `${unico('huerfana')}@correo.test`;
    const espia = jest
      .spyOn(a.app.get(BitacoraService), 'registrar')
      .mockRejectedValueOnce(new Error('falla simulada'));
    try {
      await registrar(correo).expect(500);
    } finally {
      espia.mockRestore();
    }
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).toBeNull();
    expect(await a.prisma.identidadLocal.findUnique({ where: { correo } })).toBeNull();
    await registrar(correo).expect(202);
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).not.toBeNull();
  });

  it('dos registros simultáneos del mismo correo responden 202 los dos', async () => {
    const correo = `${unico('carrera')}@correo.test`;
    const respuestas = await Promise.all([registrar(correo), registrar(correo)]);
    expect(respuestas.map((r) => r.status)).toEqual([202, 202]);
    expect(await a.prisma.usuario.count({ where: { correo } })).toBe(1);
  });

  it('sin confirmar, una contraseña mala da el mismo 401 que un correo inexistente', async () => {
    const correo = `${unico('sinconf')}@correo.test`;
    await registrar(correo).expect(202);
    const entrar = (c: string, contrasena: string) =>
      a.http().post('/api/auth/donador/sesion').send({ correo: c, contrasena });
    const mala = await entrar(correo, 'una contraseña equivocada').expect(401);
    const inexistente = await entrar(
      `${unico('nadie')}@correo.test`,
      'una contraseña equivocada',
    ).expect(401);
    expect(mala.body).toEqual(inexistente.body);
    const buena = await entrar(correo, 'una frase larga para donar').expect(403);
    expect(buena.body.codigo).toBe('CORREO_SIN_CONFIRMAR');
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
