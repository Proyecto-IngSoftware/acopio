import { render, screen, within } from '@testing-library/react';
import { envolver, responderJson } from './pruebas/utilidades';
import { violacionesGraves } from './pruebas/accesibilidad';
import { Rutas } from './rutas';

// La ruta / consulta la API
beforeEach(() => responderJson([]));

it('la barra inferior tiene los cinco destinos del portal', () => {
  render(envolver(<Rutas />));
  const barra = screen.getByRole('navigation', { name: 'Secciones' });
  expect(within(barra).getAllByRole('link')).toHaveLength(5);
  for (const nombre of ['Inicio', 'Mapa', 'Causas', 'Voluntariado', 'Más']) {
    expect(within(barra).getByRole('link', { name: nombre })).toBeInTheDocument();
  }
});

it('marca la sección actual', () => {
  render(envolver(<Rutas />, '/mapa'));
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
});

it('la cabecera lleva a Entrar', () => {
  render(envolver(<Rutas />));
  expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
});

it.each(['/mapa', '/causas', '/voluntariado', '/mas', '/entrar'])(
  '%s muestra «Próximamente» con un enlace de vuelta',
  (ruta) => {
    render(envolver(<Rutas />, ruta));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Próximamente');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  },
);

it('una ruta que no existe lo dice y ofrece volver', () => {
  render(envolver(<Rutas />, '/no-existe'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No encontramos esta página');
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument();
});

it('el marco no tiene violaciones graves de accesibilidad', async () => {
  const { container } = render(envolver(<Rutas />, '/mapa'));
  expect(await violacionesGraves(container)).toEqual([]);
});
