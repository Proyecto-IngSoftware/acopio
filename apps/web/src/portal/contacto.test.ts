import { CORREO_PRIVACIDAD } from './contacto';

it('el correo de los datos personales es el de contacto (P-042)', () => {
  expect(CORREO_PRIVACIDAD).toBe('contact@acopio.co');
});
