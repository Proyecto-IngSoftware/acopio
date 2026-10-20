import { rutaDeVuelta } from './volver';

it('acepta una ruta interna', () => {
  expect(rutaDeVuelta('/donar')).toBe('/donar');
  expect(rutaDeVuelta('/consola/motor?zona=z1')).toBe('/consola/motor?zona=z1');
});

it('rechaza lo que saldría del sitio o no es una ruta', () => {
  expect(rutaDeVuelta('//x.com')).toBeNull();
  // El navegador lee «/\\» como «//»
  expect(rutaDeVuelta('/\\x.com')).toBeNull();
  expect(rutaDeVuelta('https://x.com')).toBeNull();
  expect(rutaDeVuelta('donar')).toBeNull();
  expect(rutaDeVuelta(null)).toBeNull();
});
