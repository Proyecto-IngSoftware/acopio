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
