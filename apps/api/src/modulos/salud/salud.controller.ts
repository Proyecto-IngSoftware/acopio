import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { Publico } from '../../comun/autorizacion/decoradores';

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  /** 200 si la API y la base responden; 503 si la base no. */
  @Publico()
  @Get()
  @HttpCode(200)
  async revisar(): Promise<{ estado: 'ok'; base: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('La base de datos no responde');
    }
    return { estado: 'ok', base: 'ok' };
  }
}
