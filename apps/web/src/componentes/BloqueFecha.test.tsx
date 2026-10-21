import { render, screen } from '@testing-library/react';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { BloqueFecha } from './BloqueFecha';

const hoy = new Date('2026-10-21T15:00:00Z');

it('muestra el día de la semana y el número, y lee la fecha completa', () => {
  render(<BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} />);
  expect(screen.getByText('jue')).toBeInTheDocument();
  expect(screen.getByText('22')).toBeInTheDocument();
  expect(screen.getByText('Jueves 22 de octubre')).toHaveClass('sr-only');
});

it('a más de siete días muestra el mes en lugar del día de la semana', () => {
  render(<BloqueFecha fecha="2026-11-02T15:00:00Z" hoy={hoy} />);
  expect(screen.getByText('nov')).toBeInTheDocument();
  expect(screen.queryByText('lun')).not.toBeInTheDocument();
});

it('apagado usa el gris sólido', () => {
  const { container } = render(<BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} apagado />);
  expect(container.firstChild).toHaveClass('bg-surface-container');
  expect(container.firstChild).not.toHaveClass('bg-primary-fixed');
});

it('no tiene violaciones graves', async () => {
  const { container } = render(
    <BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} tamano="detalle" />,
  );
  expect(await violacionesGraves(container)).toEqual([]);
});
