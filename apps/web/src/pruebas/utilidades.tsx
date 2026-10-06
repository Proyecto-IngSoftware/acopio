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

const ESTADO = Symbol('estado');

/** Para `responderSegun`: responde ese cuerpo con otro estado HTTP, por ejemplo un 409. */
export function conEstado(estado: number, cuerpo: unknown) {
  return { [ESTADO]: estado, cuerpo };
}

/** Responde según método y ruta: { 'GET /api/canasta': [...], 'POST /api/categorias': {...} }.
 *  La clave puede terminar en una ruta con parámetros escritos como `*`. Lo que no está
 *  en el mapa responde 404. */
export function responderSegun(mapa: Record<string, unknown>): void {
  const reglas = Object.entries(mapa).map(([clave, cuerpo]) => {
    const [metodo, ruta] = clave.split(' ');
    const patron = new RegExp(`^${ruta!.replace(/[.?]/g, '\\$&').replace(/\*/g, '[^/]+')}$`);
    return { metodo, patron, cuerpo };
  });
  vi.spyOn(globalThis, 'fetch').mockImplementation((entrada) => {
    const p = entrada as Request;
    const ruta = new URL(p.url).pathname;
    const regla = reglas.find((r) => r.metodo === p.method && r.patron.test(ruta));
    return Promise.resolve(
      new Response(
        JSON.stringify(
          !regla
            ? { estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'No existe' }
            : estadoDe(regla.cuerpo)
              ? (regla.cuerpo as { cuerpo: unknown }).cuerpo
              : regla.cuerpo,
        ),
        {
          status: !regla ? 404 : (estadoDe(regla.cuerpo) ?? 200),
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
  });
}

function estadoDe(cuerpo: unknown): number | undefined {
  return typeof cuerpo === 'object' && cuerpo !== null && ESTADO in cuerpo
    ? (cuerpo as { [ESTADO]: number })[ESTADO]
    : undefined;
}

/** Peticiones hechas a fetch en esta prueba, como «MÉTODO /ruta?consulta». */
export function peticiones(): string[] {
  return vi.mocked(globalThis.fetch).mock.calls.map(([p]) => {
    const u = new URL((p as Request).url);
    return `${(p as Request).method} ${u.pathname}${u.search}`;
  });
}

/** Cuerpo JSON de la última petición a esta ruta. */
export async function cuerpoDe(metodoYRuta: string): Promise<unknown> {
  const llamada = vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([p]) => p as Request)
    .filter((p) => `${p.method} ${new URL(p.url).pathname}` === metodoYRuta)
    .at(-1);
  return llamada ? llamada.clone().json() : undefined;
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
  registrarDonador: ReturnType<typeof vi.fn>;
  validarEnlace: ReturnType<typeof vi.fn>;
  confirmarCorreo: ReturnType<typeof vi.fn>;
  iniciarSesionDonador: ReturnType<typeof vi.fn>;
} {
  return {
    usuarioActual: vi.fn(() => Promise.resolve(usuario)),
    iniciarSesion: vi.fn(() => Promise.resolve(usuario!)),
    cerrarSesion: vi.fn(() => Promise.resolve()),
    registrarDonador: vi.fn(() => Promise.resolve()),
    validarEnlace: vi.fn(() => Promise.resolve(null)),
    confirmarCorreo: vi.fn(() => Promise.resolve(usuario!)),
    iniciarSesionDonador: vi.fn(() => Promise.resolve(usuario!)),
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
