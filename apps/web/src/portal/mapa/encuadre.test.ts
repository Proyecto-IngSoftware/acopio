import { claveEncuadre, leerClave } from './encuadre';

const acopio = (lat: number, lng: number) => ({ lat, lng });
const zona = (lat: number, lng: number) => ({ centro: { lat, lng } });

it('con los mismos puntos da la misma clave aunque los objetos sean nuevos', () => {
  const a = claveEncuadre([acopio(4.6, -74.1)], [zona(1.15, -76.65)], { lat: 4.65, lng: -74.06 });
  const b = claveEncuadre([acopio(4.6, -74.1)], [zona(1.15, -76.65)], { lat: 4.65, lng: -74.06 });
  expect(a).toBe(b);
});

it('cambia si cambia el punto buscado, un acopio o una zona', () => {
  const base = claveEncuadre([acopio(4.6, -74.1)], [], null);
  expect(claveEncuadre([acopio(4.6, -74.1)], [], { lat: 4.65, lng: -74.06 })).not.toBe(base);
  expect(claveEncuadre([acopio(4.7, -74.1)], [], null)).not.toBe(base);
  expect(claveEncuadre([acopio(4.6, -74.1)], [zona(1.15, -76.65)], null)).not.toBe(base);
});

it('la clave se lee de vuelta como el centro y los puntos a encuadrar', () => {
  const clave = claveEncuadre([acopio(4.6, -74.1)], [zona(1.15, -76.65)], null);
  expect(leerClave(clave)).toEqual({
    centro: null,
    puntos: [
      [4.6, -74.1],
      [1.15, -76.65],
    ],
  });
});
