import { generateKeyPair, SignJWT } from 'jose';
import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';
import { EMISOR_LOCAL } from '../modulos/identidad/proveedor/proveedor-local';

/** T06: autenticación con el adaptador local y el guard (RF-IDE-004, RF-IDE-005). */
describe('autenticación', () => {
  let a: AppPrueba;
  let tokenAdmin: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(() => a.cerrar());

  const yo = (token: string) =>
    a.http().get('/api/auth/yo').set('authorization', `Bearer ${token}`);

  it('iniciar sesión → token → endpoint protegido', async () => {
    const r = await yo(tokenAdmin).expect(200);
    expect(r.body).toMatchObject({ username: 'admin', rol: 'ADMIN', alcanceGlobal: true });
  });

  it('el nombre de usuario no distingue mayúsculas', async () => {
    await iniciarSesion(a, 'ADMIN', ADMIN.contrasena);
  });

  it('sin token: 401', async () => {
    const r = await a.http().get('/api/auth/yo').expect(401);
    expect(r.body).toMatchObject({ estado: 401, codigo: 'NO_AUTENTICADO' });
  });

  it('contraseña equivocada y usuario inexistente dan el mismo mensaje', async () => {
    const mal = await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: 'admin', contrasena: 'no es esta' });
    const nadie = await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: 'nadie', contrasena: 'no es esta' });
    expect(mal.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(mal.body.mensaje).toBe(nadie.body.mensaje);
  });

  it('un token firmado con otra llave: 401', async () => {
    const { privateKey } = await generateKeyPair('RS256');
    const falso = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setSubject('00000000-0000-4000-8000-000000000000')
      .setIssuer(EMISOR_LOCAL)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);
    await yo(falso).expect(401);
  });

  it('un token alterado: 401', async () => {
    const [cabecera, cuerpo, firma] = tokenAdmin.split('.');
    const otroCuerpo = Buffer.from(JSON.stringify({ sub: 'otro', iat: 1 })).toString('base64url');
    await yo(`${cabecera}.${otroCuerpo}.${firma}`).expect(401);
    expect(cuerpo).toBeDefined();
  });

  it('el JWKS publica solo la llave pública', async () => {
    const r = await a.http().get('/api/auth/.well-known/jwks.json').expect(200);
    expect(r.body.keys).toHaveLength(1);
    expect(r.body.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
    expect(r.body.keys[0].d).toBeUndefined();
  });

  it('suspender corta el acceso en el siguiente request, con el token aún vigente', async () => {
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await yo(op.token).expect(200);
    await a
      .http()
      .post(`/api/usuarios/${op.id}/suspender`)
      .set('authorization', `Bearer ${tokenAdmin}`)
      .expect(201);
    const r = await yo(op.token).expect(403);
    expect(r.body.codigo).toBe('NO_AUTORIZADO');
  });

  it('un invitado o suspendido no puede iniciar sesión', async () => {
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await a
      .http()
      .post(`/api/usuarios/${op.id}/suspender`)
      .set('authorization', `Bearer ${tokenAdmin}`)
      .expect(201);
    await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: op.username, contrasena: op.contrasena })
      .expect(401);
  });

  it('restablecer acceso invalida la sesión anterior al canjearse (RF-IDE-009)', async () => {
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    const r = await a
      .http()
      .post(`/api/usuarios/${op.id}/restablecer`)
      .set('authorization', `Bearer ${tokenAdmin}`)
      .send({ motivo: 'Perdió el teléfono con la sesión abierta' })
      .expect(201);
    // Mientras no se canjea, la sesión sigue
    await yo(op.token).expect(200);
    const token = (r.body.enlace as string).split('/').pop();
    // Espera un segundo: `iat` tiene resolución de segundos
    await new Promise((listo) => setTimeout(listo, 1100));
    await a
      .http()
      .post(`/api/invitaciones/${token}/canje`)
      .send({ contrasena: 'otra frase larga y nueva' })
      .expect(200);
    await yo(op.token).expect(401);
    await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: op.username, contrasena: op.contrasena })
      .expect(401);
    const nuevo = await iniciarSesion(a, op.username, 'otra frase larga y nueva');
    await yo(nuevo).expect(200);
  });
});

describe('límite de intentos por IP (RNF-08)', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba({ limiteDeIntentos: true });
  });
  afterAll(() => a.cerrar());

  it('el sexto intento de sesión en un minuto recibe 429', async () => {
    for (let i = 0; i < 5; i++) {
      await a
        .http()
        .post('/api/auth/sesion')
        .send({ usuario: 'admin', contrasena: 'equivocada' })
        .expect(401);
    }
    const r = await a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: 'admin', contrasena: 'equivocada' });
    expect(r.status).toBe(429);
    expect(r.body.codigo).toBe('DEMASIADOS_INTENTOS');
    // Entrar.tsx muestra este mensaje tal cual
    expect(r.body.mensaje).toBe('Demasiados intentos. Espera un minuto.');
  });
});
