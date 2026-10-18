/**
 * Reglas puras de los turnos de voluntariado (Bloque 5): cupos, plazos, código de reserva y
 * el archivo de calendario. Las usan la API, para validar, y la web, para mostrar.
 */

export const PERFILES_VOLUNTARIO = [
  'VETERINARIO',
  'MEDICO',
  'PSICOLOGO',
  'CUIDADOR_ADULTO_MAYOR',
  'CONDUCTOR_C2',
] as const;
export type PerfilVoluntario = (typeof PERFILES_VOLUNTARIO)[number];

/** Límites de la especificación: T-03 (cierre), T-06 (borrado) y T-12 (creación). */
export const LIMITES_TURNOS = {
  horasCierre: 12,
  horasAnticipacion: 13,
  diasHorizonte: 90,
  duracionMinHoras: 1,
  duracionMaxHoras: 12,
  cupoMaximo: 500,
  fechasPorSerie: 14,
  horasAntesAsistencia: 2,
  diasDespuesAsistencia: 7,
  diasBorrado: 30,
} as const;

const MS_HORA = 3_600_000;
const MS_DIA = 24 * MS_HORA;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Una fecha y hora de Bogotá (UTC−5 todo el año) como instante. */
export function instanteBogota(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00-05:00`);
}

export function cuposLibres(cupoMaximo: number, ocupados: number, ajuste: number): number {
  return Math.max(0, cupoMaximo - ocupados - ajuste);
}

export type MotivoSinReserva = 'CANCELADA' | 'CERRADA' | 'PLAZO' | 'LLENA' | 'ENTIDAD';

/** Por qué una jornada no acepta reservas ahora, o `null` si las acepta. */
export function motivoSinReserva(
  j: {
    estado: 'ABIERTA' | 'CERRADA' | 'CANCELADA';
    inicio: Date;
    libres: number;
    entidadVerificada: boolean;
  },
  ahora: Date,
): MotivoSinReserva | null {
  if (j.estado === 'CANCELADA') return 'CANCELADA';
  if (j.estado === 'CERRADA') return 'CERRADA';
  if (j.inicio.getTime() - ahora.getTime() <= LIMITES_TURNOS.horasCierre * MS_HORA) return 'PLAZO';
  if (j.libres <= 0) return 'LLENA';
  if (!j.entidadVerificada) return 'ENTIDAD';
  return null;
}

/** El primer problema de una jornada o serie por crear, o `null` si cumple T-12. */
export function validarJornada(
  d: { fechas: string[]; horaInicio: string; horaFin: string },
  ahora: Date,
): string | null {
  const L = LIMITES_TURNOS;
  if (d.fechas.length === 0) return 'Elige al menos una fecha';
  if (d.fechas.length > L.fechasPorSerie)
    return `Se crean hasta ${L.fechasPorSerie} fechas a la vez`;
  if (new Set(d.fechas).size !== d.fechas.length) return 'Hay fechas repetidas';
  if (!HORA.test(d.horaInicio) || !HORA.test(d.horaFin)) return 'Usa horas con el formato HH:MM';
  const hoy = new Date(ahora.getTime() - 5 * MS_HORA).toISOString().slice(0, 10);
  const tope = new Date(Date.parse(`${hoy}T00:00:00Z`) + L.diasHorizonte * MS_DIA)
    .toISOString()
    .slice(0, 10);
  for (const fecha of d.fechas) {
    if (!FECHA.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) {
      return 'Usa fechas con el formato AAAA-MM-DD';
    }
    const inicio = instanteBogota(fecha, d.horaInicio);
    const fin = instanteBogota(fecha, d.horaFin);
    const duracion = fin.getTime() - inicio.getTime();
    if (duracion <= 0) return 'La hora de fin debe ser después de la de inicio';
    if (duracion < L.duracionMinHoras * MS_HORA) return 'Una jornada dura al menos 1 hora';
    if (duracion > L.duracionMaxHoras * MS_HORA) return 'Una jornada dura como máximo 12 horas';
    if (inicio.getTime() - ahora.getTime() < L.horasAnticipacion * MS_HORA) {
      return 'Crea la jornada con al menos 13 horas de anticipación';
    }
    if (fecha > tope) return 'La fecha queda a más de 90 días';
  }
  return null;
}

export function puedeMarcarAsistencia(inicio: Date, fin: Date, ahora: Date): boolean {
  const L = LIMITES_TURNOS;
  const t = ahora.getTime();
  return (
    t >= inicio.getTime() - L.horasAntesAsistencia * MS_HORA &&
    t <= fin.getTime() + L.diasDespuesAsistencia * MS_DIA
  );
}

/** Sin 0, O, 1, I ni L, que se confunden al dictarlos o copiarlos a mano. */
export const CARACTERES_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código de 8 caracteres a partir de 8 bytes aleatorios. */
export function codigoReserva(bytes: Uint8Array): string {
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += CARACTERES_CODIGO[(bytes[i] ?? 0) % CARACTERES_CODIGO.length];
  }
  return codigo;
}

export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

const fechaIcs = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const textoIcs = (t: string) =>
  t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Un evento de calendario (RFC 5545) para «Agregar al calendario» de P8. */
export function generarIcs(e: {
  uid: string;
  titulo: string;
  lugar: string;
  descripcion: string;
  inicio: Date;
  fin: Date;
  creado: Date;
}): string {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acopio//Turnos//ES',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${fechaIcs(e.creado)}`,
    `DTSTART:${fechaIcs(e.inicio)}`,
    `DTEND:${fechaIcs(e.fin)}`,
    `SUMMARY:${textoIcs(e.titulo)}`,
    `LOCATION:${textoIcs(e.lugar)}`,
    `DESCRIPTION:${textoIcs(e.descripcion)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lineas.map((l) => `${l}\r\n`).join('');
}
