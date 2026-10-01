import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../../pruebas/utilidades';
import { ACOPIO, SALDOS } from './datos-prueba';
import { Historial } from './Historial';

const AUDITOR = { id: 'a', username: 'a', nombre: 'Andrés Pinto', rol: 'AUDITOR' as const };

const mov = (datos: Record<string, unknown>) => ({
  id: 'm0',
  tipo: 'ENTRADA',
  categoriaId: 'c2',
  cantidad: 1,
  signo: 1,
  motivoSalida: null,
  nota: null,
  motivo: null,
  venceEn: null,
  ocurridoEn: '2026-10-01T15:00:00.000Z',
  registradoEn: '2026-10-01T15:00:00.000Z',
  origenOffline: false,
  usuario: 'Daniela Méndez',
  saldoDespues: 0,
  ...datos,
});

const PAGINA_1 = {
  filas: [
    mov({
      id: 'm4',
      tipo: 'AJUSTE',
      signo: -1,
      cantidad: 3,
      motivo: 'Tres bolsas mojadas en la bodega',
      saldoDespues: 120,
    }),
    mov({
      id: 'm3',
      tipo: 'SALIDA',
      signo: -1,
      cantidad: 50,
      motivoSalida: 'ENTREGA_FAMILIAS',
      usuario: 'Jorge Rincón',
      saldoDespues: 123,
    }),
    mov({
      id: 'm2',
      cantidad: 80,
      venceEn: '2026-10-30',
      origenOffline: true,
      ocurridoEn: '2026-10-01T20:14:00.000Z',
      registradoEn: '2026-10-01T23:02:00.000Z',
      saldoDespues: 173,
    }),
  ],
  siguiente: '7',
};
const PAGINA_2 = {
  filas: [mov({ id: 'm1', cantidad: 40, venceEn: '2026-10-12', saldoDespues: 93 })],
  siguiente: null,
};

function simular() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((entrada) => {
    const url = new URL((entrada as Request).url);
    const cuerpo = url.pathname.endsWith('/movimientos')
      ? url.searchParams.get('cursor') === '7'
        ? PAGINA_2
        : PAGINA_1
      : url.pathname.endsWith('/saldos')
        ? SALDOS
        : ACOPIO;
    return Promise.resolve(
      new Response(JSON.stringify(cuerpo), { headers: { 'content-type': 'application/json' } }),
    );
  });
}

const pantalla = () => {
  simular();
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/inventario/:categoriaId" element={<Historial />} />
      </Routes>,
      '/consola/acopios/x1/inventario/c2',
      clienteFalso(AUDITOR),
    ),
  );
};

describe('Historial', () => {
  it('la tarjeta resume saldo, estado, umbral y vencimiento estimado', async () => {
    pantalla();
    expect(await screen.findByRole('heading', { name: 'Arroz' })).toBeInTheDocument();
    const resumen = screen.getByRole('region', { name: 'Saldo' });
    expect(resumen).toHaveTextContent('120 kg');
    expect(resumen).toHaveTextContent('Cerca del mínimo');
    expect(resumen).toHaveTextContent('Mínimo 100 kg · Máximo 400 kg');
    expect(resumen).toHaveTextContent('Vence primero: 40 kg el 12 de octubre (estimado)');
  });

  it('cada movimiento dice qué fue, quién lo hizo y el saldo que dejó', async () => {
    pantalla();
    const lista = await screen.findByRole('list', { name: 'Movimientos' });
    const filas = within(lista).getAllByRole('listitem');
    expect(filas[0]).toHaveTextContent('Ajuste −3 kg');
    expect(filas[0]).toHaveTextContent('«Tres bolsas mojadas en la bodega»');
    expect(filas[0]).toHaveTextContent('Saldo 120 kg');
    expect(filas[1]).toHaveTextContent('Salida −50 kg');
    expect(filas[1]).toHaveTextContent('Entrega directa a familias');
    expect(filas[1]).toHaveTextContent('Jorge Rincón');
    expect(filas[2]).toHaveTextContent('Entrada +80 kg');
    expect(filas[2]).toHaveTextContent('Vence el 30 de octubre');
  });

  it('marca lo registrado sin conexión con sus dos horas', async () => {
    pantalla();
    const lista = await screen.findByRole('list', { name: 'Movimientos' });
    const offline = within(lista).getAllByRole('listitem')[2]!;
    expect(offline).toHaveTextContent('Registrada sin conexión');
    expect(offline).toHaveTextContent(/Ocurrió .+ · llegó .+/);
  });

  it('«Cargar más» trae la página siguiente y desaparece al final', async () => {
    pantalla();
    await screen.findByRole('list', { name: 'Movimientos' });
    await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
    expect(await screen.findByText('Entrada +40 kg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
  });

  it('no tiene violaciones graves', async () => {
    const { container } = pantalla();
    await screen.findByRole('list', { name: 'Movimientos' });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
