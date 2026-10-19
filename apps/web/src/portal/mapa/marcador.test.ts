import { acopioDePrueba, referenciadoDePrueba } from '../../pruebas/datos-red';
import { etiquetaMarcador } from './marcador';

it('el marcador de un referenciado se anuncia con su fuente', () => {
  expect(etiquetaMarcador(referenciadoDePrueba())).toBe(
    'Punto de RedAcopio Bogotá: Sugoi Taller Creativo',
  );
  expect(etiquetaMarcador(acopioDePrueba())).toBe('Acopio Chapinero');
});
