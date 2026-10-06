import { render, screen, within } from '@testing-library/react';
import { clienteFalso, envolver, responderJson } from './pruebas/utilidades';
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

it('la ficha de un acopio deja marcado «Mapa»', () => {
  render(envolver(<Rutas />, '/acopios/x1'));
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
});

it('la cabecera lleva a Entrar', async () => {
  render(envolver(<Rutas />));
  expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
});

it('/mapa abre el mapa de acopios', async () => {
  render(envolver(<Rutas />, '/mapa'));
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Mapa de acopios');
});

it.each(['/causas', '/voluntariado', '/proximamente'])(
  '%s muestra «Próximamente» con un enlace de vuelta',
  (ruta) => {
    render(envolver(<Rutas />, ruta));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Próximamente');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  },
);

it.each([
  ['/consola/acopios/x1/salida', 'Registrar salida'],
  ['/consola/acopios/x1/conteo', 'Conteo físico'],
])('%s abre su pantalla para el Operador', async (ruta, titulo) => {
  const operador = { id: 'o', username: 'o', nombre: 'Daniela', rol: 'OPERADOR' as const };
  render(envolver(<Rutas />, ruta, clienteFalso(operador)));
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
});

it('una ruta que no existe lo dice y ofrece volver', () => {
  render(envolver(<Rutas />, '/no-existe'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No encontramos esta página');
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument();
});

it('el marco no tiene violaciones graves de accesibilidad', async () => {
  const { container } = render(envolver(<Rutas />, '/mapa'));
  expect(await violacionesGraves(container)).toEqual([]);
});

it('/consola/sin-sincronizar abre la lista de entradas guardadas en el teléfono', async () => {
  const operadora = {
    id: 'u1',
    username: 'd.mendez',
    nombre: 'Daniela Méndez',
    rol: 'OPERADOR' as const,
  };
  render(envolver(<Rutas />, '/consola/sin-sincronizar', clienteFalso(operadora)));
  expect(await screen.findByRole('heading', { name: 'Sin sincronizar' })).toBeInTheDocument();
});

describe('rutas del Donador', () => {
  const donador = {
    id: 'd1',
    username: 'ana@correo.co',
    nombre: 'Ana Ruiz',
    rol: 'DONADOR' as const,
  };

  it.each([
    ['/donador', 'Tu cuenta de Donador'],
    ['/donador/confirmar/abc', 'Confirma tu correo'],
    ['/seguimiento', 'Seguimiento'],
    ['/seguimiento/ACO-2026-7KQ4M', 'Seguimiento'],
    ['/privacidad', 'Privacidad'],
  ])('%s carga su pantalla dentro del portal', async (ruta, titulo) => {
    render(envolver(<Rutas />, ruta));
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('/donar con un Donador en sesión carga Preparar', async () => {
    render(envolver(<Rutas />, '/donar', clienteFalso(donador)));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Preparar donación' }),
    ).toBeInTheDocument();
  });

  it('/donar sin sesión lleva a /donador', async () => {
    render(envolver(<Rutas />, '/donar'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tu cuenta de Donador' }),
    ).toBeInTheDocument();
  });

  it('/consola/bitacora con un Donador cae en el rechazo de RequiereRol', async () => {
    render(envolver(<Rutas />, '/consola/bitacora', clienteFalso(donador)));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
  });
});
