import {
  applyDecorators,
  Injectable,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { CaptchaService } from './captcha.service';

/** Exige una prueba de ALTCHA válida en el encabezado X-Captcha (ADR-0024). */
@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captcha: CaptchaService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto.switchToHttp().getRequest<Request>();
    await this.captcha.verificar(peticion.header('x-captcha'));
    return true;
  }
}

/** Para un endpoint público que crea filas y manda correo: un bot tiene que pagar cada envío. */
export const RequiereCaptcha = () =>
  applyDecorators(
    UseGuards(CaptchaGuard),
    ApiHeader({
      name: 'X-Captcha',
      required: true,
      description:
        'Prueba de ALTCHA: base64 de { challenge, solution }, sacada de GET /api/captcha/reto',
    }),
  );
