import { esperaTrasIntento } from './notificacion.service';
import { plantillas } from './plantillas';

describe('esperaTrasIntento', () => {
  it('crece al doble en cada intento', () => {
    expect([1, 2, 3, 4].map((i) => esperaTrasIntento(i) / 60_000)).toEqual([1, 2, 4, 8]);
  });

  it('no pasa de dos horas', () => {
    expect(esperaTrasIntento(20)).toBe(120 * 60_000);
  });
});

describe('plantillas', () => {
  it('la invitación lleva el usuario y el enlace, también en HTML', () => {
    const correo = plantillas.invitacion({
      nombre: 'Ana',
      username: 'alopez',
      enlace: 'http://localhost:5173/invitacion/abc',
      venceEn: new Date('2026-10-05T17:00:00Z'),
    });
    expect(correo.texto).toContain('«alopez»');
    expect(correo.texto).toContain('http://localhost:5173/invitacion/abc');
    expect(correo.html).toContain('<a href="http://localhost:5173/invitacion/abc">');
  });

  it('escapa el HTML de los datos', () => {
    const correo = plantillas.asignacion({ nombre: '<b>x</b>', ubicacion: 'Acopio Norte' });
    expect(correo.html).not.toContain('<b>');
  });
});
