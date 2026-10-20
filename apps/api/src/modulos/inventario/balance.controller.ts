import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Publico } from '../../comun/autorizacion/decoradores';
import { BalanceDto, NecesidadAcopioDto, UrgenteDto } from '../../comun/respuestas';
import { BalanceService } from './balance.service';

/** P1: «Qué hace falta» y «No traigan» de la portada (P-073); P6: «Lo que urge» de la ficha. */
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

  @Publico()
  @ApiOperation({
    summary:
      'Qué falta, qué sobra, qué está al día y qué no recibe cada acopio, solo por categoría. No exige sesión',
    security: [],
  })
  @Get('necesidades')
  @ApiOkResponse({ type: NecesidadAcopioDto, isArray: true })
  necesidades() {
    return this.balance.necesidades();
  }

  @Publico()
  @ApiOperation({
    summary:
      'Lo que urge en un acopio: las categorías bajo el mínimo, sin cantidades. No exige sesión',
    security: [],
  })
  @Get('acopios/:id/urgente')
  @ApiOkResponse({ type: UrgenteDto })
  urgente(@Param('id', ParseUUIDPipe) id: string) {
    return this.balance.urgente(id);
  }
}
