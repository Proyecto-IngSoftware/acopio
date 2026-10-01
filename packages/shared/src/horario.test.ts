import {
  abiertoAhora,
  erroresHorario,
  HORARIO_VACIO,
  tramoActual,
  type Horario,
} from './horario.js';

// 2026-10-05 es lunes. Bogotá está en UTC−5 todo el año
const lunes = (horaUtc: string) => new Date(`2026-10-05T${horaUtc}:00Z`);
const horario: Horario = {
  ...HORARIO_VACIO,
  lun: [
    { abre: '08:00', cierra: '12:00' },
    { abre: '14:00', cierra: '18:00' },
  ],
};

describe('abiertoAhora', () => {
  it.each([
    ['13:00', true], // 08:00 en Bogotá: justo abre
    ['16:59', true], // 11:59
    ['17:00', false], // 12:00: justo cierra
    ['18:30', false], // 13:30, entre tramos
    ['19:00', true], // 14:00
  ])('lunes a las %s UTC → %s', (hora, esperado) => {
    expect(abiertoAhora(horario, lunes(hora))).toBe(esperado);
  });

  it('usa el día de Bogotá, no el de UTC', () => {
    // Martes 03:30 UTC es lunes 22:30 en Bogotá
    const tarde: Horario = { ...HORARIO_VACIO, lun: [{ abre: '20:00', cierra: '23:00' }] };
    expect(abiertoAhora(tarde, new Date('2026-10-06T03:30:00Z'))).toBe(true);
  });

  it('un día sin tramos está cerrado', () => {
    expect(abiertoAhora(HORARIO_VACIO, lunes('15:00'))).toBe(false);
  });
});

describe('erroresHorario', () => {
  it('un horario bien hecho no tiene errores', () => {
    expect(erroresHorario(horario)).toEqual([]);
  });

  it.each([
    [[{ abre: '12:00', cierra: '08:00' }], 'lun: el tramo 12:00–08:00 cierra antes de abrir'],
    [[{ abre: '08:00', cierra: '08:00' }], 'lun: el tramo 08:00–08:00 cierra antes de abrir'],
    [
      [{ abre: '08:00', cierra: '24:00' }],
      'lun: «24:00» no es una hora válida (HH:MM, hasta 23:59)',
    ],
    [
      [
        { abre: '08:00', cierra: '12:00' },
        { abre: '11:00', cierra: '13:00' },
      ],
      'lun: los tramos 08:00–12:00 y 11:00–13:00 se cruzan',
    ],
  ])('%j → %s', (tramos, mensaje) => {
    expect(erroresHorario({ ...HORARIO_VACIO, lun: tramos })).toEqual([mensaje]);
  });
});

describe('tramoActual', () => {
  it('devuelve el tramo abierto en ese instante, para decir a qué hora cierra', () => {
    expect(tramoActual(horario, lunes('16:00'))).toEqual({ abre: '08:00', cierra: '12:00' });
  });

  it('entre tramos o en un día sin tramos no hay tramo actual', () => {
    expect(tramoActual(horario, lunes('18:30'))).toBeUndefined();
    expect(tramoActual(HORARIO_VACIO, lunes('16:00'))).toBeUndefined();
  });
});
