import 'reflect-metadata';
import './config/zod-es';
import path from 'node:path';
import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurarApp, documentarApi } from './configurar-app';
import { ENTORNO, type Entorno } from './config/entorno';

// En desarrollo, el .env de la raíz del monorepo. En contenedores, las variables del entorno.
config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

async function arrancar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const entorno = app.get<Entorno>(ENTORNO);
  configurarApp(app, entorno);
  if (entorno.NODE_ENV !== 'production') documentarApi(app);
  await app.listen(entorno.API_PUERTO);
}

void arrancar();
