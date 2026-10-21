import { render, screen } from '@testing-library/react';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { jornadaDe } from '../../pruebas/datos-turnos';
import { envolver } from '../../pruebas/utilidades';
import { FilaJornada } from './FilaJornada';
import { textoCuposFila } from './piezas';

const LLENA = {
  id: 'j2',
  titulo: 'Clasificar ropa',
  ocupados: 10,
  libres: 0,
  aceptaReservas: false,
  motivoSinReserva: 'LLENA',
} as const;

it('textoCuposFila', () => {
  expect(textoCuposFila({ cupoMaximo: 12, libres: 4 })).toBe('Quedan 4 de 12');
  expect(textoCuposFila({ cupoMaximo: 12, libres: 1 })).toBe('Queda 1 cupo');
  expect(textoCuposFila({ cupoMaximo: 12, libres: 0 })).toBe('Sin cupos');
});

it('abierta: el título abre la jornada y «Reservar» va aparte', () => {
  render(envolver(<FilaJornada jornada={jornadaDe()} />));
  expect(screen.getByRole('link', { name: 'Armar mercados' })).toHaveAttribute(
    'href',
    '/voluntariado/j1',
  );
  expect(screen.getByRole('link', { name: 'Reservar en Armar mercados' })).toHaveAttribute(
    'href',
    '/voluntariado/j1',
  );
  expect(screen.getByText('Quedan 7 de 10')).toBeInTheDocument();
  expect(screen.getByText('Miércoles 21 de octubre')).toBeInTheDocument();
  const barra = screen.getByRole('meter');
  expect(barra).toHaveAttribute('aria-valuenow', '3');
  expect(barra.querySelector('.bg-tertiary-container')).toBeNull();
});

it('con dos libres o menos, la barra y el texto van en ámbar', () => {
  render(envolver(<FilaJornada jornada={jornadaDe({ ocupados: 8, libres: 2 })} />));
  expect(screen.getByRole('meter').querySelector('.bg-tertiary-container')).not.toBeNull();
  expect(screen.getByText('Quedan 2 de 10')).toHaveClass('text-tertiary-container');
});

it('llena: etiqueta «Llena», bloque apagado y sin botón ni barra', () => {
  const { container } = render(envolver(<FilaJornada jornada={jornadaDe(LLENA)} />));
  expect(screen.getByText('Llena')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^Reservar/ })).toBeNull();
  expect(screen.queryByRole('meter')).toBeNull();
  expect(container.querySelector('.bg-primary-fixed')).toBeNull();
  // Sin opacidad: el texto atenuado quedaba por debajo de AA
  expect(container.querySelector('article')).not.toHaveClass('opacity-70');
});

it('lleva el perfil que pide la jornada', () => {
  render(envolver(<FilaJornada jornada={jornadaDe({ perfilRequerido: 'MEDICO' })} />));
  expect(screen.getByText('Médico')).toBeInTheDocument();
});

it('sin violaciones graves de accesibilidad', async () => {
  const { container } = render(
    envolver(
      <>
        <FilaJornada jornada={jornadaDe()} />
        <FilaJornada jornada={jornadaDe(LLENA)} />
      </>,
    ),
  );
  expect(await violacionesGraves(container)).toEqual([]);
});
