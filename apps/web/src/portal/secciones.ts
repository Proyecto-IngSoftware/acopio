/** Las cinco secciones de la barra inferior, en su orden. */
export const DESTINOS = [
  { a: '/', texto: 'Inicio', icono: 'home' },
  { a: '/mapa', texto: 'Mapa', icono: 'map' },
  { a: '/causas', texto: 'Causas', icono: 'volunteer_activism' },
  { a: '/voluntariado', texto: 'Voluntariado', icono: 'groups' },
  { a: '/mas', texto: 'Más', icono: 'more_horiz' },
];

/** Índice en DESTINOS de la sección a la que pertenece una ruta, o −1. La consola se abre
 *  desde «Más» y la ficha de un acopio desde «Mapa», así que cuentan como esas secciones. */
export function seccionDe(ruta: string): number {
  if (ruta === '/') return 0;
  if (ruta.startsWith('/acopios/')) return 1;
  if (ruta.startsWith('/consola/') || ruta === '/consola') return 4;
  return DESTINOS.findIndex(({ a }) => a !== '/' && (ruta === a || ruta.startsWith(`${a}/`)));
}
