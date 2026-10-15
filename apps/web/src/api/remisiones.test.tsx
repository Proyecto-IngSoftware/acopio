import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import {
  fechaDelEstado,
  topeLinea,
  urlEvidencia,
  urlRecepcion,
  useCrearRemision,
  useDespachar,
  useRemisiones,
  useZonasVigentes,
  type Excedente,
  type Remision,
} from './remisiones';

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}

it('useRemisiones pide las del estado elegido', async () => {
  responderSegun({ 'GET /api/remisiones': [] });
  const { result } = renderHook(() => useRemisiones({ estado: 'BORRADOR' }), {
    wrapper: conConsultas(),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/remisiones?estado=BORRADOR']);
});

it('useCrearRemision manda el destino, el responsable y las líneas', async () => {
  responderSegun({ 'POST /api/remisiones': { codigo: 'R-2026-K4P7Q' } });
  const { result } = renderHook(() => useCrearRemision(), { wrapper: conConsultas() });
  result.current.mutate({
    acopioId: 'a1',
    zonaId: null,
    responsable: null,
    lineas: [{ categoriaId: 'c1', cantidad: 12 }],
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/remisiones')).toEqual({
    acopioId: 'a1',
    zonaId: null,
    responsable: null,
    lineas: [{ categoriaId: 'c1', cantidad: 12 }],
  });
});

it('useDespachar manda los folios marcados', async () => {
  responderSegun({ 'POST /api/remisiones/*/despachar': { codigo: 'R-2026-K4P7Q' } });
  const { result } = renderHook(() => useDespachar('R-2026-K4P7Q'), { wrapper: conConsultas() });
  result.current.mutate(['ACO-2026-AB12C']);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/remisiones/R-2026-K4P7Q/despachar')).toEqual({
    folios: ['ACO-2026-AB12C'],
  });
});

it('useZonasVigentes deja fuera las zonas de emergencias cerradas', async () => {
  responderSegun({
    'GET /api/emergencias': [
      { id: 'e-activa', estado: 'ACTIVA' },
      { id: 'e-cerrada', estado: 'CERRADA' },
    ],
    'GET /api/zonas': [
      { id: 'z1', emergenciaId: 'e-activa', nombre: 'Barrio San Agustín' },
      { id: 'z2', emergenciaId: 'e-cerrada', nombre: 'Vereda Vieja' },
    ],
  });
  const { result } = renderHook(() => useZonasVigentes(), { wrapper: conConsultas() });
  await waitFor(() => expect(result.current.data).toBeDefined());
  expect(result.current.data!.map((z) => z.id)).toEqual(['z1']);
});

it('topeLinea suma el movible y lo que la línea ya tiene, a milésimas', () => {
  expect(topeLinea({ movible: 40 } as Excedente, 12)).toBe(52);
  expect(topeLinea(undefined, 12)).toBe(12);
  expect(topeLinea({ movible: 0.1 } as Excedente, 0.2)).toBe(0.3);
});

it('urlRecepcion y urlEvidencia arman las rutas de la remisión', () => {
  expect(urlRecepcion('tok')).toBe(`${window.location.origin}/consola/recepciones/qr/tok`);
  expect(urlEvidencia('R-2026-K4P7Q', 0)).toMatch(/\/api\/remisiones\/R-2026-K4P7Q\/evidencia\/0$/);
});

it('fechaDelEstado toma la fecha que corresponde al estado', () => {
  const r = {
    estado: 'EN_TRANSITO',
    creadaEn: '2026-10-15T08:00:00.000Z',
    despachadaEn: '2026-10-15T10:00:00.000Z',
    recibidaEn: null,
    canceladaEn: null,
  } as Remision;
  expect(fechaDelEstado(r)).toBe('2026-10-15T10:00:00.000Z');
  expect(fechaDelEstado({ ...r, estado: 'BORRADOR' })).toBe('2026-10-15T08:00:00.000Z');
});
