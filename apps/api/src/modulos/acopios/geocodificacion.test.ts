import {
  GeocodificacionService,
  GeocodificadorFalso,
  type Geocodificador,
  type Reloj,
} from './geocodificacion';

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

  describe('límites (revisión final, I-2)', () => {
    /** Un geocodificador que no responde hasta que se le suelta. */
    function retenido(): Geocodificador & { consultas: number; soltar: () => void } {
      let soltar: () => void = () => undefined;
      const espera = new Promise<void>((r) => (soltar = r));
      const g = {
        consultas: 0,
        soltar: () => soltar(),
        async buscar(q: string) {
          g.consultas += 1;
          await espera;
          return [{ etiqueta: q, lat: 4.6, lng: -74.08 }];
        },
      };
      return g;
    }

    it('dos consultas iguales al mismo tiempo comparten una sola llamada', async () => {
      const g = retenido();
      const s = new GeocodificacionService(g, relojFalso());
      const a = s.buscar('Calle 1');
      const b = s.buscar('calle 1');
      g.soltar();
      await Promise.all([a, b]);
      expect(g.consultas).toBe(1);
    });

    it('con la cola llena responde 503 en vez de hacer esperar', async () => {
      const g = retenido();
      const s = new GeocodificacionService(g, relojFalso(), { cola: 2, cache: 10 });
      const enCola = [s.buscar('uno'), s.buscar('dos')];
      await expect(s.buscar('tres')).rejects.toMatchObject({
        codigo: 'GEOCODIFICACION_NO_DISPONIBLE',
        estado: 503,
      });
      g.soltar();
      await Promise.all(enCola);
      await expect(s.buscar('tres')).resolves.toHaveLength(1);
    });

    it('la caché guarda como máximo el límite y descarta la más antigua', async () => {
      const falso = new GeocodificadorFalso();
      const s = new GeocodificacionService(falso, relojFalso(), { cola: 10, cache: 2 });
      await s.buscar('uno');
      await s.buscar('dos');
      await s.buscar('tres');
      await s.buscar('dos');
      expect(falso.consultas).toBe(3);
      await s.buscar('uno');
      expect(falso.consultas).toBe(4);
    });
  });
});
