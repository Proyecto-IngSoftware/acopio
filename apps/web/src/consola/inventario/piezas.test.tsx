import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import type { ResultadoBusqueda } from '../../api/catalogo';
import { BuscadorCategoria } from './BuscadorCategoria';
import { TarjetaSaldo } from './TarjetaSaldo';
import { aNumero, TecladoCantidad, teclear } from './TecladoCantidad';

const ARROZ: ResultadoBusqueda = {
  id: 'c2',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: true,
  puntaje: 0.9,
};

describe('teclear', () => {
  it('admite una sola coma y hasta tres decimales', () => {
    expect(teclear('12', ',')).toBe('12,');
    expect(teclear('12,', ',')).toBe('12,');
    expect(teclear('1,250', '5')).toBe('1,250');
  });

  it('sin decimales ignora la coma', () => {
    expect(teclear('12', ',', false)).toBe('12');
  });

  it('borra la última cifra y no deja ceros a la izquierda', () => {
    expect(teclear('120', 'Borrar')).toBe('12');
    expect(teclear('0', '7')).toBe('7');
  });
});

it('aNumero lee la coma decimal y devuelve 0 si no hay número', () => {
  expect(aNumero('12,5')).toBe(12.5);
  expect(aNumero('')).toBe(0);
});

function Teclado({ decimales }: { decimales: boolean }) {
  const [valor, fijar] = useState('');
  return (
    <>
      <output aria-label="Valor">{valor}</output>
      <TecladoCantidad
        decimales={decimales}
        onTecla={(t) => fijar((v) => teclear(v, t, decimales))}
      />
    </>
  );
}

it('el teclado sin decimales no muestra la coma', async () => {
  render(<Teclado decimales={false} />);
  expect(screen.queryByRole('button', { name: ',' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: '1' }));
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  await userEvent.click(screen.getByRole('button', { name: 'Borrar' }));
  expect(screen.getByLabelText('Valor')).toHaveTextContent(/^1$/);
});

it('el buscador muestra los resultados y entrega la categoría elegida', async () => {
  const elegida = vi.fn();
  function Buscador() {
    const [q, fijarQ] = useState('');
    return <BuscadorCategoria id="b" q={q} onQ={fijarQ} onElegir={elegida} />;
  }
  responderSegun({ 'GET /api/categorias/buscar': [ARROZ] });
  render(envolver(<Buscador />));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), 'arroz');
  await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
  expect(elegida).toHaveBeenCalledWith(ARROZ);
});

it('la tarjeta muestra la categoría, el saldo con su unidad y deja cambiarla', async () => {
  const cambiar = vi.fn();
  render(
    <TarjetaSaldo categoria={ARROZ} saldo={42} onCambiar={cambiar}>
      <span>extra</span>
    </TarjetaSaldo>,
  );
  const tarjeta = screen.getByRole('region', { name: 'Categoría elegida' });
  expect(tarjeta).toHaveTextContent('Arroz');
  expect(tarjeta).toHaveTextContent('Perecedero');
  expect(tarjeta).toHaveTextContent(/Saldo actual:\s*42 kg/);
  expect(tarjeta).toHaveTextContent('extra');
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
  expect(cambiar).toHaveBeenCalled();
});
