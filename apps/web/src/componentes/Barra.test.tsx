import { render, screen } from '@testing-library/react';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { Barra } from './Barra';

const relleno = () => screen.getByRole('meter').firstElementChild as HTMLElement;

it('es un medidor con su valor y su total', () => {
  render(<Barra valor={8} total={12} etiqueta="Cupos tomados" />);
  const barra = screen.getByRole('meter', { name: 'Cupos tomados' });
  expect(barra).toHaveAttribute('aria-valuenow', '8');
  expect(barra).toHaveAttribute('aria-valuemax', '12');
});

it('con menos movimiento (jsdom) se ve llena desde el principio', () => {
  render(<Barra valor={8} total={12} etiqueta="Cupos tomados" />);
  expect(relleno().style.width).toBe(`${(8 / 12) * 100}%`); // 66,66…%
});

it('con total 0 no dibuja NaN', () => {
  render(<Barra valor={0} total={0} etiqueta="Cupos tomados" />);
  expect(relleno().style.width).toBe('0%');
});

it('el tono aviso usa el ámbar', () => {
  render(<Barra valor={11} total={12} etiqueta="Cupos tomados" tono="aviso" />);
  expect(relleno()).toHaveClass('bg-tertiary-container');
});

it('no tiene violaciones graves', async () => {
  const { container } = render(<Barra valor={3} total={10} etiqueta="Cupos tomados" />);
  expect(await violacionesGraves(container)).toEqual([]);
});
