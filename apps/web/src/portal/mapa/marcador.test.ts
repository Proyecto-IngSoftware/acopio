import { screen } from '@testing-library/react';

import { acopioDePrueba, referenciadoDePrueba } from '../../pruebas/datos-red';
import {
  altoPunto,
  anchoPunto,
  capitalizar,
  etiquetaCorta,
  etiquetaMarcador,
  htmlGrupo,
  htmlMarcador,
  htmlPunto,
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

it('cada tipo de punto tiene su ícono; pausado y referenciado llevan su nombre corto', () => {
  expect(htmlMarcador(acopioDePrueba(), false)).toContain('warehouse');
  const pausado = htmlMarcador(acopioDePrueba({ estado: 'PAUSADO' }), false);
  expect(pausado).toContain('pause');
  expect(pausado).toContain('Chapinero');
  const ref = htmlMarcador(referenciadoDePrueba(), false);
  expect(ref).toContain('link');
  expect(ref).toContain('border-primary-container');
  expect(ref).toContain('Sugoi');
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

describe('el punto del acopio activo con la etiqueta de su estado', () => {
  const casos = [
    ['falta', 'FALTA: Arroz', 'priority_high', 'bg-secondary-container'],
    ['sobra', 'SOBRA: Agua', 'inventory_2', 'bg-tertiary-container'],
    ['aldia', 'AL DÍA', 'check', 'bg-primary-fixed'],
    ['norecibe', 'NO RECIBE: Ropa', 'block', 'bg-surface-container-high'],
  ] as const;
  it.each(casos)('%s', (estado, texto, icono, clase) => {
    const html = htmlMarcador(acopioDePrueba(), false, { estado, texto });
    expect(html).toContain(texto);
    expect(html).toContain(icono);
    expect(html).toContain(clase);
    expect(html).toContain('warehouse');
    expect(html).not.toContain('Chapinero');
  });

  it('sin etiqueta es el círculo verde con warehouse y sin texto', () => {
    const html = htmlMarcador(acopioDePrueba(), false);
    expect(html).toContain('bg-primary-container');
    expect(html).toContain('warehouse');
    expect(
      html
        .replace(/<[^>]*>/g, '')
        .replace('warehouse', '')
        .trim(),
    ).toBe('');
  });

  it('apagado añade opacity-45 y quita la etiqueta', () => {
    const html = htmlMarcador(
      acopioDePrueba(),
      false,
      { estado: 'falta', texto: 'FALTA: Arroz' },
      true,
    );
    expect(html).toContain('opacity-45');
    expect(html).not.toContain('FALTA');
  });

  it('el texto de la etiqueta se escapa', () => {
    const etiqueta = { clases: 'x', icono: 'check', texto: '<b>' };
    const html = htmlPunto({ circulo: 'y', icono: 'check', etiqueta, elegido: false });
    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
    expect(htmlMarcador(acopioDePrueba(), false, { estado: 'falta', texto: '<b>' })).toContain(
      '&lt;b&gt;',
    );
  });
});

describe('etiquetaCorta', () => {
  it('deja igual lo que cabe', () => {
    expect(etiquetaCorta('FALTA: Arroz +2', 24)).toBe('FALTA: Arroz +2');
    expect(etiquetaCorta('X'.repeat(24), 24)).toBe('X'.repeat(24));
  });
  it('acorta la categoría con «…» antes del +N', () => {
    expect(etiquetaCorta('FALTA: Alimento para animales +2', 24)).toBe('FALTA: Alimento para… +2');
    expect(etiquetaCorta('FALTA: Alimento para animales +2', 24)).toHaveLength(24);
  });
  it('sin +N acorta el final', () => {
    expect(etiquetaCorta('NO RECIBE: Alimento para animales', 24)).toBe('NO RECIBE: Alimento par…');
  });
  it('con la categoría delante conserva el estado del final', () => {
    expect(etiquetaCorta('ALIMENTO PARA ANIMALES DE SOBRA', 24)).toBe('ALIMENTO PARA… DE SOBRA');
    expect(etiquetaCorta('ALIMENTO PARA ANIMALES AL DÍA', 24)).toBe('ALIMENTO PARA AN… AL DÍA');
  });
  it('no deja un espacio antes de «…»', () => {
    expect(etiquetaCorta('FALTA: Agua potable embotellada', 21)).toBe('FALTA: Agua potable…');
  });
});

it('el marcador dibuja la etiqueta corta; el title lleva la completa', () => {
  const html = htmlMarcador(acopioDePrueba(), false, {
    estado: 'falta',
    texto: 'FALTA: Alimento para animales +2',
  });
  expect(html).toContain('FALTA: Alimento para… +2');
  expect(html).not.toContain('animales');
});

// El alto sale de las clases de htmlPunto: size-8 o size-10, gap-1 y h-9 en la etiqueta
it('altoPunto mide lo dibujado, con y sin etiqueta, elegido o no', () => {
  expect(altoPunto(false, false)).toBe(32);
  expect(altoPunto(true, false)).toBe(40);
  expect(altoPunto(false, true)).toBe(32 + 4 + 36);
  expect(altoPunto(true, true)).toBe(40 + 4 + 36);
  const html = htmlPunto({
    circulo: 'y',
    icono: 'check',
    etiqueta: { clases: 'x', icono: 'check', texto: 'AL DÍA' },
    elegido: false,
  });
  expect(html).toContain('gap-1');
  expect(html).toContain('h-9');
  expect(html).toContain('size-8');
});

it('anchoPunto: el círculo sin etiqueta y lo que mida la etiqueta con ella', () => {
  expect(anchoPunto(false, null)).toBe(40);
  expect(anchoPunto(true, null)).toBe(48);
  expect(anchoPunto(false, 'AL DÍA')).toBeGreaterThan(48);
  // la etiqueta crece con el texto hasta 24 letras y no más
  expect(anchoPunto(false, 'FALTA: Aceite')).toBeGreaterThan(anchoPunto(false, 'AL DÍA'));
  expect(anchoPunto(false, 'FALTA: Alimento para animales +2')).toBe(
    anchoPunto(false, 'X'.repeat(24)),
  );
});

it('capitalizar baja la parte en mayúsculas del comienzo y deja el resto', () => {
  expect(capitalizar('FALTA: Arroz')).toBe('Falta: Arroz');
  expect(capitalizar('ARROZ DE SOBRA')).toBe('Arroz de sobra');
  expect(capitalizar('FALTAN 18 PERSONAS')).toBe('Faltan 18 personas');
  expect(capitalizar('FALTA AGUA 5L')).toBe('Falta agua 5L');
});
