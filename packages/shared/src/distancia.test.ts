import { distanciaKm } from './distancia.js';

it('Bogotá–Medellín está a unos 240 km en línea recta', () => {
  const km = distanciaKm({ lat: 4.711, lng: -74.0721 }, { lat: 6.2442, lng: -75.5812 });
  expect(km).toBeGreaterThan(235);
  expect(km).toBeLessThan(250);
});
