import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BarraNavegacion } from './BarraNavegacion';

const pintar = (ruta: string) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarraNavegacion />
    </MemoryRouter>,
  );

it.each([
  ['/voluntariado', '3'],
  ['/consola/turnos', '4'],
])('en %s la píldora va en %s', (ruta, posicion) => {
  const { container } = pintar(ruta);
  expect(container.querySelector('[data-posicion]')).toHaveAttribute('data-posicion', posicion);
});

it('fuera de las secciones no hay píldora', () => {
  const { container } = pintar('/privacidad');
  expect(container.querySelector('[data-posicion]')).toBeNull();
});
