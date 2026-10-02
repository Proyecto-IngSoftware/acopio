import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cuerpoDe, envolver, peticiones, responderSegun } from '../pruebas/utilidades';
import { useFijarUmbral, useQuitarUmbral, useSaldos } from './inventario';

function Umbral() {
  const saldos = useSaldos('a1');
  const fijar = useFijarUmbral('a1');
  const quitar = useQuitarUmbral('a1');
  return (
    <>
      <p>{saldos.data ? 'saldos' : '…'}</p>
      <button onClick={() => fijar.mutate({ categoriaId: 'c2', minimo: 100, maximo: 400 })}>
        fijar
      </button>
      <button onClick={() => quitar.mutate('c2')}>quitar</button>
    </>
  );
}

const umbral = {
  categoriaId: 'c2',
  minimo: 100,
  maximo: 400,
  actualizadoEn: '2026-10-02T15:00:00Z',
};

it('fijar un umbral manda mínimo y máximo y vuelve a pedir los saldos', async () => {
  responderSegun({ 'GET /api/acopios/a1/saldos': [], 'PUT /api/acopios/a1/umbrales/c2': umbral });
  render(envolver(<Umbral />));
  await screen.findByText('saldos');
  await userEvent.click(screen.getByRole('button', { name: 'fijar' }));
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/acopios/a1/saldos')).toHaveLength(2),
  );
  expect(await cuerpoDe('PUT /api/acopios/a1/umbrales/c2')).toEqual({ minimo: 100, maximo: 400 });
});

it('quitar un umbral lo borra y vuelve a pedir los saldos', async () => {
  responderSegun({ 'GET /api/acopios/a1/saldos': [], 'DELETE /api/acopios/a1/umbrales/c2': {} });
  render(envolver(<Umbral />));
  await screen.findByText('saldos');
  await userEvent.click(screen.getByRole('button', { name: 'quitar' }));
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/acopios/a1/saldos')).toHaveLength(2),
  );
  expect(peticiones()).toContain('DELETE /api/acopios/a1/umbrales/c2');
});
