import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { RecibirFolio } from './RecibirFolio';

type Abrir = (video: unknown, alLeer: (codigo: string) => void) => Promise<() => void>;
const camara = vi.hoisted(() => ({ abrir: (async () => () => {}) as Abrir }));
vi.mock('../inventario/camara', () => ({
  abrirCamara: (...a: Parameters<Abrir>) => camara.abrir(...a),
}));

const OPERADOR = { id: 'u1', username: 'op', nombre: 'Joseph', rol: 'OPERADOR' as const };
const FOLIO = 'ACO-2026-7KQ4M';
const linea = (id: string, categoria: string, extra: object = {}) => ({
  id,
  categoriaId: `c-${id}`,
  categoria,
  unidad: 'KILOGRAMO',
  perecedero: false,
  ean: null,
  contenidoUnitario: 1,
  cantidadDeclarada: 5,
  cantidadConfirmada: null,
  venceEn: null,
  motivoDiferencia: null,
  ...extra,
});
const COMPROBANTE = {
  folio: FOLIO,
  estado: 'PREPARADO',
  acopio: { id: 'x1', nombre: 'Acopio Chapinero' },
  creadoEn: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  recibidoEn: null,
  verificadoEn: null,
  motivoRechazo: null,
  notaRechazo: null,
  tieneFactura: false,
  lineas: [
    linea('l1', 'Arroz'),
    linea('l2', 'Leche en polvo', { perecedero: true, cantidadDeclarada: 2 }),
    linea('l3', 'Agua potable', { unidad: 'LITRO', contenidoUnitario: 0.5, cantidadDeclarada: 12 }),
  ],
};

const pantalla = (extra: Record<string, unknown> = {}) => {
  const mapa: Record<string, unknown> = {
    'GET /api/comprobantes/*': COMPROBANTE,
    'GET /api/acopios/x1/no-recibir': [],
    'GET /api/acopios/x1': { id: 'x1', nombre: 'Acopio Chapinero' },
    'POST /api/comprobantes/*/recepcion': { comprobante: COMPROBANTE, noRecibe: [] },
    ...extra,
  };
  // Una clave en undefined se quita: esa ruta responde 404
  responderSegun(Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined)));
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/recibir" element={<RecibirFolio />} />
      </Routes>,
      '/consola/acopios/x1/recibir',
      clienteFalso(OPERADOR),
    ),
  );
};

const buscar = async (texto = FOLIO) => {
  await userEvent.type(screen.getByRole('textbox', { name: 'Folio' }), texto);
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
};

afterEach(() => vi.restoreAllMocks());

it('sin red explica que necesita conexión y ofrece Entrada rápida', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  pantalla();
  expect(
    await screen.findByRole('heading', { name: 'Recibir por folio necesita conexión' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ir a Entrada rápida' })).toBeInTheDocument();
});

it('busca el folio aunque se escriba en minúsculas y con espacios', async () => {
  pantalla();
  await buscar('  aco-2026-7kq4m ');
  expect(await screen.findByRole('heading', { name: 'Lo que trae' })).toBeInTheDocument();
  expect(peticiones()).toContain(`GET /api/comprobantes/${FOLIO}`);
});

it('un folio que no existe lo dice junto al campo y deja escribir otro', async () => {
  pantalla({ 'GET /api/comprobantes/*': undefined });
  await buscar();
  expect(await screen.findByText('No encontramos ese folio')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Folio' })).toBeEnabled();
});

it('un folio ya recibido muestra su estado y no el formulario', async () => {
  pantalla({ 'GET /api/comprobantes/*': { ...COMPROBANTE, estado: 'PENDIENTE' } });
  await buscar();
  expect(await screen.findByText('Recibida en el acopio')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Lo que trae' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Buscar otro folio' })).toBeInTheDocument();
});

it('escanear el QR busca el folio leído', async () => {
  camara.abrir = async (_v, alLeer) => {
    setTimeout(() => alLeer(FOLIO), 0);
    return () => {};
  };
  pantalla();
  await userEvent.click(screen.getByRole('button', { name: 'Escanear QR' }));
  expect(await screen.findByRole('heading', { name: 'Lo que trae' })).toBeInTheDocument();
});

it('avisa si el folio era de otro acopio y si este no recibe una categoría', async () => {
  pantalla({
    'GET /api/comprobantes/*': { ...COMPROBANTE, acopio: { id: 'x2', nombre: 'Acopio Kennedy' } },
    'GET /api/acopios/x1/no-recibir': [
      { categoriaId: 'c-l1', categoria: 'Arroz', hasta: null, marcadoEn: '2026-10-01T00:00:00Z' },
    ],
  });
  await buscar();
  expect(
    await screen.findByText(
      'Este folio era para Acopio Kennedy. Al recibirlo aquí queda en este acopio.',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Este acopio no está recibiendo Arroz. Puedes recibirla igual.'),
  ).toBeInTheDocument();
});

it('con presentaciones cuenta enteros y muestra la unidad base', async () => {
  pantalla();
  await buscar();
  const agua = await screen.findByRole('listitem', { name: 'Agua potable' });
  expect(agua).toHaveTextContent('Declaró 6 L');
  await userEvent.click(within(agua).getByRole('button', { name: 'Menos Agua potable' }));
  expect(within(agua).getByRole('textbox', { name: 'Llegó de Agua potable' })).toHaveValue('11');
  expect(agua).toHaveTextContent('= 5,5 L');
});

it('si llega menos pregunta qué pasó; en cero dice «No llegó»', async () => {
  pantalla();
  await buscar();
  const arroz = await screen.findByRole('listitem', { name: 'Arroz' });
  expect(within(arroz).queryByRole('textbox', { name: '¿Qué pasó con la diferencia?' })).toBeNull();
  await userEvent.click(within(arroz).getByRole('button', { name: 'Menos Arroz' }));
  expect(
    within(arroz).getByRole('textbox', { name: '¿Qué pasó con la diferencia?' }),
  ).toBeInTheDocument();
  const campo = within(arroz).getByRole('textbox', { name: 'Llegó de Arroz' });
  await userEvent.clear(campo);
  await userEvent.type(campo, '0');
  expect(arroz).toHaveTextContent('No llegó');
});

it('registra con el cuerpo exacto y muestra lo que entró', async () => {
  pantalla();
  await buscar();
  const leche = await screen.findByRole('listitem', { name: 'Leche en polvo' });
  const registrar = screen.getByRole('button', { name: /Registrar recepción/ });
  expect(registrar).toBeDisabled();
  await userEvent.type(within(leche).getByLabelText('Vence'), '2026-12-01');
  const arroz = screen.getByRole('listitem', { name: 'Arroz' });
  await userEvent.click(within(arroz).getByRole('button', { name: 'Menos Arroz' }));
  await userEvent.type(
    within(arroz).getByRole('textbox', { name: '¿Qué pasó con la diferencia?' }),
    'Un paquete roto',
  );
  expect(registrar).toHaveAccessibleName('Registrar recepción (3 entradas)');
  await userEvent.click(registrar);
  expect(await screen.findByRole('heading', { name: 'Recibido' })).toBeInTheDocument();
  expect(await cuerpoDe(`POST /api/comprobantes/${FOLIO}/recepcion`)).toEqual({
    acopioId: 'x1',
    lineas: [
      { lineaId: 'l1', cantidadConfirmada: 4, motivoDiferencia: 'Un paquete roto' },
      { lineaId: 'l2', cantidadConfirmada: 2, venceEn: '2026-12-01' },
      { lineaId: 'l3', cantidadConfirmada: 12 },
    ],
  });
  expect(screen.getByText(`${FOLIO} · 3 entradas en Acopio Chapinero`)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Recibir otro folio' }));
  expect(screen.getByRole('textbox', { name: 'Folio' })).toHaveValue('');
});

it('si otro Operador lo recibió antes, lo explica y vuelve a cargar el folio', async () => {
  pantalla({
    'POST /api/comprobantes/*/recepcion': conEstado(409, {
      estado: 409,
      codigo: 'ESTADO_INVALIDO',
      mensaje: 'Esta donación está pendiente: no se puede recibir',
    }),
  });
  await buscar();
  const leche = await screen.findByRole('listitem', { name: 'Leche en polvo' });
  await userEvent.type(within(leche).getByLabelText('Vence'), '2026-12-01');
  await userEvent.click(screen.getByRole('button', { name: /Registrar recepción/ }));
  expect(
    await screen.findByText('Esta donación está pendiente: no se puede recibir'),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Volver a cargar' }));
  await waitFor(() =>
    expect(peticiones().filter((p) => p === `GET /api/comprobantes/${FOLIO}`)).toHaveLength(2),
  );
});

it('axe: sin violaciones graves al buscar y al confirmar', async () => {
  const { container } = pantalla();
  expect(await violacionesGraves(container)).toEqual([]);
  await buscar();
  await screen.findByRole('heading', { name: 'Lo que trae' });
  expect(await violacionesGraves(container)).toEqual([]);
});
