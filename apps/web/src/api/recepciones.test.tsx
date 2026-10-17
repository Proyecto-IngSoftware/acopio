import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import { cuerpoDe, peticiones, responderSegun } from '../pruebas/utilidades';
import {
  pendientesDeResolver,
  tokenDeQr,
  useRecepciones,
  useRemisionPorQr,
  useRecibirRemision,
  useSubirEvidencia,
  type ReporteNecesidad,
} from './recepciones';

function conConsultas() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
}

// La API genera el token con randomBytes(18) en base64url: 24 caracteres
const TOKEN = 'AbCdEfGhIjKlMnOpQrSt_-12';

it('tokenDeQr saca el token de la URL del documento o acepta el token suelto', () => {
  expect(tokenDeQr(`https://acopio.josephqaz.dev/consola/recepciones/qr/${TOKEN}`)).toBe(TOKEN);
  expect(tokenDeQr(TOKEN)).toBe(TOKEN);
  expect(tokenDeQr('https://otra.com/x')).toBeNull();
  expect(tokenDeQr('  ')).toBeNull();
});

it('tokenDeQr rechaza lo que no tiene la forma del token', () => {
  // Un código de barras de producto (EAN-13)
  expect(tokenDeQr('7702004003508')).toBeNull();
  expect(tokenDeQr('https://acopio.josephqaz.dev/consola/recepciones/qr/abc123')).toBeNull();
  expect(tokenDeQr(`${TOKEN}x`)).toBeNull();
  expect(tokenDeQr('AbCdEfGhIjKlMnOpQrSt+/12')).toBeNull();
});

const reporte = (r: Partial<ReporteNecesidad>): ReporteNecesidad => ({
  id: crypto.randomUUID(),
  categoriaId: 'agua',
  categoria: 'Agua potable',
  nota: null,
  resuelta: false,
  reportadoPor: 'Alejandra',
  reportadoEn: '2026-10-16T10:00:00Z',
  ...r,
});

it('pendientesDeResolver deja la última de cada categoría y solo las que siguen faltando', () => {
  const lista = pendientesDeResolver([
    reporte({ reportadoEn: '2026-10-16T09:00:00Z' }),
    reporte({ resuelta: true, reportadoEn: '2026-10-16T11:00:00Z' }),
    reporte({ categoriaId: 'arroz', categoria: 'Arroz' }),
  ]);
  expect(lista.map((r) => r.categoria)).toEqual(['Arroz']);
});

it('useSubirEvidencia manda la foto como FormData con el campo foto', async () => {
  responderSegun({ 'POST /api/remisiones/*/evidencia': { codigo: 'R-2026-DEMA2' } });
  const { result } = renderHook(() => useSubirEvidencia('R-2026-DEMA2'), {
    wrapper: conConsultas(),
  });
  result.current.mutate(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  const p = vi.mocked(globalThis.fetch).mock.calls[0]![0] as Request;
  expect(p.url).toMatch(/\/api\/remisiones\/R-2026-DEMA2\/evidencia$/);
  expect(p.headers.get('content-type')).toMatch(/^multipart\/form-data/);
  expect(await p.clone().text()).toContain('name="foto"');
});

it('useRecibirRemision manda la zona y la nota, y vuelve a pedir lo que está por recibir', async () => {
  responderSegun({
    'GET /api/recepciones': [],
    'POST /api/remisiones/*/recibir': { codigo: 'R-2026-DEMA3' },
  });
  const wrapper = conConsultas();
  const lista = renderHook(() => useRecepciones(), { wrapper });
  await waitFor(() => expect(lista.result.current.isSuccess).toBe(true));
  const { result } = renderHook(() => useRecibirRemision('R-2026-DEMA3'), { wrapper });
  result.current.mutate({ zonaId: 'z1', nota: 'Dos bultos mojados' });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(await cuerpoDe('POST /api/remisiones/R-2026-DEMA3/recibir')).toEqual({
    zonaId: 'z1',
    nota: 'Dos bultos mojados',
  });
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/recepciones')).toHaveLength(2),
  );
});

it('al recibir también vuelve a pedir la remisión del QR', async () => {
  responderSegun({
    'GET /api/recepciones/qr/*': { codigo: 'R-2026-DEMA2' },
    'POST /api/remisiones/*/recibir': { codigo: 'R-2026-DEMA2' },
  });
  const wrapper = conConsultas();
  const qr = renderHook(() => useRemisionPorQr('tok1'), { wrapper });
  await waitFor(() => expect(qr.result.current.isSuccess).toBe(true));
  const { result } = renderHook(() => useRecibirRemision('R-2026-DEMA2'), { wrapper });
  result.current.mutate({});
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/recepciones/qr/tok1')).toHaveLength(2),
  );
});
