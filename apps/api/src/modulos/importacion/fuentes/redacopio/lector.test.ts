import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerHerramientas, leerPortada } from './lector';

const copia = (archivo: string) => readFileSync(join(__dirname, 'copia', archivo), 'utf8');
const portada = copia('portada.html');

describe('lector de RedAcopio', () => {
  it('la copia del 18 de octubre trae 88 puntos verificados', () => {
    const puntos = leerPortada(portada);
    expect(puntos).toHaveLength(88);
    expect(puntos.every((p) => p.verificado)).toBe(true);
  });

  it('lee cada punto con los datos de la fuente', () => {
    const sugoi = leerPortada(portada).find(
      (p) => p.fuenteId === 'fd840234-0f35-49db-8851-de749d3407f8',
    );
    expect(sugoi).toMatchObject({
      nombre: 'Sugoi Taller Creativo',
      lat: 4.713287,
      estado: 'cerrado',
      horario: '10:00 am - 7:00pm',
    });
    expect(sugoi!.necesidades[0]).toEqual({ nivel: 'urgente', texto: 'Camión' });
  });

  it('cuenta los estados de la copia: 55 abiertos, 31 cerrados, 1 lleno y 1 sin información', () => {
    const conteo: Record<string, number> = {};
    for (const p of leerPortada(portada)) conteo[p.estado] = (conteo[p.estado] ?? 0) + 1;
    expect(conteo).toEqual({ abierto: 55, cerrado: 31, lleno: 1, sin_info: 1 });
  });

  it('lee las 9 plataformas de la página de herramientas', () => {
    const plataformas = leerHerramientas(copia('herramientas.html'));
    expect(plataformas).toHaveLength(9);
    expect(plataformas[0]).toMatchObject({
      nombre: 'Reconstruyo Colombia',
      categoria: 'Donaciones',
      url: 'https://reconstruyocolombia.com/',
      orden: 1,
    });
  });

  it('un HTML sin los datos de la página aborta con FORMATO_FUENTE', () => {
    expect(() => leerPortada('<html><body>Mantenimiento</body></html>')).toThrow(
      expect.objectContaining({ codigo: 'FORMATO_FUENTE' }),
    );
  });

  it('un punto sin latitud aborta todo y dice cuál', () => {
    const roto = portada.replace('\\"lat\\":4.713287', '\\"lat\\":null');
    expect(roto).not.toBe(portada);
    expect(() => leerPortada(roto)).toThrow(
      expect.objectContaining({
        codigo: 'FORMATO_FUENTE',
        message: expect.stringContaining('fd840234-0f35-49db-8851-de749d3407f8'),
      }),
    );
  });

  it('una página de herramientas sin tarjetas aborta con FORMATO_FUENTE', () => {
    expect(() => leerHerramientas('<html></html>')).toThrow(
      expect.objectContaining({ codigo: 'FORMATO_FUENTE' }),
    );
  });
});
