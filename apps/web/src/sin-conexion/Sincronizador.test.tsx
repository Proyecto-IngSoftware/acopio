import { act, render, screen, waitFor } from '@testing-library/react';
import { useSaldos } from '../api/inventario';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { encolar, listarCola } from './cola';
import { useEnLinea } from './en-linea';
import { pedirEnvio, Sincronizador } from './Sincronizador';

const operadora = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const creado = { movimiento: { id: 'm' }, saldo: 1, noRecibe: false };

/** La API: cada POST de entrada responde lo que diga `estado()`; los saldos, vacío. */
function api(estado: () => number | 'sin-red') {
  const llamadas: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada) => {
    const p = entrada as Request;
    llamadas.push(`${p.method} ${new URL(p.url).pathname}`);
    if (p.method === 'GET') return Response.json([]);
    const e = estado();
    if (e === 'sin-red') throw new TypeError('Failed to fetch');
    return Response.json(e < 300 ? creado : { estado: e, codigo: 'X', mensaje: 'X' }, {
      status: e,
    });
  });
  return llamadas;
}

const entradas = (llamadas: string[]) => llamadas.filter((l) => l.startsWith('POST')).length;

function Saldos() {
  useSaldos('x1');
  return null;
}

describe('Sincronizador de la cola (O-03)', () => {
  it('al abrir con sesión envía lo que quedó en la cola', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
    api(() => 201);

    render(envolver(<Sincronizador />, '/', clienteFalso(operadora)));

    await waitFor(async () => expect(await listarCola('u1')).toEqual([]));
  });

  it('sin sesión no envía nada', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
    const llamadas = api(() => 201);

    render(envolver(<Sincronizador />, '/', clienteFalso(null)));

    await new Promise((r) => setTimeout(r, 50));
    expect(entradas(llamadas)).toBe(0);
  });

  it('cuando vuelve la señal (evento online) envía sin que nadie toque nada', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
    let red: 'sin-red' | 201 = 'sin-red';
    // Sin reintentos automáticos en esta prueba: solo el evento debe disparar el envío
    api(() => red);
    render(envolver(<Sincronizador espera={() => 60_000} />, '/', clienteFalso(operadora)));
    await waitFor(async () => expect(await listarCola('u1')).toHaveLength(1));

    red = 201;
    act(() => void window.dispatchEvent(new Event('online')));

    await waitFor(async () => expect(await listarCola('u1')).toEqual([]));
  });

  it('si el envío falla por la red o el servidor, reintenta solo', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
    let intentos = 0;
    api(() => (++intentos < 3 ? 503 : 201));

    render(envolver(<Sincronizador espera={() => 10} />, '/', clienteFalso(operadora)));

    await waitFor(async () => expect(await listarCola('u1')).toEqual([]));
    expect(intentos).toBe(3);
  });

  it('una pantalla puede pedir el envío (C4 al abrir)', async () => {
    const llamadas = api(() => 201);
    render(envolver(<Sincronizador />, '/', clienteFalso(operadora)));
    // El envío del arranque, con la cola vacía, ya terminó
    await new Promise((r) => setTimeout(r, 20));
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });

    act(() => pedirEnvio());

    await waitFor(() => expect(entradas(llamadas)).toBe(1));
  });

  it('después de enviar vuelve a pedir los saldos', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
    const llamadas = api(() => 201);

    render(
      envolver(
        <>
          <Sincronizador />
          <Saldos />
        </>,
        '/',
        clienteFalso(operadora),
      ),
    );

    await waitFor(() =>
      expect(
        llamadas.filter((l) => l === 'GET /api/acopios/x1/saldos').length,
      ).toBeGreaterThanOrEqual(2),
    );
  });
});

describe('useEnLinea', () => {
  function Estado() {
    return <p>{useEnLinea() ? 'Con red' : 'Sin red'}</p>;
  }

  it('sigue los eventos online y offline del navegador', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<Estado />);
    expect(screen.getByText('Con red')).toBeInTheDocument();

    enLinea.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByText('Sin red')).toBeInTheDocument();

    enLinea.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.getByText('Con red')).toBeInTheDocument();
  });
});
