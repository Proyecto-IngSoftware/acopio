import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LIMITES_TURNOS, PERFILES_VOLUNTARIO } from '@acopio/shared';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { crearDto } from '../../comun/dto';
import { AsistenciaDto, InscritoDto, JornadaGestionDto } from '../../comun/respuestas';
import { JornadasService } from './jornadas.service';
import { ReservasService } from './reservas.service';

const fecha = z.iso.date('Usa una fecha que exista, con el formato AAAA-MM-DD');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Usa el formato HH:MM');

const contenido = z.object({
  titulo: z.string().trim().min(5).max(80),
  descripcion: z.string().trim().min(20).max(1000),
  queLlevar: z.string().trim().max(300).nullable().optional(),
  cupoMaximo: z.number().int().min(1).max(LIMITES_TURNOS.cupoMaximo),
  requisitos: z.object({
    edadMinima: z.number().int().min(12).max(99).optional(),
    ropaCerrada: z.boolean().default(false),
    carga: z.boolean().default(false),
  }),
  perfilRequerido: z.enum(PERFILES_VOLUNTARIO).nullable().optional(),
  direccion: z.string().trim().min(5).max(200).optional(),
  municipio: z.string().trim().min(2).max(80).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

const crearJornada = contenido
  .extend({
    acopioId: z.uuid().optional(),
    entidadId: z.uuid().optional(),
    fechas: z.array(fecha).min(1).max(LIMITES_TURNOS.fechasPorSerie),
    horaInicio: hora,
    horaFin: hora,
  })
  .refine((d) => !d.acopioId !== !d.entidadId, {
    message: 'La jornada es de un acopio o de una entidad',
    path: ['acopioId'],
  })
  .refine((d) => !d.entidadId || (d.direccion && d.municipio), {
    message: 'Una jornada de entidad necesita dirección y municipio',
    path: ['direccion'],
  });

const editarJornada = contenido
  .partial()
  .extend({ fecha: fecha.optional(), horaInicio: hora.optional(), horaFin: hora.optional() })
  .refine(
    (d) =>
      [d.fecha, d.horaInicio, d.horaFin].every((v) => v === undefined) ||
      [d.fecha, d.horaInicio, d.horaFin].every((v) => v !== undefined),
    { message: 'Para mover la jornada manda la fecha y las dos horas', path: ['fecha'] },
  );

class CrearJornadaDto extends crearDto(crearJornada) {}
class EditarJornadaDto extends crearDto(editarJornada) {}
class CancelarJornadaDto extends crearDto(
  z.object({ motivo: z.string().trim().min(5).max(300) }),
) {}
class AjusteCuposDto extends crearDto(z.object({ cupos: z.number().int().min(0).max(500) })) {}
class FiltroJornadasGestionDto extends crearDto(
  z.object({
    pestana: z.enum(['proximas', 'en-curso', 'pasadas']).optional(),
    acopio: z.uuid().optional(),
  }),
) {}

/** C14 Turnos: jornadas del Operador en sus acopios y del Administrador en todas. */
@ApiTags('turnos')
@ApiBearerAuth()
@Roles('ADMIN', 'OPERADOR')
@Controller('turnos/gestion/jornadas')
export class GestionController {
  constructor(
    private readonly jornadas: JornadasService,
    private readonly reservas: ReservasService,
  ) {}

  @Get(':id/reservas')
  @ApiOkResponse({ type: InscritoDto, isArray: true })
  inscritos(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservas.inscritos(u, id);
  }

  @Get()
  @ApiOkResponse({ type: JornadaGestionDto, isArray: true })
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() f: FiltroJornadasGestionDto) {
    return this.jornadas.listarGestion(u, f);
  }

  @Post()
  @ApiCreatedResponse({ type: JornadaGestionDto, isArray: true })
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() d: CrearJornadaDto) {
    return this.jornadas.crear(u, d);
  }

  @Patch(':id')
  @ApiOkResponse({ type: JornadaGestionDto })
  editar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: EditarJornadaDto,
  ) {
    return this.jornadas.editar(u, id, d);
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  @ApiOkResponse({ type: JornadaGestionDto })
  cerrar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.jornadas.cerrar(u, id);
  }

  @Post(':id/reabrir')
  @HttpCode(200)
  @ApiOkResponse({ type: JornadaGestionDto })
  reabrir(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.jornadas.reabrir(u, id);
  }

  @Post(':id/cancelar')
  @HttpCode(200)
  @ApiOkResponse({ type: JornadaGestionDto })
  cancelar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CancelarJornadaDto,
  ) {
    return this.jornadas.cancelar(u, id, d.motivo);
  }

  @Delete(':id')
  @HttpCode(204)
  async borrar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    await this.jornadas.borrar(u, id);
  }

  @Put(':id/ajuste')
  @ApiOkResponse({ type: JornadaGestionDto })
  ajustar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: AjusteCuposDto,
  ) {
    return this.jornadas.ajustar(u, id, d.cupos);
  }
}

class MarcarAsistenciaDto extends crearDto(
  z.object({ estado: z.enum(['ASISTIO', 'NO_ASISTIO']) }),
) {}

/** C14: asistencia de un inscrito, para el registro de ausentismo (RF-TUR-005). */
@ApiTags('turnos')
@ApiBearerAuth()
@Roles('ADMIN', 'OPERADOR')
@Controller('turnos/gestion/reservas')
export class ReservasGestionController {
  constructor(private readonly reservas: ReservasService) {}

  @Put(':id/asistencia')
  @ApiOkResponse({ type: AsistenciaDto })
  asistencia(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: MarcarAsistenciaDto,
  ) {
    return this.reservas.marcarAsistencia(u, id, d.estado);
  }
}
