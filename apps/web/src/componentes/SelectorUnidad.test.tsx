import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { leerCantidad } from './cantidad-base';
import { SelectorUnidad } from './SelectorUnidad';

describe('SelectorUnidad', () => {
  it('en kilos ofrece kg y g, y avisa el factor elegido', async () => {
    const alCambiar = vi.fn();
    render(<SelectorUnidad unidad="KILOGRAMO" factor={1} alCambiar={alCambiar} />);
    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'g' }));
    expect(alCambiar).toHaveBeenCalledWith(0.001);
  });

  it('en litros ofrece L y ml', async () => {
    const alCambiar = vi.fn();
    render(<SelectorUnidad unidad="LITRO" factor={0.001} alCambiar={alCambiar} />);
    expect(screen.getByRole('radio', { name: 'ml' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'L' }));
    expect(alCambiar).toHaveBeenCalledWith(1);
  });

  it('en unidades muestra el símbolo sin opciones', () => {
    render(<SelectorUnidad unidad="UNIDAD" factor={1} alCambiar={() => {}} />);
    expect(screen.getByText('und.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
  });
});

describe('leerCantidad', () => {
  it('convierte a la unidad base', () => {
    expect(leerCantidad('600', 0.001, 'LITRO')).toEqual({ base: 0.6, error: null });
    expect(leerCantidad('2,5', 1, 'KILOGRAMO')).toEqual({ base: 2.5, error: null });
  });
  it('vacío no es error ni cantidad', () => {
    expect(leerCantidad('', 1, 'KILOGRAMO')).toEqual({ base: 0, error: null });
  });
  it('rechaza decimales de más y topes', () => {
    expect(leerCantidad('0,5', 0.001, 'KILOGRAMO').error).toMatch(/sin decimales/);
    expect(leerCantidad('10001', 1, 'KILOGRAMO').error).toBe('Una línea llega hasta 10.000 kg');
  });
});
