import { BitacoraService } from '../modulos/auditoria/bitacora.service';
import { ADMIN, crearAppPrueba, unico, type AppPrueba } from '../../test/app-prueba';

const CONTRASENA = 'una frase larga para donar';

describe('registro del Donador (RF-IDE-013, P-040)', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  const registrar = (correo: string, nombre = 'Ana Donadora') =>
    a.http().post('/api/auth/registro').send({ correo, nombre });

  const confirmar = (token: string, contrasena = CONTRASENA, nombre?: string) =>
    a
      .http()
      .post('/api/auth/registro/confirmar')
      .send({ token, contrasena, ...(nombre ? { nombre } : {}) });

  const entrar = (correo: string, contrasena: string) =>
    a.http().post('/api/auth/donador/sesion').send({ correo, contrasena });

  const cookieDe = (r: { headers: Record<string, unknown> }) =>
    ([] as string[]).concat((r.headers['set-cookie'] as string[] | undefined) ?? []).join(';');

  const enlaceDe = async (correo: string) => {
    const c = await a.prisma.correoSaliente.findFirstOrThrow({
      where: { destinatario: correo },
      orderBy: { creado_en: 'desc' },
    });
    return { asunto: c.asunto, token: /donador\/confirmar\/(\S+)/.exec(c.cuerpo_texto)?.[1] };
  };

  const registrarYTomarEnlace = async (prefijo: string) => {
    const correo = `${unico(prefijo)}@correo.test`;
    await registrar(correo).expect(202);
    return { correo, token: (await enlaceDe(correo)).token! };
  };

  it('el registro crea un Donador invitado sin credencial y envía el enlace', async () => {
    const correo = `${unico('ana')}@correo.test`;
    const r = await registrar(correo).expect(202);
    expect(r.body.mensaje).toBe('Te enviamos un correo para confirmar tu cuenta');

    const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
    expect(usuario).toMatchObject({
      rol: 'DONADOR',
      estado: 'INVITADO',
      username: null,
      supabase_uid: null,
      nombre: 'Ana Donadora',
    });
    expect(await a.prisma.identidadLocal.findUnique({ where: { correo } })).toBeNull();
    expect((await enlaceDe(correo)).token).toBeDefined();
    expect(
      await a.prisma.bitacora.count({
        where: { accion: 'donador.registrado', entidad_id: usuario.id },
      }),
    ).toBe(1);
  });

  it('el registro no acepta contraseña', async () => {
    const correo = `${unico('conpass')}@correo.test`;
    const r = await a
      .http()
      .post('/api/auth/registro')
      .send({ correo, nombre: 'Ana Donadora', contrasena: CONTRASENA })
      .expect(400);
    expect(r.body.codigo).toBe('VALIDACION');
    expect(await a.prisma.usuario.findUnique({ where: { correo } })).toBeNull();
  });

  it('un segundo registro de un pendiente envía un enlace nuevo y no cambia el nombre', async () => {
    const correo = `${unico('pendiente')}@correo.test`;
    await registrar(correo, 'Ana Donadora').expect(202);
    const primero = (await enlaceDe(correo)).token;
    await registrar(correo, 'Otro Nombre').expect(202);
    const segundo = await enlaceDe(correo);
    expect(segundo.asunto).not.toBe('Ya tienes una cuenta en Acopio');
    expect(segundo.token).toBeDefined();
    expect(segundo.token).not.toBe(primero);
    expect(await a.prisma.correoSaliente.count({ where: { destinatario: correo } })).toBe(2);
    const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
    expect(usuario.nombre).toBe('Ana Donadora');
  });

  it('un correo con cuenta activa recibe la misma respuesta y un aviso en vez del enlace', async () => {
    const r = await registrar(ADMIN.correo).expect(202);
    expect(r.body.mensaje).toBe('Te enviamos un correo para confirmar tu cuenta');
    expect((await enlaceDe(ADMIN.correo)).asunto).toBe('Ya tienes una cuenta en Acopio');
  });

  it('dos registros simultáneos del mismo correo responden 202 los dos', async () => {
    const correo = `${unico('carrera')}@correo.test`;
    const respuestas = await Promise.all([registrar(correo), registrar(correo)]);
    expect(respuestas.map((r) => r.status)).toEqual([202, 202]);
    expect(await a.prisma.usuario.count({ where: { correo } })).toBe(1);
  });

  describe('validación previa del enlace', () => {
    it('un enlace bueno devuelve nombre y correo', async () => {
      const { correo, token } = await registrarYTomarEnlace('previa');
      const r = await a.http().get(`/api/auth/registro/confirmar/${token}`).expect(200);
      expect(r.body).toEqual({ nombre: 'Ana Donadora', correo });
    });

    it('uno inventado da 404 ENLACE_INVALIDO', async () => {
      const r = await a.http().get('/api/auth/registro/confirmar/inventado').expect(404);
      expect(r.body.codigo).toBe('ENLACE_INVALIDO');
    });

    it('uno vencido da 404', async () => {
      const { correo, token } = await registrarYTomarEnlace('previavenc');
      const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
      await a.prisma.verificacionCorreo.updateMany({
        where: { usuario_id: usuario.id },
        data: { vence_en: new Date(Date.now() - 60_000) },
      });
      await a.http().get(`/api/auth/registro/confirmar/${token}`).expect(404);
    });

    it('uno ya usado da 404', async () => {
      const { token } = await registrarYTomarEnlace('previausado');
      await confirmar(token).expect(200);
      await a.http().get(`/api/auth/registro/confirmar/${token}`).expect(404);
    });
  });

  describe('confirmar', () => {
    it('con contraseña débil da 422 y el enlace sigue sirviendo', async () => {
      const { token } = await registrarYTomarEnlace('debil');
      const r = await confirmar(token, 'contrasena2026').expect(422);
      expect(r.body.codigo).toBe('CONTRASENA_DEBIL');
      await a.http().get(`/api/auth/registro/confirmar/${token}`).expect(200);
    });

    it('una contraseña corta da 400', async () => {
      const { token } = await registrarYTomarEnlace('corta');
      const r = await confirmar(token, 'corta').expect(400);
      expect(r.body.codigo).toBe('VALIDACION');
    });

    it('con una contraseña buena activa la cuenta e inicia la sesión', async () => {
      const { correo, token } = await registrarYTomarEnlace('bueno');
      const r = await confirmar(token, CONTRASENA, 'Ana Corregida').expect(200);
      expect(cookieDe(r)).toMatch(/acopio_sesion=/);
      expect(r.body.usuario.rol).toBe('DONADOR');
      expect(r.body.usuario.nombre).toBe('Ana Corregida');

      const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
      expect(usuario).toMatchObject({ estado: 'ACTIVO', nombre: 'Ana Corregida' });
      expect(usuario.supabase_uid).not.toBeNull();
      expect(usuario.tokens_validos_desde).not.toBeNull();
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'donador.confirmado', entidad_id: usuario.id },
        }),
      ).toBe(1);

      const yo = await a
        .http()
        .get('/api/auth/yo')
        .set('Cookie', cookieDe(r).split(';')[0]!)
        .expect(200);
      expect(yo.body.id).toBe(usuario.id);

      const dentro = await entrar(correo, CONTRASENA).expect(200);
      expect(cookieDe(dentro)).toMatch(/acopio_sesion=/);
    });

    it('un enlace inventado no sirve', async () => {
      await confirmar('inventado').expect(404);
    });

    it('un enlace vencido da 404 ENLACE_INVALIDO', async () => {
      const { correo, token } = await registrarYTomarEnlace('vencido');
      const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
      await a.prisma.verificacionCorreo.updateMany({
        where: { usuario_id: usuario.id },
        data: { vence_en: new Date(Date.now() - 60_000) },
      });
      const r = await confirmar(token).expect(404);
      expect(r.body.codigo).toBe('ENLACE_INVALIDO');
      expect(await a.prisma.identidadLocal.findUnique({ where: { correo } })).toBeNull();
    });

    it('un enlace ya usado no sirve una segunda vez', async () => {
      const { token } = await registrarYTomarEnlace('doble');
      await confirmar(token).expect(200);
      const otra = await confirmar(token).expect(404);
      expect(otra.body.codigo).toBe('ENLACE_INVALIDO');
    });

    it('un enlace anterior deja de servir cuando otro lo confirma', async () => {
      const correo = `${unico('dosenlaces')}@correo.test`;
      await registrar(correo).expect(202);
      const primero = (await enlaceDe(correo)).token!;
      await registrar(correo).expect(202);
      const segundo = (await enlaceDe(correo)).token!;
      await confirmar(segundo).expect(200);
      await confirmar(primero).expect(404);
    });

    it('dos confirmaciones simultáneas: una gana, la otra da 404 y queda una sola identidad', async () => {
      const { correo, token } = await registrarYTomarEnlace('simultaneo');
      const respuestas = await Promise.all([confirmar(token), confirmar(token)]);
      expect(respuestas.map((r) => r.status).sort()).toEqual([200, 404]);
      expect(await a.prisma.identidadLocal.count({ where: { correo } })).toBe(1);
    });

    it('si la transacción falla no queda identidad huérfana y el mismo enlace sirve después', async () => {
      const { correo, token } = await registrarYTomarEnlace('falla');
      const espia = jest
        .spyOn(a.app.get(BitacoraService), 'registrar')
        .mockRejectedValueOnce(new Error('falla simulada'));
      try {
        await confirmar(token).expect(500);
      } finally {
        espia.mockRestore();
      }
      expect(await a.prisma.identidadLocal.findUnique({ where: { correo } })).toBeNull();
      const usuario = await a.prisma.usuario.findUniqueOrThrow({ where: { correo } });
      expect(usuario.estado).toBe('INVITADO');
      await confirmar(token).expect(200);
    });
  });

  describe('ingreso', () => {
    it('un pendiente da el mismo 401 que un correo inexistente', async () => {
      const { correo } = await registrarYTomarEnlace('sinconf');
      const pendiente = await entrar(correo, CONTRASENA).expect(401);
      const inexistente = await entrar(`${unico('nadie')}@correo.test`, CONTRASENA).expect(401);
      expect(pendiente.body).toEqual(inexistente.body);
    });

    it('el Donador no entra por la puerta de la consola', async () => {
      const { correo, token } = await registrarYTomarEnlace('puerta');
      await confirmar(token).expect(200);
      await a
        .http()
        .post('/api/auth/sesion')
        .send({ usuario: correo, contrasena: CONTRASENA })
        .expect(401);
    });

    it('una cuenta interna no entra por la puerta del Donador', async () => {
      await entrar(ADMIN.correo, ADMIN.contrasena).expect(401);
    });
  });

  it('P-040: quien registra el correo de otra persona no fija su contraseña', async () => {
    const correo = `${unico('victima')}@correo.test`;
    // El atacante intenta registrar con su contraseña: no la acepta
    await a
      .http()
      .post('/api/auth/registro')
      .send({ correo, nombre: 'Víctima', contrasena: 'contraseña del atacante 1' })
      .expect(400);
    await registrar(correo).expect(202);
    // El atacante no tiene el enlace; no puede entrar con nada
    await entrar(correo, 'contraseña del atacante 1').expect(401);
    // La dueña recibe el enlace y elige la suya
    const { token } = await enlaceDe(correo);
    await confirmar(token!, 'la contraseña de la dueña 7').expect(200);
    await entrar(correo, 'contraseña del atacante 1').expect(401);
    await entrar(correo, 'la contraseña de la dueña 7').expect(200);
  });
});
