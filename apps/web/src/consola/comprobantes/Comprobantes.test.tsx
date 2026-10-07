import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Comprobantes } from './Comprobantes';

const AUDITOR = { id: 'u1', username: 'aud', nombre: 'Michael', rol: 'AUDITOR' as const };
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();
const fila = (folio: string, acopio: string, dias: number, extra: object = {}) => ({
  folio,
  estado: 'PENDIENTE',
  acopio: { id: acopio === 'Acopio Chapinero' ? 'a1' : 'a2', nombre: acopio },
  creadoEn: hace(dias + 1),
  recibidoEn: hace(dias),
  verificadoEn: null,
  motivoRechazo: null,
  notaRechazo: null,
  tieneFactura: false,
  lineas: [],
  conDiferencia: false,
  ...extra,
});
const BANDEJA = {
  comprobantes: [
    fila('ACO-2026-AAAA1', 'Acopio Chapinero', 3, { tieneFactura: true, conDiferencia: true }),
    fila('ACO-2026-BBBB2', 'Acopio Kennedy', 1),
  ],
  porAcopio: [
    { acopioId: 'a1', nombre: 'Acopio Chapinero', pendientes: 5 },
    { acopioId: 'a2', nombre: 'Acopio Kennedy', pendientes: 2 },
  ],
};

function Ubicacion() {
  const l = useLocation();
  return <output aria-label="Ubicación">{l.pathname + l.search}</output>;
}

const pantalla = (bandeja: unknown = BANDEJA, ruta = '/consola/comprobantes') => {
  responderSegun({ 'GET /api/comprobantes': bandeja });
  return render(
    envolver(
      <Routes>
        <Route
          path="/consola/comprobantes"
          element={
            <>
              <Comprobantes />
              <Ubicacion />
            </>
          }
        />
        <Route path="/consola/comprobantes/:folio" element={<Ubicacion />} />
      </Routes>,
      ruta,
      clienteFalso(AUDITOR),
    ),
  );
};

it('lista los pendientes con el acopio, la antigüedad y sus marcas', async () => {
  pantalla();
  const lista = await screen.findByRole('list', { name: 'Comprobantes' });
  const filas = within(lista).getAllByRole('link');
  expect(filas).toHaveLength(2);
  expect(filas[0]).toHaveAttribute('href', '/consola/comprobantes/ACO-2026-AAAA1');
  expect(filas[0]).toHaveTextContent('Acopio Chapinero');
  expect(filas[0]).toHaveTextContent('hace 3 días');
  expect(filas[0]).toHaveTextContent('Factura');
  expect(filas[0]).toHaveTextContent('Con diferencia');
  expect(filas[1]).not.toHaveTextContent('Con diferencia');
  expect(peticiones()).toEqual(['GET /api/comprobantes?estado=PENDIENTE']);
});

it('los chips cuentan los pendientes por acopio y filtran; el filtro queda en la URL', async () => {
  pantalla();
  expect(await screen.findByRole('button', { name: 'Todos 7' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Acopio Kennedy 2' }));
  await waitFor(() =>
    expect(peticiones()).toContain('GET /api/comprobantes?estado=PENDIENTE&acopioId=a2'),
  );
  expect(screen.getByRole('status', { name: 'Ubicación' })).toHaveTextContent(
    '/consola/comprobantes?acopio=a2',
  );
});

it('cambiar de pestaña pide ese estado y lo guarda en la URL', async () => {
  pantalla();
  await screen.findByRole('list', { name: 'Comprobantes' });
  await userEvent.click(screen.getByRole('radio', { name: 'Rechazados' }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/comprobantes?estado=RECHAZADO'));
  expect(screen.getByRole('status', { name: 'Ubicación' })).toHaveTextContent('estado=RECHAZADO');
});

it('lee el filtro de la URL al volver', async () => {
  pantalla(BANDEJA, '/consola/comprobantes?estado=CONCILIADO&acopio=a1');
  await screen.findByRole('list', { name: 'Comprobantes' });
  expect(screen.getByRole('radio', { name: 'Conciliados' })).toBeChecked();
  expect(peticiones()).toEqual(['GET /api/comprobantes?estado=CONCILIADO&acopioId=a1']);
});

it('«Buscar folio» abre la conciliación de ese folio', async () => {
  pantalla();
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Buscar folio' }),
    ' aco-2026-zzzz9',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
  expect(screen.getByRole('status', { name: 'Ubicación' })).toHaveTextContent(
    '/consola/comprobantes/ACO-2026-ZZZZ9',
  );
});

it('con un acopio filtrado sin pendientes, «Todos» sigue a la vista y quita el filtro', async () => {
  pantalla({ comprobantes: [], porAcopio: [] }, '/consola/comprobantes?acopio=a9');
  await userEvent.click(await screen.findByRole('button', { name: 'Todos 0' }));
  expect(screen.getByRole('status', { name: 'Ubicación' })).toHaveTextContent(
    /^\/consola\/comprobantes$/,
  );
});

it('la fila lleva el filtro para que «Volver» lo conserve', async () => {
  pantalla(BANDEJA, '/consola/comprobantes?estado=RECHAZADO&acopio=a1');
  const lista = await screen.findByRole('list', { name: 'Comprobantes' });
  await userEvent.click(within(lista).getAllByRole('link')[0]!);
  expect(screen.getByRole('status', { name: 'Ubicación' })).toHaveTextContent(
    '/consola/comprobantes/ACO-2026-AAAA1',
  );
});

it('vacía, lo dice según la pestaña', async () => {
  pantalla({ comprobantes: [], porAcopio: [] });
  expect(await screen.findByText('No hay comprobantes pendientes')).toBeInTheDocument();
});

it('axe: sin violaciones graves', async () => {
  const { container } = pantalla();
  await screen.findByRole('list', { name: 'Comprobantes' });
  expect(await violacionesGraves(container)).toEqual([]);
});
