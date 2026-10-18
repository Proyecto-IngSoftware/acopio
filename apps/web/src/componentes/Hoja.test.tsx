import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Hoja } from './Hoja';

/** El estado del formulario vive en el padre y `alCerrar` es una función nueva en cada render. */
function ConFormulario() {
  const [abierta, fijarAbierta] = useState(true);
  const [texto, fijarTexto] = useState('');
  return abierta ? (
    <Hoja titulo="¿Cancelar la jornada?" alCerrar={() => fijarAbierta(false)}>
      <label>
        Motivo
        <input value={texto} onChange={(e) => fijarTexto(e.target.value)} />
      </label>
    </Hoja>
  ) : (
    <p>cerrada</p>
  );
}

it('escribir en la hoja no le quita el foco ni la cierra, aunque alCerrar cambie', async () => {
  render(<ConFormulario />);
  expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
  await userEvent.click(screen.getByLabelText('Motivo'));
  await userEvent.keyboard('se inundó la bodega');
  expect(screen.getByLabelText('Motivo')).toHaveValue('se inundó la bodega');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('Escape la cierra', async () => {
  render(<ConFormulario />);
  await userEvent.keyboard('{Escape}');
  expect(screen.getByText('cerrada')).toBeInTheDocument();
});
