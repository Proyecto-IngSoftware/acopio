import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Límite de intentos por IP (RNF-08). Clase propia para registrarla como proveedor:
 * así las pruebas la pueden reemplazar, cosa que no permite un APP_GUARD con useClass.
 */
@Injectable()
export class LimiteIntentosGuard extends ThrottlerGuard {}
