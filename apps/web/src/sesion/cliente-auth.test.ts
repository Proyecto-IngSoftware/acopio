import { vi } from 'vitest';
import { alPerderSesion, ErrorApi } from '../api/cliente';
import { responderJson } from '../pruebas/utilidades';
import { clienteAuthLocal } from './cliente-auth';

const USUARIO = { id: 'u1', username: 'd.mendez', nombre: 'Daniela Méndez', rol: 'OPERADOR' };
const peticion = (n = 0) => vi.mocked(globalThis.fetch).mock.calls[n]![0] as Request;

it('iniciarSesion envía usuario y contraseña con credenciales y devuelve el usuario', async () => {
  responderJson({ expiraEn: '2026-10-01T00:00:00.000Z', usuario: USUARIO });
  await expect(clienteAuthLocal.iniciarSesion('d.mendez', 'una frase larga')).resolves.toEqual(
    USUARIO,
  );
  const p = peticion();
  expect(p.method).toBe('POST');
  expect(p.url).toMatch(/\/api\/auth\/sesion$/);
  expect(p.credentials).toBe('include');
  expect(await p.json()).toEqual({ usuario: 'd.mendez', contrasena: 'una frase larga' });
});

it('iniciarSesion con credenciales malas rechaza con un ErrorApi 401', async () => {
  responderJson(
    { estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Usuario o contraseña incorrectos' },
    401,
  );
  const error = await clienteAuthLocal.iniciarSesion('x', 'y').catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorApi);
  expect((error as ErrorApi).estado).toBe(401);
});

it('un 401 al iniciar sesión no cuenta como sesión perdida', async () => {
  const aviso = vi.fn();
  const quitar = alPerderSesion(aviso);
  responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'No' }, 401);
  await clienteAuthLocal.iniciarSesion('x', 'y').catch(() => {});
  expect(aviso).not.toHaveBeenCalled();
  quitar();
});

it('usuarioActual devuelve el usuario con sesión y null con 401', async () => {
  responderJson({ ...USUARIO, alcanceGlobal: false, asignaciones: [] });
  await expect(clienteAuthLocal.usuarioActual()).resolves.toEqual(USUARIO);
  expect(peticion().url).toMatch(/\/api\/auth\/yo$/);
  expect(peticion().credentials).toBe('include');

  responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Falta la sesión' }, 401);
  await expect(clienteAuthLocal.usuarioActual()).resolves.toBeNull();
});

it('cerrarSesion llama a salir y no falla aunque la API responda error', async () => {
  responderJson({ estado: 500, codigo: 'ERROR_INTERNO', mensaje: 'x' }, 500);
  await expect(clienteAuthLocal.cerrarSesion()).resolves.toBeUndefined();
  expect(peticion().url).toMatch(/\/api\/auth\/salir$/);
  expect(peticion().method).toBe('POST');
});

it('un 401 en otra llamada avisa que se perdió la sesión', async () => {
  const aviso = vi.fn();
  const quitar = alPerderSesion(aviso);
  responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Falta la sesión' }, 401);
  await clienteAuthLocal.usuarioActual();
  expect(aviso).toHaveBeenCalledTimes(1);
  quitar();
});

describe('registro y sesión del Donador', () => {
  const DONADOR = { id: 'u9', username: null, nombre: 'Ana Pérez', rol: 'DONADOR' };

  it('registrarDonador envía nombre y correo', async () => {
    responderJson({ mensaje: 'Revisa tu correo' }, 202);
    await expect(clienteAuthLocal.registrarDonador('Ana Pérez', 'ana@correo.co')).resolves.toBe(
      undefined,
    );
    const p = peticion();
    expect(p.method).toBe('POST');
    expect(p.url).toMatch(/\/api\/auth\/registro$/);
    expect(await p.json()).toEqual({ nombre: 'Ana Pérez', correo: 'ana@correo.co' });
  });

  it('validarEnlace devuelve los datos y null con 404', async () => {
    responderJson({ nombre: 'Ana Pérez', correo: 'ana@correo.co' });
    await expect(clienteAuthLocal.validarEnlace('tok')).resolves.toEqual({
      nombre: 'Ana Pérez',
      correo: 'ana@correo.co',
    });
    expect(peticion().url).toMatch(/\/api\/auth\/registro\/confirmar\/tok$/);

    responderJson({ estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'No existe' }, 404);
    await expect(clienteAuthLocal.validarEnlace('malo')).resolves.toBeNull();
  });

  it('validarEnlace deja pasar otros errores', async () => {
    responderJson({ estado: 500, codigo: 'ERROR_INTERNO', mensaje: 'x' }, 500);
    await expect(clienteAuthLocal.validarEnlace('t')).rejects.toBeInstanceOf(ErrorApi);
  });

  it('confirmarCorreo envía token, contraseña y nombre, y devuelve el usuario', async () => {
    responderJson({ expiraEn: '2026-10-01T00:00:00.000Z', usuario: DONADOR });
    await expect(
      clienteAuthLocal.confirmarCorreo('tok', 'una frase larga', 'Ana'),
    ).resolves.toEqual(DONADOR);
    const p = peticion();
    expect(p.url).toMatch(/\/api\/auth\/registro\/confirmar$/);
    expect(p.credentials).toBe('include');
    expect(await p.json()).toEqual({ token: 'tok', contrasena: 'una frase larga', nombre: 'Ana' });
  });

  it('iniciarSesionDonador envía correo y contraseña', async () => {
    responderJson({ expiraEn: '2026-10-01T00:00:00.000Z', usuario: DONADOR });
    await expect(
      clienteAuthLocal.iniciarSesionDonador('ana@correo.co', 'una frase larga'),
    ).resolves.toEqual(DONADOR);
    const p = peticion();
    expect(p.url).toMatch(/\/api\/auth\/donador\/sesion$/);
    expect(await p.json()).toEqual({ correo: 'ana@correo.co', contrasena: 'una frase larga' });
  });

  it('un 401 al iniciar sesión de Donador no cuenta como sesión perdida', async () => {
    const aviso = vi.fn();
    const quitar = alPerderSesion(aviso);
    responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'No' }, 401);
    await clienteAuthLocal.iniciarSesionDonador('a@b.co', 'x').catch(() => {});
    expect(aviso).not.toHaveBeenCalled();
    quitar();
  });
});
