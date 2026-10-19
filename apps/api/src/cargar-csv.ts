import 'reflect-metadata';
import path from 'node:path';
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { UsuarioAutenticado } from './comun/autorizacion/usuario-autenticado';
import { PrismaService } from './comun/prisma/prisma.service';
import { CsvService } from './modulos/importacion/csv/csv.service';

// El .env de la raíz, como el seed
config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

/**
 * `bun run --filter @acopio/api cargar <tipo> <archivo> [--aplicar] [--como <correo>]`.
 * Sin `--aplicar` solo revisa. Escribe en nombre del Administrador de `--como` (por defecto, el
 * primero que creó el seed), porque causas, jornadas y movimientos guardan quién los creó.
 */
async function principal() {
  const [tipo, ruta, ...resto] = process.argv.slice(2);
  if (!tipo || !ruta) {
    console.error('Uso: cargar <tipo> <archivo> [--aplicar] [--como <correo>]');
    process.exitCode = 2;
    return;
  }
  const aplicar = resto.includes('--aplicar');
  const como = resto[resto.indexOf('--como') + 1];
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const contenido = readFileSync(ruta);
    const csv = app.get(CsvService);
    if (!aplicar) {
      console.log(JSON.stringify(await csv.revisar(tipo, contenido), null, 2));
      return;
    }
    const admin = await app.get(PrismaService).usuario.findFirst({
      where: {
        rol: 'ADMIN',
        estado: 'ACTIVO',
        ...(resto.includes('--como') ? { correo: como } : {}),
      },
      orderBy: { creado_en: 'asc' },
    });
    if (!admin) throw new Error('No hay un Administrador activo con ese correo');
    const usuario: UsuarioAutenticado = {
      id: admin.id,
      username: admin.username,
      nombre: admin.nombre,
      rol: 'ADMIN',
    };
    const r = await csv.aplicar(tipo, contenido, usuario);
    console.log(`Cargadas ${r.validas} filas de «${tipo}».`);
  } catch (e) {
    console.error(
      (e as Error).message,
      JSON.stringify((e as { detalles?: unknown }).detalles ?? '', null, 2),
    );
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void principal();
