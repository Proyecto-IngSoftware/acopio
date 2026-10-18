import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PERFILES_VOLUNTARIO } from '@acopio/shared';
import { z } from 'zod';
import { Publico } from '../../comun/autorizacion/decoradores';
import { crearDto } from '../../comun/dto';
import { JornadaPublicaDto, ReservaCreadaDto, ReservaPublicaDto } from '../../comun/respuestas';
import { JornadasService } from './jornadas.service';
import { ReservasService } from './reservas.service';

class ReservarDto extends crearDto(
  z.object({
    nombre: z.string().trim().min(2).max(120),
    correo: z.string().trim().pipe(z.email().max(254)),
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+ -]{7,20}$/, 'Escribe solo números, espacios, + o -')
      .optional(),
    perfilDeclarado: z.boolean().default(false),
    consentimiento: z.literal(true).describe('Acepta el tratamiento de datos (Ley 1581)'),
  }),
) {}

const dia = z.iso.date('Usa una fecha que exista, con el formato AAAA-MM-DD');

class FiltroJornadasPublicoDto extends crearDto(
  z.object({
    desde: dia.optional(),
    hasta: dia.optional(),
    acopio: z.uuid().optional(),
    entidad: z.uuid().optional(),
    perfil: z.enum(PERFILES_VOLUNTARIO).optional(),
  }),
) {}

class SecretoDto extends crearDto(z.object({ secreto: z.string().min(1).max(100) })) {}

/** P7 y P8: reservar, consultar y cancelar sin cuenta (RF-TUR-003, RF-TUR-004). */
@ApiTags('turnos')
@Publico()
@Controller('turnos')
export class PublicoController {
  constructor(
    private readonly reservas: ReservasService,
    private readonly jornadas: JornadasService,
  ) {}

  @Get('jornadas')
  @ApiOkResponse({ type: JornadaPublicaDto, isArray: true })
  listar(@Query() f: FiltroJornadasPublicoDto) {
    return this.jornadas.listarPublicas(f);
  }

  @Get('jornadas/:id')
  @ApiOkResponse({ type: JornadaPublicaDto })
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.jornadas.obtenerPublica(id);
  }

  @Post('jornadas/:id/reservas')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ type: ReservaCreadaDto })
  reservar(@Param('id', ParseUUIDPipe) id: string, @Body() d: ReservarDto) {
    return this.reservas.reservar(id, d);
  }

  @Post('reservas/:codigo/consultar')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: ReservaPublicaDto })
  consultar(@Param('codigo') c: string, @Body() d: SecretoDto) {
    return this.reservas.consultar(c, d.secreto);
  }

  @Post('reservas/:codigo/cancelar')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOkResponse({ type: ReservaPublicaDto })
  cancelar(@Param('codigo') c: string, @Body() d: SecretoDto) {
    return this.reservas.cancelar(c, d.secreto);
  }
}
