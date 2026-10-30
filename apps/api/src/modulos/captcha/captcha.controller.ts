import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Publico } from '../../comun/autorizacion/decoradores';
import { RetoCaptchaDto } from '../../comun/respuestas';
import { CaptchaService } from './captcha.service';

@ApiTags('captcha')
@Controller('captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  /** Un reto de ALTCHA para el siguiente envío; null con el captcha apagado (ADR-0024). */
  @Publico()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('reto')
  @ApiOkResponse({ type: RetoCaptchaDto })
  async reto() {
    return { reto: await this.captcha.crearReto() };
  }
}
