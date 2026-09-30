import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HORARIO_VACIO, type Horario } from '@acopio/shared';
import { useState } from 'react';
import { EditorHorario } from './EditorHorario';

function Prueba({ inicial }: { inicial: Horario }) {
  const [h, fijar] = useState(inicial);
  return (
    <>
      <EditorHorario valor={h} alCambiar={fijar} />
      <output aria-label="valor">{JSON.stringify(h)}</output>
    </>
  );
}

const lunes: Horario = { ...HORARIO_VACIO, lun: [{ abre: '08:00', cierra: '12:00' }] };

it('muestra los tramos de cada día y «Cerrado» en los días sin tramos', () => {
  render(<Prueba inicial={lunes} />);
  const fila = screen.getByRole('group', { name: 'Lunes' });
  expect(within(fila).getByText('08:00 a 12:00')).toBeInTheDocument();
  expect(
    within(screen.getByRole('group', { name: 'Domingo' })).getByText('Cerrado'),
  ).toBeInTheDocument();
});

it('agrega y quita tramos', async () => {
  render(<Prueba inicial={lunes} />);
  const martes = screen.getByRole('group', { name: 'Martes' });
  await userEvent.click(within(martes).getByRole('button', { name: 'Agregar tramo el martes' }));
  await userEvent.type(within(martes).getByLabelText('Abre'), '09:00');
  await userEvent.type(within(martes).getByLabelText('Cierra'), '13:00');
  await userEvent.click(within(martes).getByRole('button', { name: 'Agregar' }));
  expect(within(martes).getByText('09:00 a 13:00')).toBeInTheDocument();

  await userEvent.click(
    within(screen.getByRole('group', { name: 'Lunes' })).getByRole('button', {
      name: 'Quitar el tramo de 08:00 a 12:00',
    }),
  );
  expect(JSON.parse(screen.getByLabelText('valor').textContent!).lun).toEqual([]);
});

it('no agrega un tramo que cierra antes de abrir y dice por qué', async () => {
  render(<Prueba inicial={lunes} />);
  const martes = screen.getByRole('group', { name: 'Martes' });
  await userEvent.click(within(martes).getByRole('button', { name: 'Agregar tramo el martes' }));
  await userEvent.type(within(martes).getByLabelText('Abre'), '14:00');
  await userEvent.type(within(martes).getByLabelText('Cierra'), '10:00');
  await userEvent.click(within(martes).getByRole('button', { name: 'Agregar' }));
  expect(within(martes).getByRole('alert')).toHaveTextContent('cierra antes de abrir');
  expect(JSON.parse(screen.getByLabelText('valor').textContent!).mar).toEqual([]);
});
