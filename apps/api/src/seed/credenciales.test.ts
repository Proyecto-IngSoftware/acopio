import type { PrismaService } from '../comun/prisma/prisma.service';
import type { Entorno } from '../config/entorno';
import type { ProveedorIdentidad } from '../modulos/identidad/proveedor/proveedor-identidad';
import { ProveedorLocal } from '../modulos/identidad/proveedor/proveedor-local';
import { ProveedorSupabase } from '../modulos/identidad/proveedor/proveedor-supabase';
import { contrasenaDemo, crearCuentaDemo, proveedorDelSeed } from './credenciales';

describe('credenciales del seed', () => {
  it('con AUTH_PROVEEDOR=local usa ProveedorLocal', () => {
    const p = proveedorDelSeed({} as PrismaService, { AUTH_PROVEEDOR: 'local' } as Entorno);
    expect(p).toBeInstanceOf(ProveedorLocal);
  });

  it('con AUTH_PROVEEDOR=supabase usa ProveedorSupabase', () => {
    const p = proveedorDelSeed({} as PrismaService, { AUTH_PROVEEDOR: 'supabase' } as Entorno);
    expect(p).toBeInstanceOf(ProveedorSupabase);
  });

  it('la contraseña sale de DEMO_CONTRASENA', () => {
    expect(contrasenaDemo({ DEMO_CONTRASENA: 'x-1' })).toBe('x-1');
  });

  it('en desarrollo, sin la variable, usa la de siempre', () => {
    expect(contrasenaDemo({ NODE_ENV: 'development' })).toBe('demo-acopio-2026');
  });

  it('en producción, sin la variable, falla y la nombra', () => {
    expect(() => contrasenaDemo({ NODE_ENV: 'production' })).toThrow(/DEMO_CONTRASENA/);
    expect(() => contrasenaDemo({ NODE_ENV: 'production', DEMO_CONTRASENA: '' })).toThrow(
      /DEMO_CONTRASENA/,
    );
  });

  it('si el proveedor rechaza la cuenta, el error nombra el correo y la salida', async () => {
    const falso = {
      crearUsuario: () => Promise.reject(new Error('User already registered')),
    } as unknown as ProveedorIdentidad;
    const error = await crearCuentaDemo(falso, 'joseph@acopio.co', 'x').catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('joseph@acopio.co');
    expect((error as Error).message).toContain('bórrala en el panel');
    expect((error as Error).message).toContain('User already registered');
  });
});
