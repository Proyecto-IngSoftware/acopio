import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { envolver, peticiones, responderSegun } from '../pruebas/utilidades';
import { acopioDePrueba } from '../pruebas/datos-red';
import { useAcopiosPublicos, useMarcarNoRecibir, useNoRecibir } from './red';

function Lista() {
  const { data } = useAcopiosPublicos({ abiertoAhora: true, cerca: { lat: 4.6, lng: -74.08 } });
  return <p>{data?.map((a) => `${a.nombre}:${a.telefono ?? 'sin teléfono'}`).join(', ')}</p>;
}

it('pide los acopios con sus filtros y entrega los campos vacíos como null (P-031)', async () => {
  responderSegun({ 'GET /api/acopios': [acopioDePrueba({ telefono: [] as never })] });
  render(envolver(<Lista />));
  expect(await screen.findByText('Acopio Chapinero:sin teléfono')).toBeInTheDocument();
  expect(peticiones()[0]).toBe('GET /api/acopios?abiertoAhora=true&cerca=4.6%2C-74.08');
});

function NoRecibe() {
  const { data } = useNoRecibir('a1');
  const marcar = useMarcarNoRecibir('a1');
  return (
    <>
      <p>{data ? data.length : '…'} marcadas</p>
      <button onClick={() => marcar.mutate({ categoriaId: 'c1', hasta: '2026-10-15' })}>
        marcar
      </button>
    </>
  );
}

it('marcar «no recibir» manda la fecha y vuelve a pedir la lista', async () => {
  responderSegun({
    'GET /api/acopios/*/no-recibir': [],
    'PUT /api/acopios/*/no-recibir/*': {
      categoriaId: 'c1',
      categoria: 'Ropa',
      hasta: '2026-10-15',
    },
  });
  render(envolver(<NoRecibe />));
  await screen.findByText('0 marcadas');
  await userEvent.click(screen.getByRole('button', { name: 'marcar' }));
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/acopios/a1/no-recibir')).toHaveLength(2),
  );
  expect(peticiones()).toContain('PUT /api/acopios/a1/no-recibir/c1');
});
