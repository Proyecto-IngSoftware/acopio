import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Esquemas de respuesta para el contrato OpenAPI. Describen lo que devuelve la API;
 * no validan en tiempo de ejecución. Si cambia una respuesta, se cambia aquí y se
 * regenera docs/03-diseno/api/openapi.json.
 */
const rol = z.enum(['ADMIN', 'OPERADOR', 'AUDITOR', 'RECEPTOR', 'DONADOR']);
const tipoUbicacion = z.enum(['ACOPIO', 'ZONA']);
const fecha = z.iso.datetime();

export class ErrorDto extends createZodDto(
  z.object({
    estado: z.number().int(),
    codigo: z.string().describe('Código estable para la interfaz, por ejemplo ULTIMO_ADMIN'),
    mensaje: z.string().describe('Mensaje en español, listo para mostrar'),
    detalles: z
      .union([
        z.array(z.object({ campo: z.string(), mensaje: z.string() })),
        z.record(z.string(), z.unknown()),
      ])
      .optional()
      .describe(
        'En errores de validación, un mensaje por campo. En algunos errores de dominio, datos para la interfaz (SALDO_INSUFICIENTE trae { saldo })',
      ),
  }),
) {}

export class SesionDto extends createZodDto(
  z.object({
    expiraEn: fecha,
    usuario: z.object({ id: z.uuid(), username: z.string().nullable(), nombre: z.string(), rol }),
  }),
) {}

export class YoDto extends createZodDto(
  z.object({
    id: z.uuid(),
    username: z.string().nullable(),
    nombre: z.string(),
    rol,
    alcanceGlobal: z.boolean().describe('El Administrador actúa sobre todas las ubicaciones'),
    asignaciones: z.array(z.object({ tipo: tipoUbicacion, ubicacionId: z.uuid() })),
  }),
) {}

export const esquemaUsuario = z.object({
  id: z.uuid(),
  username: z.string().nullable(),
  nombre: z.string(),
  correo: z.string().nullable().describe('Nulo si no tiene correo real'),
  sinCorreoReal: z.boolean(),
  rol,
  estado: z.enum(['INVITADO', 'ACTIVO', 'SUSPENDIDO']),
  creadoEn: fecha,
  asignaciones: z.array(
    z.object({
      tipo: tipoUbicacion,
      ubicacionId: z.uuid(),
      asignadoPor: z.uuid(),
      asignadoEn: fecha,
    }),
  ),
  invitacionPendiente: z.object({ venceEn: fecha }).nullable(),
  restablecimientoPendiente: z.object({ venceEn: fecha }).nullable(),
});
export class UsuarioDto extends createZodDto(esquemaUsuario) {}

export const esquemaEnlace = z.object({
  enlace: z.string().describe('APP_URL/invitacion/<token>. Copiable para WhatsApp'),
  venceEn: fecha,
});
export class EnlaceInvitacionDto extends createZodDto(esquemaEnlace) {}

export class UsuarioCreadoDto extends createZodDto(
  z.object({ usuario: esquemaUsuario, invitacion: esquemaEnlace }),
) {}

export class InvitacionPublicaDto extends createZodDto(
  z.object({
    username: z.string().nullable(),
    nombre: z.string(),
    rol,
    esRestablecimiento: z.boolean(),
    venceEn: fecha,
    asignaciones: z.array(z.object({ tipo: tipoUbicacion, ubicacionId: z.uuid() })),
  }),
) {}

export class CanjeDto extends createZodDto(z.object({ username: z.string().nullable() })) {}

export class RevocadasDto extends createZodDto(z.object({ revocadas: z.number().int() })) {}

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
const unidad = z.enum(['LITRO', 'KILOGRAMO', 'UNIDAD']);

export class CategoriaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    nombre: z.string(),
    grupo,
    unidadBase: unidad,
    perecedero: z.boolean(),
    sinonimos: z.array(z.string()),
    archivada: z.boolean(),
  }),
) {}

export class ResultadoBusquedaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    nombre: z.string(),
    grupo,
    unidadBase: unidad,
    perecedero: z.boolean(),
    puntaje: z.number().describe('0 a 1; mayor es mejor coincidencia'),
  }),
) {}

export class CanastaVigenteDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    categoria: z.string(),
    unidadBase: unidad,
    cantidadPersonaDia: z.number(),
    fuente: z.string(),
    vigenteDesde: fecha,
  }),
) {}

export class VersionCanastaRespuestaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    cantidadPersonaDia: z.number(),
    fuente: z.string(),
    vigenteDesde: fecha,
  }),
) {}

export class EmergenciaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    nombre: z.string(),
    tipo: z.string(),
    inicio: fecha,
    horizonteDias: z.number().int(),
    estado: z.enum(['ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA']),
    destacadaHasta: fecha,
    cerradaEn: fecha.nullable(),
    motivoCierre: z.string().nullable(),
  }),
) {}

export class PaginaBitacoraDto extends createZodDto(
  z.object({
    total: z.number().int(),
    pagina: z.number().int(),
    porPagina: z.number().int(),
    registros: z.array(
      z.object({
        id: z.uuid(),
        usuario_id: z.uuid().nullable(),
        accion: z.string(),
        entidad: z.string(),
        entidad_id: z.string().nullable(),
        ubicacion_id: z.uuid().nullable(),
        datos_antes: z.unknown().nullable(),
        datos_despues: z.unknown().nullable(),
        destacado: z.boolean(),
        ocurrido_en: fecha,
        usuario: z
          .object({ id: z.uuid(), username: z.string().nullable(), nombre: z.string() })
          .nullable(),
      }),
    ),
  }),
) {}

export class SaludDto extends createZodDto(
  z.object({ estado: z.literal('ok'), base: z.literal('ok') }),
) {}

export class EntidadDto extends createZodDto(
  z.object({
    id: z.uuid(),
    nombre: z.string(),
    tipo: z.string(),
    nit: z.string().nullable(),
    sitioWeb: z.string().nullable(),
    telefono: z.string().nullable(),
    correo: z.string().nullable(),
    descripcion: z.string().nullable(),
    verificacion: z.enum(['SIN_VERIFICAR', 'VERIFICADA', 'RECHAZADA']),
  }),
) {}

const tramo = z.object({ abre: z.string(), cierra: z.string() });
const horario = z.object({
  dom: z.array(tramo),
  lun: z.array(tramo),
  mar: z.array(tramo),
  mie: z.array(tramo),
  jue: z.array(tramo),
  vie: z.array(tramo),
  sab: z.array(tramo),
});
const estadoAcopio = z.enum(['ACTIVO', 'PAUSADO', 'CERRADO']);

export class AcopioPublicoDto extends createZodDto(
  z.object({
    id: z.uuid(),
    nombre: z.string(),
    entidad: z.object({ id: z.uuid(), nombre: z.string() }),
    direccion: z.string(),
    municipio: z.string(),
    lat: z.number(),
    lng: z.number(),
    telefono: z.string().nullable(),
    indicacionesAcceso: z.string().nullable(),
    horario,
    estado: estadoAcopio,
    abiertoAhora: z.boolean(),
    actualizadoEn: fecha,
    distanciaKm: z.number().optional(),
  }),
) {}

export class AcopioDto extends createZodDto(AcopioPublicoDto.schema.extend({ creadoEn: fecha })) {}

export class ZonaDto extends createZodDto(
  z.object({
    id: z.uuid(),
    emergenciaId: z.uuid(),
    nombre: z.string(),
    municipio: z.string(),
    lat: z.number(),
    lng: z.number(),
    poblacionEstimada: z.number().int(),
    poblacionFuente: z.string(),
    poblacionFecha: fecha,
    estado: z.enum(['SIN_ATENDER', 'EN_ATENCION', 'CUBIERTA']),
    actualizadoEn: fecha,
  }),
) {}

export class UbicacionDto extends createZodDto(
  z.object({
    tipo: tipoUbicacion,
    id: z.uuid(),
    nombre: z.string(),
    municipio: z.string(),
    estado: z.string().describe('Estado del acopio o de la zona'),
  }),
) {}

export class ResultadoGeoDto extends createZodDto(
  z.object({ etiqueta: z.string(), lat: z.number(), lng: z.number() }),
) {}

const dia = z.iso.date();

export class NoRecibirDto extends createZodDto(
  z.object({
    categoriaId: z.uuid(),
    categoria: z.string(),
    hasta: dia.nullable(),
    marcadoEn: fecha,
  }),
) {}

export class AcopioNoRecibeDto extends createZodDto(
  z.object({ acopioId: z.uuid(), hasta: dia.nullable() }),
) {}

const tipoMovimiento = z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']);
const motivoSalida = z.enum(['ENTREGA_FAMILIAS', 'TRASLADO', 'VENCIDO', 'OTRO']);

export class MovimientoDto extends createZodDto(
  z.object({
    id: z.uuid(),
    tipo: tipoMovimiento,
    categoriaId: z.uuid(),
    cantidad: z.number().describe('Siempre positiva; el signo lo da el tipo'),
    signo: z.union([z.literal(1), z.literal(-1)]),
    motivoSalida: motivoSalida.nullable(),
    nota: z.string().nullable(),
    motivo: z.string().nullable(),
    venceEn: dia.nullable(),
    ocurridoEn: fecha,
    registradoEn: fecha,
    origenOffline: z.boolean(),
  }),
) {}

export class ResultadoMovimientoDto extends createZodDto(
  z.object({
    movimiento: MovimientoDto.schema,
    saldo: z.number().describe('Saldo de la categoría en el acopio después del movimiento'),
    noRecibe: z.boolean().describe('La categoría está marcada «no recibir» en el acopio'),
  }),
) {}
