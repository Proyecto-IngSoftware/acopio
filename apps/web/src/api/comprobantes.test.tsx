import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import {
  enBase,
  MOTIVOS_RECHAZO,
  motivoDe,
  notaDe,
  useBandeja,
  useComprobante,
  useConciliacion,
  useConciliar,
  useEntradasVinculables,
  useRechazar,
  useRecibir,
  useRevertirRechazo,
  useVincular,
  type Comprobante,
} from './comprobantes';

const FOLIO = 'ACO-2026-7KQ4M';
const COMPROBANTE = {
  folio: FOLIO,
  estado: 'PREPARADO',
  acopio: { id: 'a1', nombre: 'Chapinero' },
};

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(cliente, 'invalidateQueries');
  const envoltura = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return { envoltura, invalidar };
}

it('los motivos de rechazo llevan las etiquetas de la maqueta', () => {
  expect(MOTIVOS_RECHAZO).toEqual({
    DUPLICADO: 'Duplicado',
    NO_CUADRA_MOVIMIENTOS: 'No cuadra con los movimientos',
    DIFERENCIA_SIN_EXPLICAR: 'Diferencia sin explicar',
    OTRO: 'Otro',
  });
});

it('motivoDe y notaDe leen el texto que manda la API (P-031)', () => {
  const c = { motivoRechazo: 'OTRO', notaRechazo: 'Faltó el arroz' } as unknown as Comprobante;
  expect(motivoDe(c)).toBe('OTRO');
  expect(notaDe(c)).toBe('Faltó el arroz');
  const sin = { motivoRechazo: null, notaRechazo: null } as unknown as Comprobante;
  expect(motivoDe(sin)).toBeNull();
  expect(notaDe(sin)).toBeNull();
});

it('enBase multiplica presentaciones por su contenido, a milésimas', () => {
  expect(enBase(12, 0.5)).toBe(6);
  expect(enBase(3, 0.333)).toBe(0.999);
  expect(enBase(4, 1)).toBe(4);
});

it('useComprobante pide el folio; sin folio no consulta', async () => {
  responderSegun({ 'GET /api/comprobantes/*': COMPROBANTE });
  const { envoltura } = conConsultas();
  renderHook(() => useComprobante(null), { wrapper: envoltura });
  const { result } = renderHook(() => useComprobante(FOLIO), { wrapper: envoltura });
  await waitFor(() => expect(result.current.data).toEqual(COMPROBANTE));
  expect(peticiones()).toEqual([`GET /api/comprobantes/${FOLIO}`]);
});

it('useComprobante da null con 404 y no reintenta', async () => {
  responderSegun({});
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useComprobante(FOLIO), { wrapper: envoltura });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
  expect(peticiones()).toHaveLength(1);
});

it('useRecibir manda la recepción e invalida el folio, la bandeja y los saldos del acopio', async () => {
  responderSegun({
    'POST /api/comprobantes/*/recepcion': { comprobante: COMPROBANTE, noRecibe: [] },
  });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useRecibir(FOLIO), { wrapper: envoltura });
  const datos = { acopioId: 'a1', lineas: [{ lineaId: 'l1', cantidadConfirmada: 2 }] };
  await result.current.mutateAsync(datos);
  expect(await cuerpoDe(`POST /api/comprobantes/${FOLIO}/recepcion`)).toEqual(datos);
  expect(invalidar).toHaveBeenCalledWith({ queryKey: ['comprobante', FOLIO] });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: ['bandeja'] });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: ['saldos', 'a1'] });
});

it('useBandeja pide el estado y el acopio', async () => {
  responderSegun({ 'GET /api/comprobantes': { comprobantes: [], porAcopio: [] } });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useBandeja({ estado: 'RECHAZADO', acopioId: 'a1' }), {
    wrapper: envoltura,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/comprobantes?estado=RECHAZADO&acopioId=a1']);
});

it('useConciliacion pide el detalle del folio', async () => {
  responderSegun({ 'GET /api/comprobantes/*/conciliacion': { folio: FOLIO } });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useConciliacion(FOLIO), { wrapper: envoltura });
  await waitFor(() => expect(result.current.data).toEqual({ folio: FOLIO }));
  expect(peticiones()).toEqual([`GET /api/comprobantes/${FOLIO}/conciliacion`]);
});

it('useEntradasVinculables pide con el acopio solo si está activo', async () => {
  responderSegun({ 'GET /api/comprobantes/*/entradas-vinculables': [] });
  const { envoltura } = conConsultas();
  renderHook(() => useEntradasVinculables(FOLIO, 'a2', false), { wrapper: envoltura });
  const { result } = renderHook(() => useEntradasVinculables(FOLIO, 'a2', true), {
    wrapper: envoltura,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual([`GET /api/comprobantes/${FOLIO}/entradas-vinculables?acopioId=a2`]);
});

it.each([
  ['vinculos', () => useVincular(FOLIO), { movimientoIds: ['m1'] }],
  ['conciliar', () => useConciliar(FOLIO), undefined],
  ['rechazar', () => useRechazar(FOLIO), { motivo: 'OTRO', nota: 'Faltó' }],
  ['revertir-rechazo', () => useRevertirRechazo(FOLIO), undefined],
] as const)(
  'la acción %s llama a su ruta e invalida la conciliación y la bandeja',
  async (ruta, hook, cuerpo) => {
    responderSegun({ [`POST /api/comprobantes/*/${ruta}`]: COMPROBANTE });
    const { envoltura, invalidar } = conConsultas();
    const usar = hook as () => { mutateAsync: (d: unknown) => Promise<unknown> };
    const { result } = renderHook(usar, { wrapper: envoltura });
    await result.current.mutateAsync(cuerpo);
    expect(peticiones()).toEqual([`POST /api/comprobantes/${FOLIO}/${ruta}`]);
    if (cuerpo) expect(await cuerpoDe(`POST /api/comprobantes/${FOLIO}/${ruta}`)).toEqual(cuerpo);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['conciliacion', FOLIO] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['bandeja'] });
  },
);
