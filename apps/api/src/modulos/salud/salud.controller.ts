import { SaludDto } from '../../comun/respuestas';
import { readFileSync } from 'node:fs';
import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { SaludDao } from './salud.dao';

/** La API corre siempre desde apps/api (Dockerfile, start:dev y Jest), así que lee su propio package.json. */
const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly salud: SaludDao) {}

  /** 200 con la versión si la API y la base responden; 503 si la base no. */
  @Publico()
  @Get()
  @HttpCode(200)
  @ApiOkResponse({ type: SaludDto })
  async revisar(): Promise<{ estado: 'ok'; base: 'ok'; version: string }> {
    try {
      await this.salud.responde();
    } catch {
      throw new ServiceUnavailableException('La base de datos no responde');
    }
    return { estado: 'ok', base: 'ok', version: VERSION };
  }
}
