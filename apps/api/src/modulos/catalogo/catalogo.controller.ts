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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Roles, UsuarioActual } from '../../comun/autorizacion/decoradores';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { CanastaService } from './canasta.service';
import { CategoriasService } from './categorias.service';
import { EmergenciasService, hoyEnBogota } from './emergencias.service';

const grupo = z.enum([
  'ALIMENTOS',
  'AGUA_Y_BEBIDAS',
  'ASEO_PERSONAL',
  'ASEO_DEL_HOGAR',
  'SALUD',
  'ROPA_Y_ABRIGO',
  'BEBE',
  'ADULTO_MAYOR',
  'ANIMALES',
  'HERRAMIENTAS',
]);
const nombre = z.string().trim().min(1).max(80);
const sinonimos = z.array(z.string().trim().min(1).max(60)).max(30);
const fecha = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));

class FiltroCategoriasDto extends createZodDto(
  z.object({ grupo: grupo.optional(), incluirArchivadas: z.stringbool().default(false) }),
) {}
class BuscarDto extends createZodDto(
  z.object({
    q: z.string().trim().min(1).max(60),
    limite: z.coerce.number().int().min(1).max(30).default(10),
  }),
) {}
class CrearCategoriaDto extends createZodDto(
  z.object({
    nombre,
    grupo,
    unidadBase: z.enum(['LITRO', 'KILOGRAMO', 'UNIDAD']),
    perecedero: z.boolean().default(false),
    sinonimos: sinonimos.default([]),
  }),
) {}
class ActualizarCategoriaDto extends createZodDto(
  z.object({
    nombre: nombre.optional(),
    grupo: grupo.optional(),
    perecedero: z.boolean().optional(),
    sinonimos: sinonimos.optional(),
  }),
) {}
class VersionCanastaDto extends createZodDto(
  z.object({
    cantidadPersonaDia: z.number().positive(),
    fuente: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe('Obligatoria: Esfera, UNGRD, Cruz Roja u otra'),
    vigenteDesde: fecha.optional(),
  }),
) {}
class FiltroEmergenciasDto extends createZodDto(
  z.object({ estado: z.enum(['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA']).optional() }),
) {}
class CrearEmergenciaDto extends createZodDto(
  z.object({
    nombre: z.string().trim().min(1).max(120),
    tipo: z.string().trim().min(1).max(60),
    inicio: fecha,
    horizonteDias: z.number().int().min(1).max(365).optional(),
    destacadaHasta: fecha,
  }),
) {}
class ActualizarEmergenciaDto extends createZodDto(CrearEmergenciaDto.schema.partial()) {}
class CerrarEmergenciaDto extends createZodDto(
  z.object({ motivo: z.string().trim().min(10).max(500) }),
) {}

/** Catálogo maestro (C18): categorías, canasta estándar y emergencias. */
@ApiTags('catálogo')
@ApiBearerAuth()
@Controller()
export class CatalogoController {
  constructor(
    private readonly categorias: CategoriasService,
    private readonly canasta: CanastaService,
    private readonly emergencias: EmergenciasService,
  ) {}

  // ── Categorías ──

  @Get('categorias')
  listarCategorias(@Query() filtro: FiltroCategoriasDto) {
    return this.categorias.listar(filtro);
  }

  /** Búsqueda por palabra clave para la entrada rápida (RF-CAT-002). */
  @Get('categorias/buscar')
  buscar(@Query() datos: BuscarDto) {
    return this.categorias.buscar(datos.q, datos.limite);
  }

  @Get('categorias/:id')
  obtenerCategoria(@Param('id', ParseUUIDPipe) id: string) {
    return this.categorias.obtener(id);
  }

  @Roles('ADMIN')
  @Post('categorias')
  crearCategoria(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearCategoriaDto) {
    return this.categorias.crear(admin, datos);
  }

  @Roles('ADMIN')
  @Patch('categorias/:id')
  actualizarCategoria(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarCategoriaDto,
  ) {
    return this.categorias.actualizar(admin, id, cambios);
  }

  @Roles('ADMIN')
  @Post('categorias/:id/archivar')
  archivar(@UsuarioActual() admin: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.categorias.archivar(admin, id, true);
  }

  @Roles('ADMIN')
  @Post('categorias/:id/reactivar')
  reactivarCategoria(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categorias.archivar(admin, id, false);
  }

  /** Solo si nunca se usó; si no, 409 CATEGORIA_EN_USO y se archiva. */
  @Roles('ADMIN')
  @Delete('categorias/:id')
  @HttpCode(204)
  eliminarCategoria(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categorias.eliminar(admin, id);
  }

  // ── Canasta estándar ──

  /** La canasta vigente hoy, con la fuente de cada valor (RF-CAT-003). */
  @Get('canasta')
  canastaVigente() {
    return this.canasta.vigente();
  }

  @Get('categorias/:id/canasta')
  historialCanasta(@Param('id', ParseUUIDPipe) id: string) {
    return this.canasta.historial(id);
  }

  /** Agrega una versión; las anteriores no se tocan. */
  @Roles('ADMIN')
  @Post('categorias/:id/canasta')
  agregarVersion(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: VersionCanastaDto,
  ) {
    return this.canasta.agregarVersion(admin, id, {
      cantidadPersonaDia: datos.cantidadPersonaDia,
      fuente: datos.fuente,
      vigenteDesde: datos.vigenteDesde ?? hoyEnBogota(),
    });
  }

  // ── Emergencias ──

  @Get('emergencias')
  listarEmergencias(@Query() filtro: FiltroEmergenciasDto) {
    return this.emergencias.listar(filtro.estado);
  }

  @Roles('ADMIN')
  @Post('emergencias')
  crearEmergencia(@UsuarioActual() admin: UsuarioAutenticado, @Body() datos: CrearEmergenciaDto) {
    return this.emergencias.crear(admin, datos);
  }

  @Roles('ADMIN')
  @Patch('emergencias/:id')
  actualizarEmergencia(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cambios: ActualizarEmergenciaDto,
  ) {
    return this.emergencias.actualizar(admin, id, cambios);
  }

  @Roles('ADMIN')
  @Post('emergencias/:id/cerrar')
  cerrarEmergencia(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: CerrarEmergenciaDto,
  ) {
    return this.emergencias.cerrar(admin, id, datos.motivo);
  }
}
