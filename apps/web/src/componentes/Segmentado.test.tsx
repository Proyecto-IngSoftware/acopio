import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Segmentado } from './Segmentado';

function Prueba() {
  const [v, fijar] = useState<'ACTIVO' | 'PAUSADO'>('ACTIVO');
  return (
    <Segmentado
      etiqueta="Estado"
      valor={v}
      alCambiar={fijar}
      opciones={[
        { valor: 'ACTIVO', texto: 'Activo', icono: 'check_circle' },
        { valor: 'PAUSADO', texto: 'Pausado', icono: 'pause_circle' },
      ]}
    />
  );
}

it('es un grupo de opciones: marca la elegida y cambia al tocar otra', async () => {
  render(<Prueba />);
  expect(screen.getByRole('radio', { name: 'Activo' })).toBeChecked();
  await userEvent.click(screen.getByRole('radio', { name: 'Pausado' }));
  expect(screen.getByRole('radio', { name: 'Pausado' })).toBeChecked();
  expect(screen.getByRole('radiogroup', { name: 'Estado' })).toBeInTheDocument();
});
