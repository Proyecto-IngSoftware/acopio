import 'reflect-metadata';
import path from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FUENTE_ACOPIOS, type FuenteAcopios } from './modulos/importacion/fuentes/fuente-acopios';
import { ImportadorReferenciadosService } from './modulos/importacion/importador-referenciados.service';

// El .env de la raíz, como el seed
config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

/** `bun run --filter @acopio/api importar:redacopio`: una lectura ahora, como acción del sistema. */
async function principal() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  try {
    const r = await app
      .get(ImportadorReferenciadosService)
      .ejecutar(app.get<FuenteAcopios>(FUENTE_ACOPIOS), null);
    console.log(JSON.stringify(r));
    if (r.resultado !== 'OK') process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void principal();
