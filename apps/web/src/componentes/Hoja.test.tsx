import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
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

describe('con animaciones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('espera la salida antes de cerrar', () => {
    render(<ConFormulario />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText('cerrada')).toBeInTheDocument();
  });

  it('cerrar dos veces durante la salida avisa una sola vez', () => {
    const alCerrar = vi.fn();
    render(
      <Hoja titulo="Prueba" alCerrar={alCerrar}>
        <p>x</p>
      </Hoja>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    act(() => vi.advanceTimersByTime(300));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });
});
