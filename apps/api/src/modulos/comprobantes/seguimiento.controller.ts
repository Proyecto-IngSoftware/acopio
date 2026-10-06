import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Publico } from '../../comun/autorizacion/decoradores';
import { ErrorDto, SeguimientoDto } from '../../comun/respuestas';
import { SeguimientoService } from './seguimiento.service';

@ApiTags('seguimiento')
@Controller('seguimiento')
export class SeguimientoController {
  constructor(private readonly seguimiento: SeguimientoService) {}

  /** P10: cualquiera consulta un folio. El límite por IP evita recorrer folios al azar. */
  @Publico()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Recorrido de una donación por folio, sin datos del Donador. No exige sesión',
    security: [],
  })
  @Get(':folio')
  @ApiOkResponse({ type: SeguimientoDto })
  @ApiResponse({ status: 'default', type: ErrorDto, description: 'Error' })
  consultar(@Param('folio') folio: string) {
    return this.seguimiento.consultar(folio);
  }
}
