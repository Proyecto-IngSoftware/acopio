import 'reflect-metadata';
import './config/zod-es';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp, documentarApi } from './configurar-app';
import { leerEntorno } from './config/entorno';

/**
 * Escribe el contrato OpenAPI en docs/03-diseno/api/openapi.json, sin base de datos
 * ni servidor: `bun run --filter @acopio/api openapi`. El frontend lo usa para
 * generar su cliente sin levantar el backend.
 */
async function exportar(): Promise<void> {
  // Valores de relleno: el contrato no depende del entorno
  Object.assign(process.env, {
    NODE_ENV: 'development',
    APP_URL: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://sin-conexion@localhost:1/acopio',
    AUTH_PROVEEDOR: 'local',
    SUPABASE_JWKS_URL: 'http://localhost:3000/api/auth/.well-known/jwks.json',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    CORREO_REMITENTE: 'Acopio <no-responder@acopio.local>',
    S3_ENDPOINT: 'http://localhost:3900',
    S3_REGION: 'garage',
    S3_BUCKET: 'comprobantes',
    S3_ACCESS_KEY: 'sin-llave',
    S3_SECRET_KEY: 'sin-secreto',
  });
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  configurarApp(app, leerEntorno());
  const documento = documentarApi(app);
  const destino = path.resolve(__dirname, '../../../docs/03-diseno/api/openapi.json');
  writeFileSync(destino, JSON.stringify(documento, null, 2) + '\n');
  await app.close();
  console.log(`Contrato escrito en ${path.relative(process.cwd(), destino)}`);
}

void exportar();
