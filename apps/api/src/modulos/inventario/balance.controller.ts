import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { BalanceDto } from '../../comun/respuestas';
import { BalanceService } from './balance.service';

/** P1: «Qué hace falta» y «No traigan» de la portada (P-073). */
@ApiTags('inventario')
@Controller('publico')
export class BalanceController {
  constructor(private readonly balance: BalanceService) {}

  @Publico()
  @ApiOperation({
    summary: 'Qué hace falta y qué no traer, por categoría y con cuántos acopios. No exige sesión',
    security: [],
  })
  @Get('balance')
  @ApiOkResponse({ type: BalanceDto })
  leer() {
    return this.balance.balance();
  }
}
