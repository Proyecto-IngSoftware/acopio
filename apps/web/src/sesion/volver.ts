/** La ruta de `?volver=` si es interna; si saldría del sitio o no es una ruta, null. */
export function rutaDeVuelta(valor: string | null): string | null {
  if (!valor?.startsWith('/') || valor.startsWith('//')) return null;
  return valor;
}
