import { seccionDe } from './secciones';

it.each([
  ['/', 0],
  ['/mapa', 1],
  ['/acopios/abc', 1],
  ['/causas/x', 2],
  ['/voluntariado/123', 3],
  ['/mas', 4],
  ['/consola/turnos', 4],
  ['/privacidad', -1],
])('seccionDe(%s) = %i', (ruta, i) => expect(seccionDe(ruta)).toBe(i));
