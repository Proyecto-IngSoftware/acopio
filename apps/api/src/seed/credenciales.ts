import type { PrismaService } from '../comun/prisma/prisma.service';
import type { Entorno } from '../config/entorno';
import { fabricarProveedorIdentidad } from '../modulos/identidad/proveedor/fabrica-proveedor';
import type { ProveedorIdentidad } from '../modulos/identidad/proveedor/proveedor-identidad';
import { ProveedorLocal } from '../modulos/identidad/proveedor/proveedor-local';
import { ProveedorSupabase } from '../modulos/identidad/proveedor/proveedor-supabase';

const CONTRASENA_DEMO_DESARROLLO = 'demo-acopio-2026';

/** El adaptador que elige AUTH_PROVEEDOR; los dos constructores son perezosos. */
export function proveedorDelSeed(prisma: PrismaService, entorno: Entorno): ProveedorIdentidad {
  return fabricarProveedorIdentidad(
    entorno,
    new ProveedorLocal(prisma, entorno),
    new ProveedorSupabase(entorno),
  );
}

/** DEMO_CONTRASENA; en desarrollo, la de siempre. El repositorio es público. */
export function contrasenaDemo(variables: NodeJS.ProcessEnv): string {
  if (variables.DEMO_CONTRASENA) return variables.DEMO_CONTRASENA;
  if (variables.NODE_ENV === 'production') {
    throw new Error('Falta DEMO_CONTRASENA: en producción la demo no tiene contraseña por defecto');
  }
  return CONTRASENA_DEMO_DESARROLLO;
}

/** Crea la credencial y, si falla, dice qué cuenta revisar en el proveedor. */
export async function crearCuentaDemo(
  proveedor: ProveedorIdentidad,
  correo: string,
  contrasena: string,
): Promise<{ uid: string }> {
  try {
    return await proveedor.crearUsuario(correo, contrasena);
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    throw new Error(
      `No se pudo crear ${correo} en el proveedor de identidad. Si ya existe en Supabase sin ` +
        `su usuario en la base, bórrala en el panel y vuelve a correr la demo. Causa: ${mensaje}`,
      { cause: e },
    );
  }
}
