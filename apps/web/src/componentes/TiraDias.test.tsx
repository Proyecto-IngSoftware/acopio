import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { DiaTira } from '../formato';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { TiraDias } from './TiraDias';

const dias: DiaTira[] = [
  { clave: 'todos', arriba: 'Todos', numero: '5', nombre: 'Todos los días', conEventos: false },
  {
    clave: '2026-10-21',
    arriba: 'Hoy',
    numero: '21',
    nombre: 'Miércoles 21 de octubre',
    conEventos: false,
  },
  {
    clave: '2026-10-22',
    arriba: 'jue',
    numero: '22',
    nombre: 'Jueves 22 de octubre',
    conEventos: true,
  },
];

it('marca el elegido y avisa la clave del que se toca', async () => {
  const alElegir = vi.fn();
  render(<TiraDias etiqueta="Días" dias={dias} elegido="todos" alElegir={alElegir} />);
  expect(screen.getByRole('button', { name: 'Todos los días' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Jueves 22 de octubre' }));
  expect(alElegir).toHaveBeenCalledWith('2026-10-22');
});

it('solo los días con eventos llevan punto', () => {
  const { container } = render(
    <TiraDias etiqueta="Días" dias={dias} elegido="todos" alElegir={() => {}} />,
  );
  expect(container.querySelectorAll('[data-punto]')).toHaveLength(1);
});

it('no tiene violaciones graves', async () => {
  const { container } = render(
    <TiraDias etiqueta="Días" dias={dias} elegido="2026-10-22" alElegir={() => {}} />,
  );
  expect(await violacionesGraves(container)).toEqual([]);
});

it('un día sin eventos conserva el contraste AA: no usa el gris de contorno', () => {
  render(<TiraDias etiqueta="Días" dias={dias} elegido="todos" alElegir={() => {}} />);
  expect(screen.getByRole('button', { name: 'Miércoles 21 de octubre' })).not.toHaveClass(
    'text-outline',
  );
});
