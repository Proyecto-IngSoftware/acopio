import { Module } from '@nestjs/common';
import { CaptchaController } from './captcha.controller';
import { CaptchaGuard } from './captcha.guard';
import { CaptchaService } from './captcha.service';
import { CaptchaUsadoDao } from './dao/captcha-usado.dao';

/** ALTCHA en los formularios públicos (ADR-0024). Hoja del grafo: no importa ningún módulo. */
@Module({
  controllers: [CaptchaController],
  providers: [CaptchaService, CaptchaGuard, CaptchaUsadoDao],
  exports: [CaptchaService, CaptchaGuard],
})
export class CaptchaModule {}
