import { HORARIO_VACIO, abiertoAhora } from '@acopio/shared';

it('la API importa @acopio/shared', () => {
  expect(abiertoAhora(HORARIO_VACIO, new Date())).toBe(false);
});
