/** «15 de octubre», para fechas sin hora como `2026-10-15`. */
export function diaLargo(fecha: string): string {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

/** Antigüedad visible de un dato operativo (RNF-04): «hace 12 min», «hace 2 h». */
export function haceCuanto(fecha: string, ahora = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60_000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

/** Un dato operativo con más de 6 horas se atenúa y lleva advertencia (RNF-04). */
export function esViejo(fecha: string, ahora = new Date()): boolean {
  return ahora.getTime() - new Date(fecha).getTime() > 6 * 3600_000;
}

/** «3 oct, 9:12 a. m.», en hora de Colombia sin importar la zona del navegador. */
export function fechaHora(fecha: string): string {
  const texto = new Date(fecha).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return texto.replace(' de ', ' ');
}

/** «12 de agosto de 2026», en Colombia. Acepta `2026-08-12` o una fecha con hora. */
export function diaConAnio(fecha: string): string {
  const instante = fecha.length === 10 ? `${fecha}T12:00:00-05:00` : fecha;
  return new Date(instante).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const BOGOTA = 'America/Bogota';
// Algunas versiones de ICU separan «a. m.» con espacios finos; la interfaz usa espacios comunes
const espacios = (t: string) => t.replace(/[\u00a0\u202f]/g, ' ');

/** «8:00 a. m.», en hora de Colombia sin importar la zona del navegador. */
export function hora(fecha: string): string {
  return espacios(
    new Date(fecha).toLocaleTimeString('es-CO', {
      timeZone: BOGOTA,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  );
}

/** «8:00 a. m. – 12:00 p. m.» */
export const rangoHoras = (inicio: string, fin: string) => `${hora(inicio)} – ${hora(fin)}`;

/** `2026-10-21`: el día de Colombia en que cae un instante. */
export function diaBogota(fecha: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA }).format(new Date(fecha));
}

/** «Miércoles 21 de octubre», el día de Colombia en que cae un instante. */
export function diaSemana(fecha: string): string {
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: BOGOTA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(new Date(fecha));
  const de = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  const dia = de('weekday');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${de('day')} de ${de('month')}`;
}
