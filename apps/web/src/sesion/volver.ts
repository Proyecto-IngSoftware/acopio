/** La ruta de `?volver=` si es interna; si saldría del sitio o no es una ruta, null. */
export function rutaDeVuelta(valor: string | null): string | null {
  // «/\» cuenta como «//» para el navegador: también saldría del sitio
  if (!valor?.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return null;
  return valor;
}
