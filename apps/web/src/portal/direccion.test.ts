import { direccionEntre } from './direccion';

it.each([
  [null, '/', 'PUSH', 'ninguna'],
  ['/', '/', 'PUSH', 'ninguna'],
  ['/voluntariado/1', '/voluntariado', 'POP', 'atras'],
  ['/', '/mapa', 'PUSH', 'adelante'],
  ['/voluntariado', '/causas', 'PUSH', 'atras'],
  ['/voluntariado', '/voluntariado/1', 'PUSH', 'adelante'],
  ['/consola/turnos/1', '/consola/turnos', 'PUSH', 'atras'],
  ['/privacidad', '/seguimiento', 'PUSH', 'adelante'],
] as const)('de %s a %s (%s) es %s', (anterior, actual, tipo, esperado) => {
  expect(direccionEntre(anterior, actual, tipo)).toBe(esperado);
});
