import { screen } from '@testing-library/react';

import { acopioDePrueba, referenciadoDePrueba } from '../../pruebas/datos-red';
import {
  etiquetaMarcador,
  htmlGrupo,
  htmlMarcador,
  htmlZona,
  nombreCorto,
  tipoDeGrupo,
} from './marcador';

it('el marcador de un referenciado se anuncia con su fuente', () => {
  expect(etiquetaMarcador(referenciadoDePrueba())).toBe(
    'Punto de RedAcopio Bogotá: Sugoi Taller Creativo',
  );
  expect(etiquetaMarcador(acopioDePrueba())).toBe('Acopio Chapinero');
});

it('el nombre del pin se corta en 14 letras sin partir una palabra corta', () => {
  expect(nombreCorto('Acopio Chapinero')).toBe('Chapinero');
  expect(nombreCorto('Sugoi Taller Creativo')).toBe('Sugoi Taller…');
  expect(nombreCorto('Suba')).toBe('Suba');
});

it('cada tipo de punto es una píldora con su ícono y su nombre corto', () => {
  expect(htmlMarcador(acopioDePrueba(), false)).toContain('warehouse');
  expect(htmlMarcador(acopioDePrueba(), false)).toContain('Chapinero');
  expect(htmlMarcador(acopioDePrueba({ estado: 'PAUSADO' }), false)).toContain('pause');
  const ref = htmlMarcador(referenciadoDePrueba(), false);
  expect(ref).toContain('link');
  expect(ref).toContain('border-primary-container');
  expect(htmlMarcador(acopioDePrueba(), true)).toContain('ring-4');
});

it('los grupos son redondos y no mezclan tipos: verde lleno o blanco con borde', () => {
  expect(tipoDeGrupo(acopioDePrueba())).toBe('acopio');
  expect(tipoDeGrupo(referenciadoDePrueba())).toBe('referenciado');
  expect(htmlGrupo('acopio', 7)).toMatch(/rounded-\[999px\].*bg-primary-container/);
  expect(htmlGrupo('referenciado', 12)).toMatch(/rounded-\[999px\].*border-primary-container/);
  expect(htmlGrupo('referenciado', 12)).toContain('>12<');
});

it('la zona es una píldora punteada con cuántas cosas faltan', () => {
  expect(htmlZona(2, false)).toContain('border-dashed');
  expect(htmlZona(2, false)).toContain('2 faltantes');
  expect(htmlZona(1, false)).toContain('1 faltante');
});

// Leaflet pone el title en el div del marcador con role="button"; el texto de la píldora no
// debe taparlo, porque el lector de pantalla tomaría «3 faltantes» o un nombre recortado
it('el lector de pantalla anuncia el title del marcador y no el texto de la píldora', () => {
  const pin = (html: string, title: string) => {
    const div = document.createElement('div');
    div.setAttribute('role', 'button');
    div.title = title;
    div.innerHTML = html;
    document.body.append(div);
    return div;
  };
  const zona = pin(htmlZona(3, false), 'Zona con necesidad');
  const ref = pin(
    htmlMarcador(referenciadoDePrueba(), false),
    etiquetaMarcador(referenciadoDePrueba()),
  );
  expect(screen.getByRole('button', { name: 'Zona con necesidad' })).toBe(zona);
  expect(
    screen.getByRole('button', { name: 'Punto de RedAcopio Bogotá: Sugoi Taller Creativo' }),
  ).toBe(ref);
  zona.remove();
  ref.remove();
});
