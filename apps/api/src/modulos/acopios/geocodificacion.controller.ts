import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Publico } from '../../comun/autorizacion/decoradores';
import { ErrorDto, ResultadoGeoDto } from '../../comun/respuestas';
import { GeocodificacionService } from './geocodificacion';

class GeocodificarDto extends createZodDto(z.object({ q: z.string().trim().min(3).max(200) })) {}

@ApiTags('red')
@Controller('geocodificar')
export class GeocodificacionController {
  constructor(private readonly geo: GeocodificacionService) {}

  // Límite por IP para cuidar la cuota de Nominatim
  @Publico()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Dirección a coordenadas, solo en Colombia. No exige sesión',
    security: [],
  })
  @Get()
  @ApiOkResponse({ type: ResultadoGeoDto, isArray: true })
  @ApiResponse({ status: 503, type: ErrorDto, description: 'Nominatim no respondió' })
  buscar(@Query() datos: GeocodificarDto) {
    return this.geo.buscar(datos.q);
  }
}
