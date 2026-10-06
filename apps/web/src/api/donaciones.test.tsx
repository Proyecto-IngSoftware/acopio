import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import {
  consultarCodigoDonador,
  ESTADOS_DONACION,
  subirFactura,
  useCancelarDonacion,
  useMisDonaciones,
  usePrepararDonacion,
  useSeguimiento,
  useSugerencias,
  useUrlFactura,
} from './donaciones';

const COMPROBANTE = { folio: 'ACO-2026-00001', estado: 'PREPARADO' };

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(cliente, 'invalidateQueries');
  const envoltura = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return { envoltura, invalidar };
}

it('las etiquetas de estado son las de la maqueta', () => {
  expect(ESTADOS_DONACION).toEqual({
    PREPARADO: 'Preparada',
    PENDIENTE: 'Recibida en el acopio',
    CONCILIADO: 'Conciliada',
    RECHAZADO: 'No se pudo conciliar',
    CANCELADO: 'Cancelada',
  });
});

it('useMisDonaciones pide la lista, con el estado si se da', async () => {
  responderSegun({ 'GET /api/donaciones': [COMPROBANTE] });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useMisDonaciones('PENDIENTE'), { wrapper: envoltura });
  await waitFor(() => expect(result.current.data).toEqual([COMPROBANTE]));
  expect(peticiones()).toEqual(['GET /api/donaciones?estado=PENDIENTE']);
});

it('usePrepararDonacion envía la donación e invalida misDonaciones', async () => {
  responderSegun({ 'POST /api/donaciones': COMPROBANTE });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => usePrepararDonacion(), { wrapper: envoltura });
  const datos = { acopioId: 'a1', lineas: [{ categoriaId: 'c1', cantidad: 2 }] };
  await result.current.mutateAsync(datos as never);
  expect(await cuerpoDe('POST /api/donaciones')).toEqual(datos);
  expect(invalidar).toHaveBeenCalledWith({ queryKey: ['misDonaciones'] });
});

it('useCancelarDonacion cancela por folio e invalida misDonaciones', async () => {
  responderSegun({ 'POST /api/donaciones/*/cancelar': { ...COMPROBANTE, estado: 'CANCELADO' } });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useCancelarDonacion(), { wrapper: envoltura });
  await result.current.mutateAsync('ACO-2026-00001');
  expect(peticiones()).toEqual(['POST /api/donaciones/ACO-2026-00001/cancelar']);
  expect(invalidar).toHaveBeenCalledWith({ queryKey: ['misDonaciones'] });
});

it('useSugerencias manda las líneas y la ubicación', async () => {
  responderSegun({ 'POST /api/donaciones/sugerencias': [{ acopioId: 'a1' }] });
  const { envoltura } = conConsultas();
  const lineas = [{ categoriaId: 'c1' }];
  const { result } = renderHook(() => useSugerencias(lineas, { lat: 4.6, lng: -74.1 }), {
    wrapper: envoltura,
  });
  await waitFor(() => expect(result.current.data).toEqual([{ acopioId: 'a1' }]));
  expect(await cuerpoDe('POST /api/donaciones/sugerencias')).toEqual({
    lineas,
    lat: 4.6,
    lng: -74.1,
  });
});

it('useSugerencias no consulta sin líneas', () => {
  responderSegun({});
  const { envoltura } = conConsultas();
  renderHook(() => useSugerencias([]), { wrapper: envoltura });
  expect(peticiones()).toEqual([]);
});

describe('consultarCodigoDonador', () => {
  it('devuelve el código conocido', async () => {
    responderSegun({ 'GET /api/donaciones/codigos/*': { ean: '7701', categoria: 'Arroz' } });
    await expect(consultarCodigoDonador('7701')).resolves.toMatchObject({ categoria: 'Arroz' });
  });
  it('devuelve null con 404', async () => {
    responderSegun({});
    await expect(consultarCodigoDonador('0000')).resolves.toBeNull();
  });
});

it('subirFactura manda FormData con el campo factura', async () => {
  responderSegun({ 'POST /api/donaciones/*/factura': COMPROBANTE });
  const archivo = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });
  await subirFactura('ACO-2026-00001', archivo);
  const p = vi.mocked(globalThis.fetch).mock.calls[0]![0] as Request;
  expect(p.url).toMatch(/\/api\/donaciones\/ACO-2026-00001\/factura$/);
  expect(p.headers.get('content-type')).toMatch(/^multipart\/form-data/);
  const cuerpo = await p.clone().text();
  // jsdom y undici no comparten la clase File: el nombre y el contenido se pierden en la prueba
  expect(cuerpo).toContain('name="factura"');
  expect(cuerpo).toContain('Content-Type: image/jpeg');
});

describe('useUrlFactura', () => {
  it('consulta solo si está activo', async () => {
    responderSegun({ 'GET /api/comprobantes/*/factura': { url: 'u', miniaturaUrl: 'm' } });
    const { envoltura } = conConsultas();
    renderHook(() => useUrlFactura('ACO-2026-00001', false), { wrapper: envoltura });
    expect(peticiones()).toEqual([]);

    const { result } = renderHook(() => useUrlFactura('ACO-2026-00001', true), {
      wrapper: envoltura,
    });
    await waitFor(() => expect(result.current.data).toMatchObject({ url: 'u' }));
  });
});

describe('useSeguimiento', () => {
  it('devuelve el seguimiento', async () => {
    responderSegun({ 'GET /api/seguimiento/*': { folio: 'ACO-2026-00001' } });
    const { envoltura } = conConsultas();
    const { result } = renderHook(() => useSeguimiento('ACO-2026-00001'), { wrapper: envoltura });
    await waitFor(() => expect(result.current.data).toEqual({ folio: 'ACO-2026-00001' }));
  });

  it('con 404 devuelve null y no reintenta', async () => {
    responderSegun({});
    const cliente = new QueryClient();
    const { result } = renderHook(() => useSeguimiento('ACO-2026-99999'), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.data).toBeNull());
    expect(peticiones()).toEqual(['GET /api/seguimiento/ACO-2026-99999']);
  });
});
