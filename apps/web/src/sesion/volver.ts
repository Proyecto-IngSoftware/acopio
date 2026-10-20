/** La ruta de `?volver=` si es interna; si saldría del sitio o no es una ruta, null. */
export function rutaDeVuelta(valor: string | null): string | null {
  // «/\» cuenta como «//» para el navegador: también saldría del sitio
  if (!valor?.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\')) return null;
  // El navegador quita tabuladores y saltos de línea antes de leer la ruta
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(valor)) return null;
  return valor;
}
