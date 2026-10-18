import {
  CARACTERES_CODIGO,
  codigoReserva,
  cuposLibres,
  generarIcs,
  instanteBogota,
  LIMITES_TURNOS,
  motivoSinReserva,
  normalizarCorreo,
  PERFILES_VOLUNTARIO,
  puedeMarcarAsistencia,
  validarJornada,
} from './turnos.js';

/** Lunes 19 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = new Date('2026-10-19T15:00:00Z');
const HORA = 3_600_000;

describe('turnos', () => {
  it('constantes de la especificación (T-03, T-06, T-12)', () => {
    expect(PERFILES_VOLUNTARIO).toEqual([
      'VETERINARIO',
      'MEDICO',
      'PSICOLOGO',
      'CUIDADOR_ADULTO_MAYOR',
      'CONDUCTOR_C2',
    ]);
    expect(LIMITES_TURNOS.horasCierre).toBe(12);
    expect(LIMITES_TURNOS.horasAnticipacion).toBe(13);
    expect(LIMITES_TURNOS.diasBorrado).toBe(30);
  });

  it('instanteBogota pasa una fecha y hora de Bogotá a UTC', () => {
    expect(instanteBogota('2026-10-21', '08:00').toISOString()).toBe('2026-10-21T13:00:00.000Z');
    expect(instanteBogota('2026-10-21', '23:30').toISOString()).toBe('2026-10-22T04:30:00.000Z');
  });

  it('cuposLibres descuenta ocupados y ajuste, sin bajar de cero', () => {
    expect(cuposLibres(10, 7, 2)).toBe(1);
    expect(cuposLibres(10, 9, 3)).toBe(0);
  });

  it('motivoSinReserva: el plazo de 12 horas es estricto', () => {
    const base = { estado: 'ABIERTA', libres: 3, entidadVerificada: true } as const;
    const lejos = new Date('2026-10-25T13:00:00Z');
    expect(
      motivoSinReserva({ ...base, inicio: new Date(AHORA.getTime() + 12 * HORA) }, AHORA),
    ).toBe('PLAZO');
    expect(
      motivoSinReserva({ ...base, inicio: new Date(AHORA.getTime() + 12 * HORA + 60_000) }, AHORA),
    ).toBeNull();
    expect(
      motivoSinReserva({ ...base, estado: 'CANCELADA', libres: 0, inicio: lejos }, AHORA),
    ).toBe('CANCELADA');
    expect(motivoSinReserva({ ...base, estado: 'CERRADA', inicio: lejos }, AHORA)).toBe('CERRADA');
    expect(motivoSinReserva({ ...base, libres: 0, inicio: lejos }, AHORA)).toBe('LLENA');
    expect(motivoSinReserva({ ...base, entidadVerificada: false, inicio: lejos }, AHORA)).toBe(
      'ENTIDAD',
    );
  });

  it('validarJornada aplica los límites de T-12', () => {
    const v = (fechas: string[], horaInicio: string, horaFin: string) =>
      validarJornada({ fechas, horaInicio, horaFin }, AHORA);
    expect(v(['2026-10-21'], '08:00', '12:00')).toBeNull();
    // Con el reloj a las 14:00 de Bogotá, las 03:00 del día siguiente quedan a 13 horas exactas
    const tarde = new Date('2026-10-19T19:00:00Z');
    expect(
      validarJornada({ fechas: ['2026-10-20'], horaInicio: '03:00', horaFin: '05:00' }, tarde),
    ).toBeNull();
    expect(
      validarJornada({ fechas: ['2026-10-20'], horaInicio: '02:59', horaFin: '05:00' }, tarde),
    ).not.toBeNull();
    expect(v(['2026-10-19'], '22:00', '23:30')).not.toBeNull();
    // 19 de octubre + 90 días = 17 de enero
    expect(v(['2027-01-17'], '08:00', '12:00')).toBeNull();
    expect(v(['2027-01-18'], '08:00', '12:00')).not.toBeNull();
    expect(v(['2026-10-21'], '08:00', '08:30')).not.toBeNull();
    expect(v(['2026-10-21'], '08:00', '20:01')).not.toBeNull();
    expect(v(['2026-10-21'], '12:00', '08:00')).not.toBeNull();
    expect(v(['2026-10-21', '2026-10-21'], '08:00', '12:00')).not.toBeNull();
    const quince = Array.from(
      { length: 15 },
      (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`,
    );
    expect(v(quince, '08:00', '12:00')).not.toBeNull();
    expect(v(quince.slice(0, 14), '08:00', '12:00')).toBeNull();
    expect(v([], '08:00', '12:00')).not.toBeNull();
    expect(v(['2026-10-21'], '8:00', '12:00')).not.toBeNull();
  });

  it('puedeMarcarAsistencia: desde 2 horas antes hasta 7 días después del fin', () => {
    const ini = new Date('2026-10-21T13:00:00Z');
    const fin = new Date('2026-10-21T17:00:00Z');
    expect(puedeMarcarAsistencia(ini, fin, new Date('2026-10-21T10:59:00Z'))).toBe(false);
    expect(puedeMarcarAsistencia(ini, fin, new Date('2026-10-21T11:00:00Z'))).toBe(true);
    expect(puedeMarcarAsistencia(ini, fin, new Date('2026-10-28T17:00:00Z'))).toBe(true);
    expect(puedeMarcarAsistencia(ini, fin, new Date('2026-10-28T17:01:00Z'))).toBe(false);
  });

  it('codigoReserva: 8 caracteres sin ambiguos', () => {
    expect(CARACTERES_CODIGO).toHaveLength(31);
    expect(codigoReserva(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 31]))).toBe('ABCDEFGA');
    expect(codigoReserva(crypto.getRandomValues(new Uint8Array(8)))).toMatch(
      /^[A-HJKMNP-Z2-9]{8}$/,
    );
  });

  it('normalizarCorreo', () => {
    expect(normalizarCorreo('  Ana@Correo.CO ')).toBe('ana@correo.co');
  });

  it('generarIcs arma un evento RFC 5545 con los textos escapados', () => {
    const ics = generarIcs({
      uid: 'ABCD2345@acopio',
      titulo: 'Clasificar ropa, turno mañana',
      lugar: 'Calle 1; Bogotá',
      descripcion: 'Trae guantes\ny agua',
      inicio: new Date('2026-10-21T13:00:00Z'),
      fin: new Date('2026-10-21T17:00:00Z'),
      creado: AHORA,
    });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:ABCD2345@acopio\r\n');
    expect(ics).toContain('DTSTAMP:20261019T150000Z\r\n');
    expect(ics).toContain('DTSTART:20261021T130000Z\r\n');
    expect(ics).toContain('DTEND:20261021T170000Z\r\n');
    expect(ics).toContain('SUMMARY:Clasificar ropa\\, turno mañana\r\n');
    expect(ics).toContain('LOCATION:Calle 1\\; Bogotá\r\n');
    expect(ics).toContain('DESCRIPTION:Trae guantes\\ny agua\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
});
