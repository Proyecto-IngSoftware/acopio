import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba, referenciadoDePrueba } from '../../pruebas/datos-red';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Mapa } from './Mapa';

// Leaflet no corre en jsdom: el doble muestra un botón por cada acopio y cada zona que recibe
vi.mock('./MapaAcopios', () => ({
  default: ({
    acopios = [],
    alElegir,
    zonas = [],
    alElegirZona,
  }: {
    acopios?: { id: string }[];
    alElegir?: (id: string) => void;
    zonas?: { zonaId: string }[];
    alElegirZona?: (id: string) => void;
  }) => (
    <div>
      mapa de acopios
      {acopios.map((a) => (
        <button key={a.id} type="button" onClick={() => alElegir?.(a.id)}>
          acopio {a.id}
        </button>
      ))}
      {zonas.map((z) => (
        <button key={z.zonaId} type="button" onClick={() => alElegirZona?.(z.zonaId)}>
          zona {z.zonaId}
        </button>
      ))}
    </div>
  ),
}));

const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const ZONA_CON_NECESIDAD = {
  zonaId: 'z1',
  centro: { lat: 1.15, lng: -76.65 },
  radioKm: 3,
  necesidades: [
    {
      categoria: 'Agua potable',
      nota: 'Las familias del coliseo no tienen agua desde ayer',
      reportadoEn: haceHoras(3),
    },
    { categoria: 'Pañales', nota: null, reportadoEn: haceHoras(1) },
  ],
};
const ZONA_SIN_NECESIDAD = {
  zonaId: 'z2',
  centro: { lat: 1.13, lng: -76.66 },
  radioKm: 3,
  necesidades: [],
};

const ACOPIOS = [
  acopioDePrueba({ id: 'x1', nombre: 'Acopio Chapinero' }),
  // Kennedy va antes en la respuesta: con «Ropa usada» tiene que bajar al final
  acopioDePrueba({ id: 'x4', nombre: 'Acopio Kennedy' }),
  acopioDePrueba({
    id: 'x2',
    nombre: 'Acopio Suba',
    estado: 'PAUSADO',
    abiertoAhora: false,
    entidad: { id: 'e2', nombre: 'Parroquia San José' },
  }),
  acopioDePrueba({ id: 'x3', nombre: 'Acopio Usaquén' }),
];
const AGUA = { categoriaId: 'c1', categoria: 'Agua potable' };
const ROPA = { categoriaId: 'c2', categoria: 'Ropa usada' };
const vacia = { faltan: [], sobran: [], alDia: [], noRecibe: [] };
const NECESIDADES = [
  { ...vacia, acopioId: 'x1', faltan: [AGUA], sobran: [ROPA] },
  { ...vacia, acopioId: 'x2', noRecibe: [ROPA] },
  { ...vacia, acopioId: 'x3', alDia: [ROPA] },
  { ...vacia, acopioId: 'x4', noRecibe: [ROPA] },
];
const RESPUESTAS = {
  'GET /api/acopios': ACOPIOS,
  'GET /api/categorias/vigentes': [
    {
      id: 'c2',
      nombre: 'Ropa usada',
      grupo: 'ROPA_Y_ABRIGO',
      unidadBase: 'UNIDAD',
      perecedero: false,
      sinonimos: [],
      archivada: false,
    },
  ],
  'GET /api/publico/necesidades': NECESIDADES,
  'GET /api/geocodificar': [{ etiqueta: 'Calle 72, Bogotá', lat: 4.658, lng: -74.06 }],
};
const pantalla = (ruta = '/mapa?vista=lista') => render(envolver(<Mapa />, ruta));

it('la lista muestra cada acopio con su entidad, estado y enlace a la ficha', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  const chapinero = await screen.findByRole('link', { name: /Acopio Chapinero/ });
  expect(chapinero).toHaveAttribute('href', '/acopios/x1');
  expect(chapinero).toHaveTextContent('Fundación Manos Unidas');
  expect(screen.getByRole('link', { name: /Acopio Suba/ })).toHaveTextContent('Pausado');
});

it('«Abierto ahora» filtra en la API y queda en la URL', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('link', { name: /Acopio Chapinero/ });
  await userEvent.click(screen.getByRole('button', { name: 'Abierto ahora' }));
  await waitFor(() =>
    expect(peticiones().some((u) => u.startsWith('GET /api/acopios?abiertoAhora=true'))).toBe(true),
  );
});

it('lo que vas a llevar apaga los que no lo reciben y resume la categoría', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('option', { name: 'Ropa usada' });
  await userEvent.selectOptions(screen.getByLabelText('¿Qué vas a llevar?'), 'Ropa usada');
  expect(
    await screen.findByText('Ropa usada: está al día en 1 acopio y sobra en 1.'),
  ).toBeInTheDocument();
  const enlaces = screen.getAllByRole('link');
  const kennedy = screen.getByRole('link', { name: /Acopio Kennedy/ });
  expect(enlaces[enlaces.length - 1]).toBe(kennedy);
  expect(kennedy).toHaveTextContent('No recibe ropa usada');
  expect(kennedy).toHaveClass('opacity-60');
  const suba = screen.getByRole('link', { name: /Acopio Suba/ });
  expect(suba).not.toHaveTextContent('No recibe');
  expect(suba).not.toHaveClass('opacity-60');
  expect(screen.getByRole('link', { name: /Acopio Chapinero/ })).toHaveTextContent(
    'ROPA USADA DE SOBRA',
  );
  expect(screen.queryByText(/Ocultamos/)).not.toBeInTheDocument();
  // Con categoría, «No recibe» no es chip: esos acopios ya se ven apagados
  expect(screen.getByRole('button', { name: 'Todos 3' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'De sobra 1' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /No recibe/ })).not.toBeInTheDocument();
});

it('la lista lleva la etiqueta de cada acopio', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toHaveTextContent(
    'FALTA: Agua potable',
  );
  await waitFor(() =>
    expect(screen.getByRole('link', { name: /Acopio Usaquén/ })).toHaveTextContent('AL DÍA'),
  );
  const suba = screen.getByRole('link', { name: /Acopio Suba/ });
  expect(suba).not.toHaveTextContent('NO RECIBE');
  expect(suba).not.toHaveTextContent('Ropa usada');
});

it('los chips cuentan y filtran por estado, y quedan en la URL', async () => {
  responderSegun(RESPUESTAS);
  function Ubicacion() {
    return <p data-testid="busqueda">{useLocation().search}</p>;
  }
  render(
    envolver(
      <>
        <Mapa />
        <Ubicacion />
      </>,
      '/mapa?vista=lista',
    ),
  );
  expect(await screen.findByRole('button', { name: 'Todos 3' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Falta 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'No recibe 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'De sobra 1' }));
  expect(screen.getByTestId('busqueda')).toHaveTextContent('estado=sobra');
  expect(screen.getByRole('button', { name: 'De sobra 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const chapinero = screen.getByRole('link', { name: /Acopio Chapinero/ });
  expect(chapinero).toHaveTextContent('DE SOBRA: Ropa usada');
  expect(screen.getAllByRole('link')).toEqual([chapinero]);
});

it('la tarjeta del acopio elegido dice qué falta y qué sobra', async () => {
  responderSegun(RESPUESTAS);
  pantalla('/mapa');
  await screen.findByRole('button', { name: 'Todos 3' });
  await userEvent.click(screen.getByRole('button', { name: 'acopio x1' }));
  const hoja = await screen.findByRole('region', { name: /Acopio elegido/ });
  const falta = within(hoja).getByRole('region', { name: 'Qué falta hoy' });
  expect(falta).toHaveTextContent('Agua potable');
  const sobra = within(hoja).getByRole('region', { name: 'Ya tienen de sobra' });
  expect(sobra).toHaveTextContent('Ropa usada');
  expect(sobra).toHaveTextContent('Mejor llévalo a otro acopio.');
});

it('con una categoría elegida, la tarjeta se titula con su estado y nombra las demás faltas', async () => {
  responderSegun({
    ...RESPUESTAS,
    'GET /api/publico/necesidades': [
      {
        ...vacia,
        acopioId: 'x1',
        faltan: [AGUA, ROPA, { categoriaId: 'c3', categoria: 'Arroz' }],
      },
    ],
  });
  pantalla('/mapa?lleva=c2');
  await screen.findByText('Ropa usada: falta en 1 acopio.');
  await userEvent.click(screen.getByRole('button', { name: 'acopio x1' }));
  const hoja = await screen.findByRole('region', { name: /Acopio elegido/ });
  const bloque = within(hoja).getByRole('region', { name: 'Falta ropa usada' });
  expect(bloque).toHaveTextContent('También les falta: Agua potable, Arroz');
});

it('si las necesidades fallan, el mapa sigue sin chips ni etiquetas', async () => {
  const { 'GET /api/publico/necesidades': _, ...sinNecesidades } = RESPUESTAS;
  responderSegun(sinNecesidades);
  pantalla();
  const chapinero = await screen.findByRole('link', { name: /Acopio Chapinero/ });
  await waitFor(() =>
    expect(peticiones().some((u) => u.includes('/api/publico/necesidades'))).toBe(true),
  );
  expect(chapinero).not.toHaveTextContent('FALTA');
  expect(screen.queryByRole('button', { name: /Todos/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('«Cerca de mí» ordena por distancia y la ficha recibe el punto', async () => {
  responderSegun(RESPUESTAS);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) =>
        ok({ coords: { latitude: 4.65, longitude: -74.06 } }),
    },
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cerca de mí' }));
  await waitFor(() =>
    expect(peticiones().some((u) => u.startsWith('GET /api/acopios?cerca=4.65%2C-74.06'))).toBe(
      true,
    ),
  );
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'href',
    '/acopios/x1?cerca=4.65%2C-74.06',
  );
});

it('buscar una dirección usa la geocodificación y centra la búsqueda ahí', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.type(await screen.findByLabelText('Buscar una dirección'), 'Calle 72');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await userEvent.click(await screen.findByRole('button', { name: /Calle 72, Bogotá/ }));
  await waitFor(() =>
    expect(peticiones().some((u) => u.startsWith('GET /api/acopios?cerca=4.658%2C-74.06'))).toBe(
      true,
    ),
  );
});

it('la vista de mapa carga el mapa y deja pasar a la lista', async () => {
  responderSegun(RESPUESTAS);
  pantalla('/mapa');
  expect(await screen.findByText('mapa de acopios')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Lista' }));
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
});

it('la leyenda del mapa explica cada estado en su fila, con la píldora mini', async () => {
  responderSegun(RESPUESTAS);
  pantalla('/mapa');
  await screen.findByText('mapa de acopios');
  const leyenda = await screen.findByRole('list', { name: 'Estados del inventario' });
  const filas = within(leyenda).getAllByRole('listitem');
  expect(filas.map((f) => f.textContent)).toEqual([
    'priority_highFALTA le falta al menos una categoría',
    'inventory_2DE SOBRA tiene más de lo que necesita en alguna',
    'checkAL DÍA todo está dentro de lo que necesita',
    'blockNO RECIBE hay algo que hoy no está recibiendo',
  ]);
  const pildora = within(filas[0]!).getByText('FALTA');
  expect(pildora).toHaveClass('text-label-caps', 'px-1.5', 'bg-secondary-container');
});

it('sin necesidades la leyenda no muestra los estados', async () => {
  const { 'GET /api/publico/necesidades': _, ...sinNecesidades } = RESPUESTAS;
  responderSegun(sinNecesidades);
  pantalla('/mapa');
  await screen.findByText('mapa de acopios');
  await waitFor(() =>
    expect(peticiones().some((u) => u.includes('/api/publico/necesidades'))).toBe(true),
  );
  expect(screen.queryByRole('list', { name: 'Estados del inventario' })).not.toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  await screen.findByRole('link', { name: /Acopio Chapinero/ });
  expect(await violacionesGraves(container)).toEqual([]);
  expect(within(container).getByRole('heading', { level: 1 })).toHaveTextContent('Mapa de acopios');
});

describe('zonas con necesidad (HU-13.1)', () => {
  const conZonas = (zonas: unknown[]) =>
    responderSegun({ ...RESPUESTAS, 'GET /api/publico/zonas-necesidad': zonas });

  it('el mapa recibe solo las zonas que tienen algo que falta', async () => {
    conZonas([ZONA_CON_NECESIDAD, ZONA_SIN_NECESIDAD]);
    pantalla('/mapa');
    expect(await screen.findByRole('button', { name: 'zona z1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'zona z2' })).not.toBeInTheDocument();
  });

  it('tocar una zona muestra cada categoría, la nota entre comillas y su antigüedad, sin dirección', async () => {
    conZonas([ZONA_CON_NECESIDAD]);
    pantalla('/mapa');
    await userEvent.click(await screen.findByRole('button', { name: 'zona z1' }));
    const tarjeta = screen.getByRole('region', { name: 'Zona con necesidad' });
    expect(tarjeta).toHaveTextContent('Agua potable');
    expect(tarjeta).toHaveTextContent('«Las familias del coliseo no tienen agua desde ayer»');
    expect(tarjeta).toHaveTextContent('hace 3 h');
    expect(tarjeta).toHaveTextContent('Pañales');
    expect(tarjeta).toHaveTextContent('Sin nota');
    expect(tarjeta).toHaveTextContent('Radio de 3 km');
    expect(tarjeta).not.toHaveTextContent('Calle');
    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('region', { name: 'Zona con necesidad' })).not.toBeInTheDocument();
  });

  it('al tocar una zona baja hasta su tarjeta y le pasa el foco', async () => {
    const bajar = vi.fn();
    Element.prototype.scrollIntoView = bajar;
    conZonas([ZONA_CON_NECESIDAD]);
    pantalla('/mapa');
    await userEvent.click(await screen.findByRole('button', { name: 'zona z1' }));
    const tarjeta = screen.getByRole('region', { name: 'Zona con necesidad' });
    await waitFor(() => expect(bajar).toHaveBeenCalled());
    expect(bajar.mock.contexts[0]).toBe(tarjeta);
    expect(tarjeta).toHaveFocus();
  });

  it('en la lista, las zonas van antes de los acopios', async () => {
    conZonas([ZONA_CON_NECESIDAD]);
    pantalla('/mapa?vista=lista');
    const seccion = await screen.findByRole('region', { name: 'Lo que falta en zonas afectadas' });
    expect(seccion).toHaveTextContent('Agua potable');
    const acopio = await screen.findByRole('link', { name: /Acopio Chapinero/ });
    expect(seccion.compareDocumentPosition(acopio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sin zonas con necesidad la lista no muestra la sección', async () => {
    conZonas([ZONA_SIN_NECESIDAD]);
    pantalla('/mapa?vista=lista');
    await screen.findByRole('link', { name: /Acopio Chapinero/ });
    expect(screen.queryByText('Lo que falta en zonas afectadas')).not.toBeInTheDocument();
  });

  it('si la capa de zonas falla, los acopios siguen', async () => {
    responderSegun(RESPUESTAS);
    pantalla('/mapa?vista=lista');
    expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(peticiones().some((u) => u.includes('/api/publico/zonas-necesidad'))).toBe(true),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('la lista con zonas no tiene violaciones graves de accesibilidad', async () => {
    conZonas([ZONA_CON_NECESIDAD]);
    const { container } = pantalla('/mapa?vista=lista');
    await screen.findByRole('region', { name: 'Lo que falta en zonas afectadas' });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

it('la hoja del acopio elegido lleva a sus jornadas', async () => {
  responderSegun({ 'GET /api/acopios': [acopioDePrueba()] });
  render(envolver(<Mapa />, '/mapa'));
  await userEvent.click(
    await screen.findByRole('button', { name: `acopio ${acopioDePrueba().id}` }),
  );
  const hoja = await screen.findByRole('region', { name: /Acopio elegido/ });
  expect(within(hoja).getByRole('link', { name: 'Ver jornadas' })).toHaveAttribute(
    'href',
    `/voluntariado?acopio=${acopioDePrueba().id}`,
  );
});

describe('puntos de RedAcopio (pieza E)', () => {
  const REF = referenciadoDePrueba({ id: 'r1' });
  const REF_CERRADO = referenciadoDePrueba({
    id: 'r2',
    nombre: 'Parroquia del Divino Niño',
    estado: 'CERRADO',
    fuente: { ...REF.fuente!, estadoOriginal: 'cerrado' },
  });
  const conRef = () =>
    responderSegun({ ...RESPUESTAS, 'GET /api/acopios': [...ACOPIOS, REF, REF_CERRADO] });

  it('pide a la API los dos tipos de punto', async () => {
    conRef();
    pantalla();
    await screen.findByRole('link', { name: /Acopio Chapinero/ });
    expect(peticiones().some((u) => u.includes('tipos=OPERADO%2CREFERENCIADO'))).toBe(true);
  });

  it('el mapa dibuja el referenciado abierto, no el cerrado, y la leyenda nombra los dos tipos', async () => {
    conRef();
    pantalla('/mapa');
    expect(await screen.findByRole('button', { name: 'acopio r1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'acopio r2' })).not.toBeInTheDocument();
    expect(screen.getByText('Acopio sin etiqueta: no publica su inventario')).toBeInTheDocument();
    expect(screen.getByText('RedAcopio Bogotá: datos de su fuente')).toBeInTheDocument();
  });

  it('con la casilla apagada no dibuja referenciados y queda en la URL', async () => {
    conRef();
    pantalla('/mapa');
    await screen.findByRole('button', { name: 'acopio r1' });
    await userEvent.click(screen.getByRole('checkbox', { name: /Mostrar puntos de RedAcopio/ }));
    expect(screen.queryByRole('button', { name: 'acopio r1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'acopio x1' })).toBeInTheDocument();
  });

  it('en la lista van en su propia sección, después de los acopios, cerrados incluidos', async () => {
    conRef();
    pantalla();
    const seccion = await screen.findByRole('region', { name: 'Puntos de RedAcopio Bogotá' });
    const sugoi = within(seccion).getByRole('link', { name: /Sugoi Taller Creativo/ });
    expect(sugoi).toHaveTextContent('Abierto según RedAcopio · hace 3 h');
    expect(sugoi).toHaveAttribute('href', '/acopios/r1');
    expect(
      within(seccion).getByRole('link', { name: /Parroquia del Divino Niño/ }),
    ).toHaveTextContent('Cerrado según RedAcopio');
    const acopio = screen.getByRole('link', { name: /Acopio Chapinero/ });
    expect(acopio.compareDocumentPosition(seccion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(seccion).getByRole('link', { name: 'RedAcopio Bogotá' })).toHaveAttribute(
      'href',
      'https://redacopiobogota.com/',
    );
  });

  it('«¿Qué vas a llevar?» no filtra los referenciados', async () => {
    conRef();
    pantalla();
    await screen.findByRole('option', { name: 'Ropa usada' });
    await userEvent.selectOptions(screen.getByLabelText('¿Qué vas a llevar?'), 'Ropa usada');
    await screen.findByText('Ropa usada: está al día en 1 acopio y sobra en 1.');
    expect(screen.getByRole('link', { name: /Sugoi Taller Creativo/ })).toBeInTheDocument();
  });

  it('con un chip de estado elegido no se dibujan los referenciados', async () => {
    conRef();
    pantalla('/mapa?estado=falta');
    expect(await screen.findByRole('button', { name: 'Falta 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'acopio x1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'acopio r1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'acopio x3' })).not.toBeInTheDocument();
  });

  it('al tocar un referenciado, su tarjeta dice la fuente y no ofrece jornadas', async () => {
    conRef();
    pantalla('/mapa');
    await userEvent.click(await screen.findByRole('button', { name: 'acopio r1' }));
    const hoja = await screen.findByRole('region', { name: /Punto elegido: Sugoi/ });
    expect(hoja).toHaveTextContent('Punto de RedAcopio Bogotá');
    expect(hoja).toHaveTextContent('según RedAcopio');
    expect(hoja).toHaveTextContent('Datos de RedAcopio actualizados hace 3 h');
    expect(within(hoja).getByRole('link', { name: 'Ver ficha' })).toHaveAttribute(
      'href',
      '/acopios/r1',
    );
    expect(within(hoja).queryByRole('link', { name: 'Ver jornadas' })).not.toBeInTheDocument();
  });

  it('el mapa y la lista con referenciados no tienen violaciones graves', async () => {
    conRef();
    const { container } = pantalla();
    await screen.findByRole('region', { name: 'Puntos de RedAcopio Bogotá' });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
