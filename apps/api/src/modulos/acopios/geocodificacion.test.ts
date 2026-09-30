import { GeocodificacionService, GeocodificadorFalso, type Reloj } from './geocodificacion';

function relojFalso(): Reloj & { esperas: number[] } {
  let t = 0;
  const esperas: number[] = [];
  return {
    esperas,
    ahora: () => t,
    esperar: async (ms) => {
      esperas.push(ms);
      t += ms;
    },
  };
}

describe('GeocodificacionService', () => {
  it('la caché evita consultar dos veces lo mismo', async () => {
    const falso = new GeocodificadorFalso();
    const s = new GeocodificacionService(falso, relojFalso());
    await s.buscar('Carrera 7 # 40-62, Bogotá');
    await s.buscar('  carrera 7 # 40-62, bogotá ');
    expect(falso.consultas).toBe(1);
  });

  it('entre dos consultas distintas espera al menos 1 segundo', async () => {
    const reloj = relojFalso();
    const s = new GeocodificacionService(new GeocodificadorFalso(), reloj);
    await s.buscar('uno');
    await s.buscar('dos');
    expect(reloj.esperas).toEqual([1000]);
  });

  it('la caché vence a las 24 horas', async () => {
    const reloj = relojFalso();
    const falso = new GeocodificadorFalso();
    const s = new GeocodificacionService(falso, reloj);
    await s.buscar('uno');
    await reloj.esperar(24 * 60 * 60 * 1000 + 1);
    await s.buscar('uno');
    expect(falso.consultas).toBe(2);
  });
});
