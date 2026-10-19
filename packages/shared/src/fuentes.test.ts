import { datosFuente } from './fuentes.js';

describe('fuentes externas', () => {
  it('RedAcopio se nombra y se enlaza igual en la API y en la web', () => {
    expect(datosFuente('redacopio')).toEqual({
      etiqueta: 'RedAcopio Bogotá',
      url: 'https://redacopiobogota.com/',
      municipio: 'Bogotá',
    });
  });

  it('una fuente desconocida se nombra con su clave', () => {
    expect(datosFuente('otra')).toEqual({ etiqueta: 'otra', url: null, municipio: null });
  });
});
