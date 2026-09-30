import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import type { ClienteAuth, UsuarioSesion } from '../sesion/cliente-auth';
import { SesionProveedor } from '../sesion/Sesion';

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

/** ClienteAuth de prueba: responde con este usuario (o sin sesión) y no llama a fetch. */
export function clienteFalso(usuario: UsuarioSesion | null = null): ClienteAuth & {
  iniciarSesion: ReturnType<typeof vi.fn>;
  cerrarSesion: ReturnType<typeof vi.fn>;
  usuarioActual: ReturnType<typeof vi.fn>;
} {
  return {
    usuarioActual: vi.fn(() => Promise.resolve(usuario)),
    iniciarSesion: vi.fn(() => Promise.resolve(usuario!)),
    cerrarSesion: vi.fn(() => Promise.resolve()),
  };
}

/** Envuelve con un cliente de consultas sin reintentos, un enrutador en memoria y el
 *  estado de sesión (por defecto, sin sesión). */
export function envolver(ui: ReactNode, ruta = '/', cliente = clienteFalso()): ReactElement {
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={consultas}>
      <MemoryRouter initialEntries={[ruta]}>
        <SesionProveedor cliente={cliente}>{ui}</SesionProveedor>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
