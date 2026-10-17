import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Mapa } from './Mapa';

// Leaflet no corre en jsdom: el doble muestra un botón por cada zona que recibe
vi.mock('./MapaAcopios', () => ({
  default: ({
    zonas = [],
    alElegirZona,
  }: {
    zonas?: { zonaId: string }[];
    alElegirZona?: (id: string) => void;
  }) => (
    <div>
      mapa de acopios
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
  acopioDePrueba({
    id: 'x2',
    nombre: 'Acopio Suba',
    estado: 'PAUSADO',
    abiertoAhora: false,
    entidad: { id: 'e2', nombre: 'Parroquia San José' },
  }),
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
  'GET /api/no-recibir': [{ acopioId: 'x2', hasta: null }],
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
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?abiertoAhora=true'));
});

it('lo que vas a llevar oculta los acopios que no lo reciben y lo dice', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('option', { name: 'Ropa usada' });
  await userEvent.selectOptions(screen.getByLabelText('¿Qué vas a llevar?'), 'Ropa usada');
  expect(
    await screen.findByText('Ocultamos 1 acopio que hoy no recibe ropa usada.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Acopio Suba/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
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
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?cerca=4.65%2C-74.06'));
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
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?cerca=4.658%2C-74.06'));
});

it('la vista de mapa carga el mapa y deja pasar a la lista', async () => {
  responderSegun(RESPUESTAS);
  pantalla('/mapa');
  expect(await screen.findByText('mapa de acopios')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Lista' }));
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
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
