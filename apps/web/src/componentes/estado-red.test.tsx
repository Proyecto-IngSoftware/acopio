import { render, screen } from '@testing-library/react';
import { EtiquetaEstado } from './EtiquetaEstado';
import { TarjetaNoTraigan } from './TarjetaNoTraigan';

it.each([
  ['ACTIVO', 'Activo'],
  ['PAUSADO', 'Pausado'],
  ['CERRADO', 'Cerrado'],
  ['SIN_ATENDER', 'Sin atender'],
  ['EN_ATENCION', 'En atención'],
  ['CUBIERTA', 'Cubierta'],
] as const)('la etiqueta de %s dice «%s», con texto y no solo color', (estado, texto) => {
  render(<EtiquetaEstado estado={estado} />);
  expect(screen.getByText(texto)).toBeInTheDocument();
});

it('«No traigan» lista cada categoría con hasta cuándo y la antigüedad del dato', () => {
  render(
    <TarjetaNoTraigan
      items={[
        { categoria: 'Ropa usada', hasta: '2026-10-15' },
        { categoria: 'Colchonetas', hasta: null },
      ]}
      actualizado="hace 2 h"
    />,
  );
  const tarjeta = screen.getByRole('region', { name: 'No traigan' });
  expect(tarjeta).toHaveTextContent('Ropa usada');
  expect(tarjeta).toHaveTextContent('hasta el 15 de octubre');
  expect(tarjeta).toHaveTextContent('hasta nuevo aviso');
  expect(tarjeta).toHaveTextContent('Actualizado hace 2 h');
});

it('sin categorías, «No traigan» no se muestra', () => {
  const { container } = render(<TarjetaNoTraigan items={[]} />);
  expect(container).toBeEmptyDOMElement();
});
