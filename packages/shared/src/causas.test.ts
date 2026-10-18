import {
  CATEGORIAS_CAUSA,
  cierreValido,
  dominioDe,
  ENLACES_DESAPARECIDOS,
  hoyBogota,
  mismoDominio,
  porCerrar,
  sumarMeses,
  topeCierre,
  validarUrlOficial,
} from './causas.js';

describe('fechas de una causa (pieza C, §4)', () => {
  it('hoy es la fecha en Bogotá, UTC−5', () => {
    expect(hoyBogota(new Date('2026-10-18T04:59:00Z'))).toBe('2026-10-17');
    expect(hoyBogota(new Date('2026-10-18T05:00:00Z'))).toBe('2026-10-18');
  });

  it('sumar meses recorta al último día del mes destino', () => {
    expect(sumarMeses('2026-08-31', 6)).toBe('2027-02-28');
    expect(sumarMeses('2027-08-31', 6)).toBe('2028-02-29');
    expect(sumarMeses('2026-10-17', 6)).toBe('2027-04-17');
  });

  it('el tope de cierre es hoy más 6 meses', () => {
    expect(topeCierre('2026-10-17')).toBe('2027-04-17');
  });

  it('la fecha de cierre va de hoy al tope, ambos incluidos', () => {
    expect(cierreValido('2027-04-17', '2026-10-17')).toBe(true);
    expect(cierreValido('2027-04-18', '2026-10-17')).toBe(false);
    expect(cierreValido('2026-10-16', '2026-10-17')).toBe(false);
    expect(cierreValido('2026-10-17', '2026-10-17')).toBe(true);
    expect(cierreValido('no-es-fecha', '2026-10-17')).toBe(false);
  });

  it('por cerrar son los próximos 15 días', () => {
    expect(porCerrar('2026-11-01', '2026-10-17')).toBe(true);
    expect(porCerrar('2026-11-02', '2026-10-17')).toBe(false);
    expect(porCerrar('2026-10-17', '2026-10-17')).toBe(true);
  });
});

describe('enlace oficial (pieza C, §4)', () => {
  it('acepta https y devuelve el dominio sin www', () => {
    expect(validarUrlOficial('https://www.unicef.org/colombia/donar')).toEqual({
      dominio: 'unicef.org',
    });
  });

  it.each([
    'http://unicef.org',
    'javascript:alert(1)',
    'https://u:c@unicef.org',
    'https://localhost/x',
    'no es url',
  ])('rechaza %s', (mala) => {
    expect(validarUrlOficial(mala)).toBeNull();
  });

  it('dominioDe saca el hostname en minúsculas', () => {
    expect(dominioDe('https://WWW.CruzRojaColombiana.org/')).toBe('cruzrojacolombiana.org');
    expect(dominioDe('no es url')).toBeNull();
  });

  it('mismo dominio incluye los subdominios, no los parecidos', () => {
    expect(mismoDominio('https://donar.unicef.org/x', 'https://www.unicef.org')).toBe(true);
    expect(mismoDominio('https://unicef-donar.co', 'https://www.unicef.org')).toBe(false);
    expect(mismoDominio('https://falsounicef.org', 'https://unicef.org')).toBe(false);
  });
});

describe('categorías y enlaces fijos', () => {
  it('personas desaparecidas no es una categoría de causa', () => {
    expect(CATEGORIAS_CAUSA).toEqual(['PERSONAS', 'ANIMALES', 'ADULTOS_MAYORES', 'RESCATISTAS']);
  });

  it('los tres enlaces de personas desaparecidas son https', () => {
    expect(ENLACES_DESAPARECIDOS.map((e) => e.nombre)).toEqual([
      'Unidad de Búsqueda de Personas dadas por Desaparecidas (UBPD)',
      'Cruz Roja Colombiana',
      'Medicina Legal',
    ]);
    for (const e of ENLACES_DESAPARECIDOS) expect(validarUrlOficial(e.url)).not.toBeNull();
  });
});
