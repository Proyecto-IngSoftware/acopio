import { motivoRechazo } from './politica-contrasena';

describe('motivoRechazo', () => {
  it('acepta una frase larga sin símbolos', () => {
    expect(motivoRechazo('cafe con arepa al amanecer')).toBeNull();
  });

  it('rechaza menos de 12 caracteres', () => {
    expect(motivoRechazo('corta123')).toMatch(/12 caracteres/);
  });

  it.each(['Contraseña2026!', 'colombia123456', 'ACOPIO2026!!!!', 'password12345'])(
    'rechaza una palabra común con adornos: %s',
    (c) => expect(motivoRechazo(c)).toMatch(/común/),
  );

  it('rechaza repeticiones y secuencias', () => {
    expect(motivoRechazo('aaaaaaaaaaaaaa')).toMatch(/fácil/);
    expect(motivoRechazo('12345678901234')).toMatch(/fácil/);
  });

  it('rechaza que contenga el usuario', () => {
    expect(motivoRechazo('soy jlopez de la bodega', ['jlopez'])).toMatch(/usuario/);
  });
});
