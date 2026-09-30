import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import type { Entorno } from './config/entorno';
import './config/zod-es';

/** Configuración común al servidor y a las pruebas de integración. */
export function configurarApp(app: INestApplication, entorno: Entorno): void {
  app.setGlobalPrefix('api');
  // Con credenciales: la sesión viaja en una cookie (ADR-0014)
  app.enableCors({ origin: entorno.APP_URL, credentials: true });
  // Detrás del proxy, la IP real del cliente viene en X-Forwarded-For (límite por IP)
  (app as NestExpressApplication).set('trust proxy', 1);
  app.enableShutdownHooks();
}

/**
 * Contrato OpenAPI en /api/docs (interfaz) y /api/docs.json (para generar el
 * cliente del frontend).
 */
export function documentarApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Acopio · API')
    .setDescription(
      'API REST de Acopio. Errores con forma { estado, codigo, mensaje, detalles? }. ' +
        'Autenticación con Bearer: el token de POST /api/auth/sesion.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const documento = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup('api/docs', app, documento, { jsonDocumentUrl: 'api/docs.json' });
  return documento;
}
