import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import {
  pesosValidos,
  sumaPesos,
  ultimaRonda,
  useAjustarPoblacion,
  useAprobar,
  useConfiguracion,
  useCorregirNecesidad,
  useDescartar,
  useDescartes,
  useFichaZona,
  useGuardarConfiguracion,
  useRecalcular,
  useSugerenciasMotor,
  useVistaPrevia,
  type Sugerencia,
} from './motor';

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(cliente, 'invalidateQueries');
  const envoltura = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return { envoltura, invalidar };
}
const claves = (invalidar: ReturnType<typeof conConsultas>['invalidar']) =>
  invalidar.mock.calls.map(([f]) => (f as { queryKey: unknown[] }).queryKey);

const PESOS = { criticidad: 0.4, urgencia: 0.2, proximidad: 0.15, magnitud: 0.25 };

it('sumaPesos y pesosValidos usan la tolerancia de la API', () => {
  expect(sumaPesos({ ...PESOS, magnitud: 0.3 })).toBe(1.05);
  expect(pesosValidos({ ...PESOS, magnitud: 0.3 })).toBe(false);
  expect(sumaPesos(PESOS)).toBe(1);
  expect(pesosValidos(PESOS)).toBe(true);
});

it('ultimaRonda toma la ronda más reciente, o null sin sugerencias', () => {
  const s = (ronda: string) => ({ ronda }) as Sugerencia;
  expect(ultimaRonda([s('2026-10-14T08:00:00Z'), s('2026-10-14T09:40:00Z')])).toBe(
    '2026-10-14T09:40:00Z',
  );
  expect(ultimaRonda([])).toBeNull();
});

it('useFichaZona pide la necesidad de la zona', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': { zona: { id: 'z1' }, categorias: [] } });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useFichaZona('z1'), { wrapper: envoltura });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/zonas/z1/necesidad']);
});

it('useCorregirNecesidad manda cantidad y motivo e invalida la ficha y las sugerencias', async () => {
  responderSegun({ 'PUT /api/zonas/*/necesidad-manual/*': { cantidad: 10000 } });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useCorregirNecesidad('z1'), { wrapper: envoltura });
  await result.current.mutateAsync({
    categoriaId: 'c1',
    cantidad: 10000,
    motivo: 'Llegaron 300 familias desplazadas',
  });
  expect(await cuerpoDe('PUT /api/zonas/z1/necesidad-manual/c1')).toEqual({
    cantidad: 10000,
    motivo: 'Llegaron 300 familias desplazadas',
  });
  expect(claves(invalidar)).toEqual(
    expect.arrayContaining([['ficha-zona', 'z1'], ['sugerencias']]),
  );
});

it('useAjustarPoblacion manda solo los tres campos de la población', async () => {
  responderSegun({ 'PATCH /api/zonas/*': { id: 'z1' } });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useAjustarPoblacion('z1'), { wrapper: envoltura });
  await result.current.mutateAsync({
    poblacionEstimada: 1500,
    poblacionFuente: 'Censo de la alcaldía',
    poblacionFecha: '2026-10-14',
  });
  expect(await cuerpoDe('PATCH /api/zonas/z1')).toEqual({
    poblacionEstimada: 1500,
    poblacionFuente: 'Censo de la alcaldía',
    poblacionFecha: '2026-10-14',
  });
  expect(claves(invalidar)).toEqual(expect.arrayContaining([['ficha-zona', 'z1'], ['zonas']]));
});

it('useSugerenciasMotor pasa los filtros como consulta', async () => {
  responderSegun({ 'GET /api/sugerencias': [] });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useSugerenciasMotor({ estado: 'PROPUESTA', zona: 'z1' }), {
    wrapper: envoltura,
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/sugerencias?estado=PROPUESTA&zona=z1']);
});

it('useRecalcular invalida las sugerencias', async () => {
  responderSegun({ 'POST /api/sugerencias/recalcular': { ronda: 'x', generadas: 2 } });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useRecalcular(), { wrapper: envoltura });
  expect((await result.current.mutateAsync()).generadas).toBe(2);
  expect(claves(invalidar)).toEqual(expect.arrayContaining([['sugerencias']]));
});

it('useAprobar manda la cantidad e invalida sugerencias y fichas', async () => {
  responderSegun({
    'POST /api/sugerencias/*/aprobar': {
      sugerenciaId: 's1',
      cantidad: 500,
      remision: { id: 'r1', codigo: 'R-2026-K4P7Q', creada: true },
    },
  });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useAprobar(), { wrapper: envoltura });
  const r = await result.current.mutateAsync({ id: 's1', cantidad: 500 });
  expect(r.remision.codigo).toBe('R-2026-K4P7Q');
  expect(await cuerpoDe('POST /api/sugerencias/s1/aprobar')).toEqual({ cantidad: 500 });
  expect(claves(invalidar)).toEqual(expect.arrayContaining([['sugerencias'], ['ficha-zona']]));
});

it('useDescartar manda el motivo e invalida sugerencias y descartes', async () => {
  responderSegun({ 'POST /api/sugerencias/*/descartar': { id: 's1' } });
  const { envoltura, invalidar } = conConsultas();
  const { result } = renderHook(() => useDescartar(), { wrapper: envoltura });
  await result.current.mutateAsync({ id: 's1', motivo: 'La vía está cerrada' });
  expect(await cuerpoDe('POST /api/sugerencias/s1/descartar')).toEqual({
    motivo: 'La vía está cerrada',
  });
  expect(claves(invalidar)).toEqual(expect.arrayContaining([['sugerencias'], ['descartes']]));
});

it('useDescartes pide desde una fecha', async () => {
  responderSegun({ 'GET /api/sugerencias/descartes': { total: 0 } });
  const { envoltura } = conConsultas();
  const { result } = renderHook(() => useDescartes('2026-09-14'), { wrapper: envoltura });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(peticiones()).toEqual(['GET /api/sugerencias/descartes?desde=2026-09-14']);
});

it('la configuración se lee y se guarda con pesos y cantidad mínima', async () => {
  responderSegun({
    'GET /api/motor/configuracion': { pesos: PESOS, cantidadMinima: 20 },
    'PUT /api/motor/configuracion': { pesos: PESOS, cantidadMinima: 20 },
  });
  const { envoltura, invalidar } = conConsultas();
  const leer = renderHook(() => useConfiguracion(), { wrapper: envoltura });
  await waitFor(() => expect(leer.result.current.data?.cantidadMinima).toBe(20));
  const guardar = renderHook(() => useGuardarConfiguracion(), { wrapper: envoltura });
  await guardar.result.current.mutateAsync({ pesos: PESOS, cantidadMinima: 20 });
  expect(await cuerpoDe('PUT /api/motor/configuracion')).toEqual({
    pesos: PESOS,
    cantidadMinima: 20,
  });
  expect(claves(invalidar)).toEqual(
    expect.arrayContaining([['configuracion-motor'], ['sugerencias']]),
  );
});

it('useVistaPrevia no pide nada sin datos y manda los pesos con datos', async () => {
  responderSegun({
    'POST /api/motor/configuracion/vista-previa': { actual: [], propuesta: [] },
  });
  const { envoltura } = conConsultas();
  const sin = renderHook(() => useVistaPrevia(null), { wrapper: envoltura });
  expect(sin.result.current.fetchStatus).toBe('idle');
  expect(peticiones()).toEqual([]);
  const con = renderHook(() => useVistaPrevia({ pesos: PESOS, cantidadMinima: 20 }), {
    wrapper: envoltura,
  });
  await waitFor(() => expect(con.result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/motor/configuracion/vista-previa')).toEqual({
    pesos: PESOS,
    cantidadMinima: 20,
  });
});
