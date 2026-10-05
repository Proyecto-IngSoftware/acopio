import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ErrorDominio } from './error-dominio';

/** Forma única de todo error de la API. */
export interface RespuestaError {
  estado: number;
  codigo: string;
  mensaje: string;
  detalles?: unknown;
}

const CODIGO_POR_ESTADO: Record<number, string> = {
  400: 'SOLICITUD_INVALIDA',
  401: 'NO_AUTENTICADO',
  403: 'NO_AUTORIZADO',
  404: 'NO_ENCONTRADO',
  409: 'CONFLICTO',
  429: 'DEMASIADOS_INTENTOS',
};

@Catch()
export class FiltroErrores implements ExceptionFilter {
  private readonly log = new Logger(FiltroErrores.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const cuerpo = this.traducir(error);
    respuesta.status(cuerpo.estado).json(cuerpo);
  }

  private traducir(error: unknown): RespuestaError {
    if (error instanceof ErrorDominio) {
      return {
        estado: error.estado,
        codigo: error.codigo,
        mensaje: error.message,
        ...(error.detalles === undefined ? {} : { detalles: error.detalles }),
      };
    }
    if (error instanceof ZodValidationException) {
      const zod = error.getZodError() as { issues: { path: PropertyKey[]; message: string }[] };
      return {
        estado: 400,
        codigo: 'VALIDACION',
        mensaje: 'Hay datos inválidos en la solicitud',
        // Un mensaje por campo, para mostrarlo junto a cada entrada del formulario
        detalles: zod.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      };
    }
    // El mensaje de ThrottlerException viene en inglés y la pantalla de acceso lo muestra
    if (error instanceof ThrottlerException) {
      return {
        estado: HttpStatus.TOO_MANY_REQUESTS,
        codigo: 'DEMASIADOS_INTENTOS',
        mensaje: 'Demasiados intentos. Espera un minuto.',
      };
    }
    if (error instanceof HttpException) {
      const estado = error.getStatus();
      return {
        estado,
        codigo: CODIGO_POR_ESTADO[estado] ?? 'ERROR',
        mensaje: error.message,
      };
    }
    this.log.error(error);
    return {
      estado: HttpStatus.INTERNAL_SERVER_ERROR,
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrió un error inesperado',
    };
  }
}
