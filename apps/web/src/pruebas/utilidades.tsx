import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

/** Toda llamada a fetch responde este JSON. */
export function responderJson(cuerpo: unknown, estado = 200): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

/** fetch falla como cuando no hay red. */
export function responderError(): void {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
}

/** Envuelve con un cliente de consultas sin reintentos y un enrutador en memoria. */
export function envolver(ui: ReactNode, ruta = '/'): ReactElement {
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={consultas}>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
