import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { CalendarioFechas } from './CalendarioFechas';

function Prueba({ hoy = '2026-10-17', inicial = [] as string[] }) {
  const [fechas, fijarFechas] = useState<string[]>(inicial);
  return (
    <>
      <CalendarioFechas hoy={hoy} fechas={fechas} alCambiar={fijarFechas} />
      <output>{fechas.join(',')}</output>
    </>
  );
}

const dia = (nombre: string) => screen.getByRole('button', { name: nombre });

it('marca varias fechas y las entrega ordenadas', async () => {
  render(<Prueba />);
  expect(screen.getByText('Octubre de 2026')).toBeInTheDocument();
  await userEvent.click(dia('22 de octubre'));
  await userEvent.click(dia('20 de octubre'));
  await userEvent.click(dia('21 de octubre'));
  expect(screen.getByRole('status')).toHaveTextContent('2026-10-20,2026-10-21,2026-10-22');
  expect(dia('20 de octubre')).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(dia('21 de octubre'));
  expect(screen.getByRole('status')).toHaveTextContent('2026-10-20,2026-10-22');
});

it('no deja marcar días pasados ni a más de 90 días', async () => {
  render(<Prueba />);
  expect(dia('16 de octubre')).toBeDisabled();
  expect(dia('17 de octubre')).toBeEnabled();
  // 17 de octubre + 90 días = 15 de enero de 2027
  for (let i = 0; i < 3; i++)
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
  expect(screen.getByText('Enero de 2027')).toBeInTheDocument();
  expect(dia('15 de enero')).toBeEnabled();
  expect(dia('16 de enero')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
});

it('no deja marcar más de 14 fechas', async () => {
  // Del 18 al 31 de octubre: 14 fechas
  const catorce = Array.from({ length: 14 }, (_, i) => `2026-10-${18 + i}`);
  render(<Prueba inicial={catorce} />);
  expect(dia('17 de octubre')).toBeDisabled();
  expect(dia('18 de octubre')).toBeEnabled();
  expect(screen.getByText(/14 fechas/)).toBeInTheDocument();
});
