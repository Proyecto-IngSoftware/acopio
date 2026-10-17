import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import { GENERAL, HACIA_ZONA, RECEPTORA, ZONA } from './datos-prueba';
import { MiZona } from './MiZona';

type Abrir = (video: unknown, alLeer: (codigo: string) => void) => Promise<() => void>;
const camara = vi.hoisted(() => ({ abrir: (async () => () => {}) as Abrir }));
vi.mock('../inventario/camara', () => ({
  abrirCamara: (...a: Parameters<Abrir>) => camara.abrir(...a),
}));

const OTRA = 'd0000000-0000-4000-8000-000000000032';
const ubicacion = (id: string, nombre: string) => ({
  tipo: 'ZONA',
  id,
  nombre,
  municipio: 'Mocoa',
  estado: 'ACTIVA',
});
const SAN_AGUSTIN = ubicacion(ZONA, 'Barrio San Agustín (prueba)');
const EL_PEPINO = ubicacion(OTRA, 'Vereda El Pepino (prueba)');

const cat = (
  categoriaId: string,
  categoria: string,
  unidad: string,
  necesidad: number,
  recibido: number,
  enCamino: number,
) => {
  const deficit = Math.max(0, necesidad - recibido - enCamino);
  return {
    categoriaId,
    categoria,
    unidad,
    origen: 'CANASTA',
    cantidadPersonaDia: 1,
    fuenteCanasta: null,
    manual: null,
    necesidad,
    recibido,
    enCamino,
    deficit,
    cobertura: necesidad > 0 ? (recibido + enCamino) / necesidad : null,
  };
};

const ficha = (id: string, nombre: string, categorias: ReturnType<typeof cat>[]) => ({
  zona: {
    id,
    nombre,
    municipio: 'Mocoa',
    poblacionEstimada: 1200,
    poblacionFuente: 'Demo',
    poblacionFecha: '2026-10-02T00:00:00.000Z',
    emergencia: {
      id: 'e1',
      nombre: 'Inundaciones Putumayo (prueba)',
      estado: 'ACTIVA',
      horizonteDias: 7,
    },
  },
  categorias,
  coberturaGlobal: 0.3,
  categoriaMasBaja: null,
  reportes: [],
});

const FICHA = ficha(ZONA, 'Barrio San Agustín (prueba)', [
  cat('c-agua', 'Agua potable', 'LITRO', 1200, 120, 400),
  cat('c-arroz', 'Arroz', 'KILOGRAMO', 420, 80, 60),
  cat('c-panales', 'Pañales', 'UNIDAD', 300, 0, 0),
  cat('c-aseo', 'Kit de aseo', 'UNIDAD', 100, 50, 0),
  cat('c-cobijas', 'Cobijas', 'UNIDAD', 50, 60, 0),
]);

const hace = (horas: number) => new Date(Date.now() - horas * 3600_000).toISOString();
const reporte = (
  categoriaId: string,
  categoria: string,
  resuelta: boolean,
  horas: number,
  nota: string | null = null,
) => ({
  id: `${categoriaId}-${horas}`,
  categoriaId,
  categoria,
  nota,
  resuelta,
  reportadoPor: 'Alejandra',
  reportadoEn: hace(horas),
});

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ruta">{l.pathname + l.search}</p>;
}

function pantalla(ruta = '/consola/mi-zona') {
  return render(
    envolver(
      <Routes>
        <Route
          path="/consola/mi-zona"
          element={
            <>
              <MiZona />
              <Ubicacion />
            </>
          }
        />
        <Route path="*" element={<Ubicacion />} />
      </Routes>,
      ruta,
      clienteFalso(RECEPTORA),
    ),
  );
}

const BASE = {
  'GET /api/ubicaciones/mias': [SAN_AGUSTIN],
  'GET /api/recepciones': [HACIA_ZONA, GENERAL],
  'GET /api/zonas/*/necesidad': FICHA,
  'GET /api/zonas/*/reportes': [
    reporte('c-panales', 'Pañales', false, 5, 'Faltan tallas 3 y 4'),
    reporte('c-agua', 'Agua potable', false, 48),
    reporte('c-leche', 'Leche', true, 2),
    reporte('c-leche', 'Leche', false, 30),
  ],
};

it('muestra la zona con su emergencia y su población', async () => {
  responderSegun(BASE);
  pantalla();
  expect(
    await screen.findByRole('heading', { level: 2, name: 'Barrio San Agustín (prueba)' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Mocoa · Inundaciones Putumayo (prueba)')).toBeInTheDocument();
  expect(screen.getByText('1.200 personas (estimado)')).toBeInTheDocument();
});

it('«Por recibir» lista lo que viene a la zona y los despachos generales', async () => {
  responderSegun(BASE);
  pantalla();
  const region = await screen.findByRole('region', { name: 'Por recibir' });
  expect(await within(region).findByText('2 en camino')).toBeInTheDocument();
  expect(within(region).getByRole('link', { name: /R-2026-DEMA2/ })).toHaveAttribute(
    'href',
    '/consola/recepciones/R-2026-DEMA2',
  );
  expect(within(region).getByRole('link', { name: /R-2026-DEMA3/ })).toHaveTextContent(
    'Despacho general',
  );
  expect(within(region).getByRole('link', { name: 'Ver todas' })).toHaveAttribute(
    'href',
    '/consola/recepciones',
  );
});

it('el escáner abre la recepción del QR leído', async () => {
  camara.abrir = async (_video, alLeer) => {
    alLeer('https://acopio.co/consola/recepciones/qr/AbCdEfGhIjKlMnOpQrSt_-12');
    return () => {};
  };
  responderSegun(BASE);
  pantalla();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Escanear el QR de la remisión' }),
  );
  await waitFor(() =>
    expect(screen.getByTestId('ruta')).toHaveTextContent(
      '/consola/recepciones/qr/AbCdEfGhIjKlMnOpQrSt_-12',
    ),
  );
});

it('«Lo que más falta» son las tres de menor cobertura que aún tienen déficit', async () => {
  responderSegun(BASE);
  pantalla();
  const region = await screen.findByRole('region', { name: 'Lo que más falta' });
  const filas = await within(region).findAllByRole('listitem');
  // Cobertura: Pañales 0, Arroz (80 + 60) / 420 ≈ 0,33, Agua (120 + 400) / 1200 ≈ 0,43;
  // Kit de aseo (0,5) queda fuera y Cobijas no tiene déficit
  expect(filas.map((f) => within(f).getByRole('heading').textContent)).toEqual([
    'Pañales',
    'Arroz',
    'Agua potable',
  ]);
  expect(filas[2]).toHaveTextContent('120 de 1.200 L · 400 en camino');
  expect(filas[0]).toHaveTextContent('0 de 300 und');
  expect(filas[0]).not.toHaveTextContent('en camino');
  expect(within(region).getByRole('link', { name: 'Ver la ficha' })).toHaveAttribute(
    'href',
    `/consola/zonas/${ZONA}`,
  );
});

it('«Tus reportes» muestra solo lo que sigue abierto, con su nota', async () => {
  responderSegun(BASE);
  pantalla();
  const region = await screen.findByRole('region', { name: 'Tus reportes' });
  const filas = await within(region).findAllByRole('listitem');
  expect(filas.map((f) => within(f).getByRole('heading').textContent)).toEqual([
    'Pañales',
    'Agua potable',
  ]);
  expect(filas[0]).toHaveTextContent('«Faltan tallas 3 y 4»');
  expect(within(region).getByRole('link', { name: 'Reportar necesidad' })).toHaveAttribute(
    'href',
    `/consola/zonas/${ZONA}/reportar`,
  );
  expect(within(region).getByRole('link', { name: 'Ya se resolvió algo' })).toHaveAttribute(
    'href',
    `/consola/zonas/${ZONA}/reportar?modo=resuelta`,
  );
});

it('sin nada pendiente lo dice y no ofrece «Ya se resolvió algo»', async () => {
  responderSegun({
    ...BASE,
    'GET /api/recepciones': [],
    'GET /api/zonas/*/necesidad': ficha(ZONA, 'Barrio San Agustín (prueba)', [
      cat('c-agua', 'Agua potable', 'LITRO', 100, 60, 40),
    ]),
    'GET /api/zonas/*/reportes': [reporte('c-agua', 'Agua potable', true, 2)],
  });
  pantalla();
  expect(await screen.findByText('No hay remisiones en camino a tu zona.')).toBeInTheDocument();
  expect(
    await screen.findByText(
      'Con lo recibido y lo que viene en camino se cubre lo que la zona necesita por ahora.',
    ),
  ).toBeInTheDocument();
  expect(await screen.findByText(/No tienes reportes abiertos/)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Ya se resolvió algo' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Escanear el QR de la remisión' })).toBeInTheDocument();
});

it('con dos zonas elige la de la dirección y cambia con el selector', async () => {
  // La primera regla que coincide gana: la de la segunda zona va antes del comodín
  responderSegun({
    [`GET /api/zonas/${OTRA}/necesidad`]: ficha(OTRA, 'Vereda El Pepino (prueba)', []),
    ...BASE,
    'GET /api/ubicaciones/mias': [SAN_AGUSTIN, EL_PEPINO],
  });
  pantalla(`/consola/mi-zona?zona=${OTRA}`);
  const selector = await screen.findByRole('radiogroup', { name: 'Zona' });
  expect(within(selector).getByRole('radio', { name: 'Vereda El Pepino (prueba)' })).toBeChecked();
  const region = await screen.findByRole('region', { name: 'Por recibir' });
  // La remisión de San Agustín no es de esta zona; el despacho general sí se puede tomar
  expect(await within(region).findByText('1 en camino')).toBeInTheDocument();
  expect(within(region).queryByRole('link', { name: /R-2026-DEMA2/ })).not.toBeInTheDocument();

  await userEvent.click(
    within(selector).getByRole('radio', { name: 'Barrio San Agustín (prueba)' }),
  );
  expect(screen.getByTestId('ruta')).toHaveTextContent(`/consola/mi-zona?zona=${ZONA}`);
  expect(
    await screen.findByRole('heading', { level: 2, name: 'Barrio San Agustín (prueba)' }),
  ).toBeInTheDocument();
});

it('sin zonas asignadas pide hablar con el Administrador', async () => {
  responderSegun({ ...BASE, 'GET /api/ubicaciones/mias': [] });
  pantalla();
  expect(
    await screen.findByText(
      'Todavía no tienes una zona asignada. Pídele al Administrador que te asigne una.',
    ),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(BASE);
  const { container } = pantalla();
  await screen.findByRole('region', { name: 'Tus reportes' });
  await screen.findAllByRole('listitem');
  expect(await violacionesGraves(container)).toEqual([]);
});

it('«Por recibir» muestra tres y deja el resto para «Ver todas»', async () => {
  const mas = [1, 2, 3].map((n) => ({ ...HACIA_ZONA, id: `r-${n}`, codigo: `R-2026-EXTR${n}` }));
  responderSegun({ ...BASE, 'GET /api/recepciones': [HACIA_ZONA, GENERAL, ...mas] });
  pantalla();
  const region = await screen.findByRole('region', { name: 'Por recibir' });
  expect(await within(region).findByText('5 en camino')).toBeInTheDocument();
  expect(within(region).getAllByRole('listitem')).toHaveLength(3);
  expect(within(region).getByRole('link', { name: 'Ver todas' })).toBeInTheDocument();
});
