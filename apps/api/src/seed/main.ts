import 'reflect-metadata';
import path from 'node:path';
import { config } from 'dotenv';
import { PrismaService } from '../comun/prisma/prisma.service';
import { leerEntorno } from '../config/entorno';
import { ProveedorLocal } from '../modulos/identidad/proveedor/proveedor-local';
import { ProveedorSupabase } from '../modulos/identidad/proveedor/proveedor-supabase';
import { sembrar } from './sembrar';

config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

/** `bun run --filter @acopio/api seed`. Corre como dueño de la base (DATABASE_URL_OWNER). */
async function principal(): Promise<void> {
  const variables = process.env;
  const faltan = [
    'DATABASE_URL_OWNER',
    'SEED_ADMIN_USUARIO',
    'SEED_ADMIN_CORREO',
    'SEED_ADMIN_CONTRASENA',
  ].filter((v) => !variables[v]);
  if (faltan.length) throw new Error(`Faltan variables para el seed: ${faltan.join(', ')}`);

  const entorno = leerEntorno({ ...variables, DATABASE_URL: variables.DATABASE_URL_OWNER });
  const prisma = new PrismaService(entorno);
  const proveedor =
    entorno.AUTH_PROVEEDOR === 'local'
      ? new ProveedorLocal(prisma, entorno)
      : new ProveedorSupabase(entorno);
  try {
    const resumen = await sembrar(prisma, proveedor, {
      username: variables.SEED_ADMIN_USUARIO!,
      nombre: variables.SEED_ADMIN_NOMBRE ?? 'Administrador',
      correo: variables.SEED_ADMIN_CORREO!,
      contrasena: variables.SEED_ADMIN_CONTRASENA!,
    });
    console.log(
      `Seed listo: ${resumen.categorias} categorías, ${resumen.canasta} filas de canasta, ` +
        (resumen.adminCreado ? 'administrador creado.' : 'el administrador ya existía.'),
    );
  } finally {
    await prisma.$disconnect();
  }
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
