import {
  cuposLibres,
  LIMITES_TURNOS,
  motivoSinReserva,
  puedeMarcarAsistencia,
} from '@acopio/shared';
import type { Prisma } from '../../generado/prisma/client';
import type { EstadoReserva } from '../../generado/prisma/enums';

/** Las reservas que ocupan cupo: todas menos las canceladas. */
export const ESTADOS_OCUPAN: EstadoReserva[] = ['ACTIVA', 'ASISTIO', 'NO_ASISTIO'];

export const conLugar = {
  acopio: {
    select: { id: true, nombre: true, direccion: true, municipio: true, lat: true, lng: true },
  },
  entidad: { select: { id: true, nombre: true, verificacion: true } },
  _count: { select: { reservas: { where: { estado: { in: ESTADOS_OCUPAN } } } } },
} satisfies Prisma.JornadaInclude;
export type FilaJornada = Prisma.JornadaGetPayload<{ include: typeof conLugar }>;

const numero = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

/** El lugar de la jornada: el del acopio, o el que escribió quien creó la de entidad. */
function lugar(j: FilaJornada) {
  if (j.acopio) {
    return {
      tipo: 'ACOPIO' as const,
      id: j.acopio.id,
      nombre: j.acopio.nombre,
      direccion: j.acopio.direccion,
      municipio: j.acopio.municipio,
      lat: numero(j.acopio.lat),
      lng: numero(j.acopio.lng),
    };
  }
  return {
    tipo: 'ENTIDAD' as const,
    id: j.entidad!.id,
    nombre: j.entidad!.nombre,
    direccion: j.direccion ?? '',
    municipio: j.municipio ?? '',
    lat: numero(j.lat),
    lng: numero(j.lng),
  };
}

export const entidadVerificada = (j: FilaJornada) =>
  !j.entidad || j.entidad.verificacion === 'VERIFICADA';

/** Lo que ve cualquiera. Nunca trae datos de los inscritos. */
export function presentarJornadaPublica(j: FilaJornada, ahora: Date) {
  const ocupados = j._count.reservas;
  const libres = cuposLibres(j.cupo_maximo, ocupados, j.cupos_ajuste_manual);
  const motivo = motivoSinReserva(
    { estado: j.estado, inicio: j.inicio, libres, entidadVerificada: entidadVerificada(j) },
    ahora,
  );
  return {
    id: j.id,
    titulo: j.titulo,
    descripcion: j.descripcion,
    queLlevar: j.que_llevar,
    inicio: j.inicio.toISOString(),
    fin: j.fin.toISOString(),
    cierreReservas: new Date(
      j.inicio.getTime() - LIMITES_TURNOS.horasCierre * 3_600_000,
    ).toISOString(),
    cupoMaximo: j.cupo_maximo,
    ocupados,
    ajuste: j.cupos_ajuste_manual,
    ajusteActualizadoEn: j.ajuste_actualizado_en?.toISOString() ?? null,
    libres,
    requisitos: j.requisitos as { edadMinima?: number; ropaCerrada: boolean; carga: boolean },
    perfilRequerido: j.perfil_requerido,
    estado: j.estado,
    motivoCancelacion: j.motivo_cancelacion,
    aceptaReservas: motivo === null,
    motivoSinReserva: motivo,
    lugar: lugar(j),
  };
}
export type JornadaPublica = ReturnType<typeof presentarJornadaPublica>;

/** Lo que ve la consola: lo público más la serie, quién la creó y si ya se marca la asistencia. */
export function presentarJornadaGestion(j: FilaJornada, ahora: Date) {
  return {
    ...presentarJornadaPublica(j, ahora),
    puedeMarcarAsistencia:
      j.estado !== 'CANCELADA' && puedeMarcarAsistencia(j.inicio, j.fin, ahora),
    serieId: j.serie_id,
    creadaPor: j.creada_por,
    creadoEn: j.creado_en.toISOString(),
  };
}
export type JornadaGestion = ReturnType<typeof presentarJornadaGestion>;
