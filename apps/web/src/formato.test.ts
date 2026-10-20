import { diaLargo, esViejo, haceCuanto } from './formato';

it('diaLargo escribe una fecha sin hora como «15 de octubre»', () => {
  expect(diaLargo('2026-10-15')).toBe('15 de octubre');
});

it.each([
  ['2026-09-30T14:59:30Z', 'hace un momento'],
  ['2026-09-30T14:48:00Z', 'hace 12 min'],
  ['2026-09-30T13:00:00Z', 'hace 2 h'],
  ['2026-09-28T15:00:00Z', 'hace 2 días'],
])('haceCuanto(%s) → %s', (fecha, esperado) => {
  expect(haceCuanto(fecha, new Date('2026-09-30T15:00:00Z'))).toBe(esperado);
});

it.each([
  ['2026-09-30T09:00:00Z', false],
  ['2026-09-30T08:59:00Z', true],
])('esViejo(%s) → %s, con más de 6 horas', (fecha, esperado) => {
  expect(esViejo(fecha, new Date('2026-09-30T15:00:00Z'))).toBe(esperado);
});
