import { render, screen } from '@testing-library/react';
import { EtiquetaSemaforo, ORDEN_URGENCIA } from './EtiquetaSemaforo';

it.each([
  ['BAJO', 'Bajo el mínimo'],
  ['CERCA', 'Cerca del mínimo'],
  ['EN_RANGO', 'En rango'],
  ['SOBRE', 'Sobre el máximo'],
  ['SIN_UMBRAL', 'Sin umbral'],
] as const)('el semáforo %s dice «%s», con texto y no solo color (RNF-11)', (estado, texto) => {
  render(<EtiquetaSemaforo estado={estado} />);
  expect(screen.getByText(texto)).toBeInTheDocument();
});

it('el orden de urgencia va de bajo el mínimo a sin umbral', () => {
  expect(ORDEN_URGENCIA).toEqual(['BAJO', 'CERCA', 'SOBRE', 'EN_RANGO', 'SIN_UMBRAL']);
});
