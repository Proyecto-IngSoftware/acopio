import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Conciliacion } from './Conciliacion';

const AUDITOR = { id: 'u1', username: 'aud', nombre: 'Michael', rol: 'AUDITOR' as const };
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
  cantidadConfirmada: 5,
  venceEn: null,
  motivoDiferencia: null,
  ...extra,
});
const DETALLE = {
  folio: FOLIO,
  estado: 'PENDIENTE',
  acopio: { id: 'a1', nombre: 'Acopio Chapinero' },
  creadoEn: '2026-10-03T15:00:00Z',
  recibidoEn: '2026-10-04T15:42:00Z',
  verificadoEn: null,
  motivoRechazo: null,
  notaRechazo: null,
  tieneFactura: true,
  conDiferencia: true,
  lineas: [
    linea('l1', 'Arroz', { cantidadConfirmada: 4, motivoDiferencia: 'Un paquete roto' }),
    linea('l2', 'Agua potable', {
      unidad: 'LITRO',
      contenidoUnitario: 0.5,
      cantidadDeclarada: 24,
      cantidadConfirmada: 24,
    }),
    linea('l3', 'Pañales', { unidad: 'UNIDAD', cantidadDeclarada: 30, cantidadConfirmada: 0 }),
  ],
  entradas: [
    {
      movimientoId: 'm1',
      categoriaId: 'c-l1',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      cantidad: 4,
      ocurridoEn: '2026-10-04T15:42:00Z',
      origen: 'RECEPCION',
      registradoPor: 'Joseph',
    },
    {
      movimientoId: 'm2',
      categoriaId: 'c-l2',
      categoria: 'Agua potable',
      unidad: 'LITRO',
      cantidad: 12,
      ocurridoEn: '2026-10-04T15:42:00Z',
      origen: 'AUDITOR',
      registradoPor: 'Brayan',
    },
  ],
  resumen: [
    {
      categoriaId: 'c-l1',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      confirmado: 4,
      entradas: 4,
      cuadra: true,
    },
    {
      categoriaId: 'c-l2',
      categoria: 'Agua potable',
      unidad: 'LITRO',
      confirmado: 12,
      entradas: 12,
      cuadra: true,
    },
    {
      categoriaId: 'c-l3',
      categoria: 'Pañales',
      unidad: 'UNIDAD',
      confirmado: 0,
      entradas: 0,
      cuadra: true,
    },
  ],
};

const pantalla = (extra: Record<string, unknown> = {}) => {
  const mapa: Record<string, unknown> = {
    'GET /api/comprobantes/*/conciliacion': DETALLE,
    'GET /api/comprobantes/*/factura': {
      url: 'https://storage/f.webp',
      miniaturaUrl: 'https://storage/m.webp',
      venceEn: '2026-10-04T16:00:00Z',
    },
    'POST /api/comprobantes/*/conciliar': { ...DETALLE, estado: 'CONCILIADO' },
    'POST /api/comprobantes/*/rechazar': { ...DETALLE, estado: 'RECHAZADO' },
    'POST /api/comprobantes/*/revertir-rechazo': DETALLE,
    ...extra,
  };
  responderSegun(Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined)));
  return render(
    envolver(
      <Routes>
        <Route path="/consola/comprobantes/:folio" element={<Conciliacion />} />
      </Routes>,
      `/consola/comprobantes/${FOLIO}`,
      clienteFalso(AUDITOR),
    ),
  );
};
const fila = (nombre: string) => screen.getByRole('row', { name: new RegExp(`^${nombre}`) });

it('compara por categoría lo declarado, lo que llegó y las entradas, en unidad base', async () => {
  pantalla();
  await screen.findByRole('table', { name: 'Por categoría' });
  expect(fila('Arroz')).toHaveTextContent(/5 kg.*4 kg.*4 kg/);
  expect(fila('Agua potable')).toHaveTextContent(/12 L.*12 L.*12 L/);
  expect(screen.getByText('Un paquete roto')).toBeInTheDocument();
  expect(screen.getByText('No llegó')).toBeInTheDocument();
});

it('cada entrada vinculada dice quién la registró y de dónde vino', async () => {
  pantalla();
  const lista = await screen.findByRole('list', { name: 'Entradas vinculadas' });
  const items = within(lista).getAllByRole('listitem');
  expect(items[0]).toHaveTextContent('Arroz · 4 kg');
  expect(items[0]).toHaveTextContent(/Joseph · Recepción/);
  expect(items[1]).toHaveTextContent(/Brayan · Auditor/);
});

it('la factura se pide solo al abrirla', async () => {
  pantalla();
  await screen.findByRole('table', { name: 'Por categoría' });
  expect(peticiones()).not.toContain(`GET /api/comprobantes/${FOLIO}/factura`);
  await userEvent.click(screen.getByRole('button', { name: 'Ver factura' }));
  const hoja = await screen.findByRole('dialog', { name: 'Factura' });
  expect(await within(hoja).findByRole('img', { name: `Factura de ${FOLIO}` })).toHaveAttribute(
    'src',
    'https://storage/f.webp',
  );
});

it('conciliar cierra el comprobante', async () => {
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Conciliar' }));
  await waitFor(() => expect(peticiones()).toContain(`POST /api/comprobantes/${FOLIO}/conciliar`));
});

it('sin entradas vinculadas explica el 422 y ofrece vincular', async () => {
  pantalla({
    'POST /api/comprobantes/*/conciliar': conEstado(422, {
      estado: 422,
      codigo: 'SIN_VINCULOS',
      mensaje: 'Vincula al menos una entrada antes de conciliar',
    }),
  });
  await userEvent.click(await screen.findByRole('button', { name: 'Conciliar' }));
  const alerta = await screen.findByRole('alert');
  expect(alerta).toHaveTextContent('Vincula al menos una entrada antes de conciliar');
  expect(within(alerta).getByRole('button', { name: 'Vincular entradas' })).toBeInTheDocument();
});

it('rechazar pide el motivo; con «Otro» exige la nota', async () => {
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
  const hoja = await screen.findByRole('dialog', { name: `Rechazar ${FOLIO}` });
  const confirmar = within(hoja).getByRole('button', { name: 'Rechazar comprobante' });
  expect(confirmar).toBeDisabled();
  await userEvent.click(within(hoja).getByRole('radio', { name: 'Otro' }));
  expect(confirmar).toBeDisabled();
  await userEvent.type(within(hoja).getByRole('textbox', { name: /Nota/ }), 'Faltó una caja');
  expect(confirmar).toBeEnabled();
  expect(hoja).toHaveTextContent('Le escribimos al Donador con el motivo.');
  await userEvent.click(confirmar);
  expect(await cuerpoDe(`POST /api/comprobantes/${FOLIO}/rechazar`)).toEqual({
    motivo: 'OTRO',
    nota: 'Faltó una caja',
  });
});

it('un rechazado muestra su motivo y deja revertir', async () => {
  pantalla({
    'GET /api/comprobantes/*/conciliacion': {
      ...DETALLE,
      estado: 'RECHAZADO',
      motivoRechazo: 'DUPLICADO',
      notaRechazo: 'Es el mismo de ayer',
    },
  });
  expect(await screen.findByText('Duplicado')).toBeInTheDocument();
  expect(screen.getByText('Es el mismo de ayer')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Conciliar' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Revertir rechazo' }));
  await waitFor(() =>
    expect(peticiones()).toContain(`POST /api/comprobantes/${FOLIO}/revertir-rechazo`),
  );
});

it('un conciliado no tiene acciones', async () => {
  pantalla({
    'GET /api/comprobantes/*/conciliacion': {
      ...DETALLE,
      estado: 'CONCILIADO',
      verificadoEn: '2026-10-05T12:00:00Z',
    },
  });
  expect(await screen.findByText(/Conciliada el/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Conciliar' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
});

it('un folio sin recibir solo deja vincular', async () => {
  pantalla({
    'GET /api/comprobantes/*/conciliacion': {
      ...DETALLE,
      estado: 'PREPARADO',
      recibidoEn: null,
      entradas: [],
      lineas: DETALLE.lineas.map((l) => ({ ...l, cantidadConfirmada: null })),
    },
  });
  expect(
    await screen.findByText(
      'Este folio aún no se recibe. Si se entregó sin red, vincula sus entradas.',
    ),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Vincular entradas' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Conciliar' })).not.toBeInTheDocument();
});

it('un acopio que el Auditor no tiene asignado se explica', async () => {
  pantalla({
    'GET /api/comprobantes/*/conciliacion': conEstado(403, {
      estado: 403,
      codigo: 'PROHIBIDO',
      mensaje: 'No tienes asignado este acopio',
    }),
  });
  expect(await screen.findByText('No tienes asignado este acopio')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Volver a comprobantes' })).toHaveAttribute(
    'href',
    '/consola/comprobantes',
  );
});

it('un folio que no existe lo dice', async () => {
  pantalla({ 'GET /api/comprobantes/*/conciliacion': undefined });
  expect(await screen.findByText('No encontramos ese folio')).toBeInTheDocument();
});

it('axe: sin violaciones graves en la pantalla y en la hoja de rechazo', async () => {
  const { container } = pantalla();
  await screen.findByRole('table', { name: 'Por categoría' });
  expect(await violacionesGraves(container)).toEqual([]);
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
  expect(await violacionesGraves(document.body)).toEqual([]);
});
