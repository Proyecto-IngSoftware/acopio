import { SaludDto } from '../../comun/respuestas';
import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { SaludDao } from './salud.dao';

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly salud: SaludDao) {}

  /** 200 si la API y la base responden; 503 si la base no. */
  @Publico()
  @Get()
  @HttpCode(200)
  @ApiOkResponse({ type: SaludDto })
  async revisar(): Promise<{ estado: 'ok'; base: 'ok' }> {
    try {
      await this.salud.responde();
    } catch {
      throw new ServiceUnavailableException('La base de datos no responde');
    }
    return { estado: 'ok', base: 'ok' };
  }
}
