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
