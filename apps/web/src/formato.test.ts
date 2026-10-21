import { diaLargo, diasDeLaTira, esViejo, haceCuanto, partesFecha } from './formato';

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

describe('partesFecha', () => {
  const hoy = new Date('2026-10-21T15:00:00Z'); // miércoles 21 en Bogotá
  it('día de la semana, número y mes en hora de Bogotá', () => {
    expect(partesFecha('2026-10-22T13:00:00Z', hoy)).toEqual({
      semana: 'jue',
      dia: '22',
      mes: 'oct',
      lejana: false,
    });
  });
  it('cerca de la medianoche cuenta el día de Colombia', () => {
    // 04:30 UTC del 23 son las 23:30 del 22 en Bogotá (UTC-5)
    expect(partesFecha('2026-10-23T04:30:00Z', hoy)).toMatchObject({ semana: 'jue', dia: '22' });
  });
  it('hoy + 6 está cerca y hoy + 7 ya es lejana', () => {
    expect(partesFecha('2026-10-27T15:00:00Z', hoy).lejana).toBe(false); // martes 27
    expect(partesFecha('2026-10-28T15:00:00Z', hoy).lejana).toBe(true);
  });
  it('una fecha pasada o a doce días es lejana y trae el mes', () => {
    expect(partesFecha('2026-10-20T15:00:00Z', hoy).lejana).toBe(true);
    expect(partesFecha('2026-11-02T15:00:00Z', hoy)).toEqual({
      semana: 'lun',
      dia: '2',
      mes: 'nov',
      lejana: true,
    });
  });
});

describe('diasDeLaTira', () => {
  it('arranca en Hoy y marca los días con eventos', () => {
    const dias = diasDeLaTira(new Date('2026-10-21T15:00:00Z'), 3, new Set(['2026-10-22']));
    expect(dias).toEqual([
      {
        clave: '2026-10-21',
        arriba: 'Hoy',
        numero: '21',
        nombre: 'Miércoles 21 de octubre',
        conEventos: false,
      },
      {
        clave: '2026-10-22',
        arriba: 'jue',
        numero: '22',
        nombre: 'Jueves 22 de octubre',
        conEventos: true,
      },
      {
        clave: '2026-10-23',
        arriba: 'vie',
        numero: '23',
        nombre: 'Viernes 23 de octubre',
        conEventos: false,
      },
    ]);
  });
});
