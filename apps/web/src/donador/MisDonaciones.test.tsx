import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { conEstado, envolver, peticiones, responderSegun } from '../pruebas/utilidades';
import { MisDonaciones } from './MisDonaciones';

const linea = {
  id: 'l1',
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  perecedero: false,
  ean: null,
  contenidoUnitario: 0.6,
  cantidadDeclarada: 12,
  cantidadConfirmada: null,
  venceEn: null,
  motivoDiferencia: null,
};
const base = {
  id: 'd1',
  folio: 'ACO-2026-7KQ4M',
  estado: 'PREPARADO',
  acopio: { id: 'a1', nombre: 'Parroquia San José' },
  creadoEn: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  lineas: [linea],
};
const recibida = {
  ...base,
  id: 'd2',
  folio: 'ACO-2026-9BL2X',
  estado: 'PENDIENTE',
  acopio: { id: 'a2', nombre: 'Coliseo El Salitre' },
  lineas: [{ ...linea, cantidadConfirmada: 10 }],
};

it('lista las donaciones con folio, estado, acopio, antigüedad y resumen', async () => {
  responderSegun({ 'GET /api/donaciones': [base, recibida] });
  render(envolver(<MisDonaciones />, '/donador'));
  expect(await screen.findByText('ACO-2026-7KQ4M')).toBeInTheDocument();
  expect(screen.getByText('ACO-2026-9BL2X')).toBeInTheDocument();
  expect(screen.getByText('Preparada')).toBeInTheDocument();
  expect(screen.getByText('Recibida en el acopio')).toBeInTheDocument();
  expect(screen.getByText(/Parroquia San José · hace 2 h/)).toBeInTheDocument();
  // 12 × 0,6 L declarados; 10 × 0,6 L confirmados
  expect(screen.getByText('Agua potable 7,2 L')).toBeInTheDocument();
  expect(screen.getByText('Agua potable 6 L')).toBeInTheDocument();
});

it('«Ver folio» y «Cancelar» solo en las preparadas; «Seguir» en todas', async () => {
  responderSegun({ 'GET /api/donaciones': [base, recibida] });
  render(envolver(<MisDonaciones />, '/donador'));
  await screen.findByText('ACO-2026-7KQ4M');
  expect(screen.getAllByRole('link', { name: 'Seguir' })).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Seguir' })[0]).toHaveAttribute(
    'href',
    '/seguimiento/ACO-2026-7KQ4M',
  );
  expect(screen.getAllByRole('link', { name: 'Ver folio' })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Ver folio' })).toHaveAttribute(
    'href',
    '/donar?folio=ACO-2026-7KQ4M',
  );
  expect(screen.getAllByRole('button', { name: 'Cancelar donación' })).toHaveLength(1);
});

it('el chip «Recibidas» pide las pendientes', async () => {
  responderSegun({ 'GET /api/donaciones': [base] });
  render(envolver(<MisDonaciones />, '/donador'));
  await screen.findByText('ACO-2026-7KQ4M');
  await userEvent.click(screen.getByRole('radio', { name: 'Recibidas' }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/donaciones?estado=PENDIENTE'));
});

it('cancelar pide confirmación y llama al endpoint', async () => {
  responderSegun({
    'GET /api/donaciones': [base],
    'POST /api/donaciones/*/cancelar': { ...base, estado: 'CANCELADO' },
  });
  render(envolver(<MisDonaciones />, '/donador'));
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar donación' }));
  expect(peticiones().some((p) => p.includes('/cancelar'))).toBe(false);
  const hoja = await screen.findByRole('dialog');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Sí, cancelar' }));
  await waitFor(() =>
    expect(peticiones()).toContain('POST /api/donaciones/ACO-2026-7KQ4M/cancelar'),
  );
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('un 409 al cancelar muestra el mensaje de la API', async () => {
  responderSegun({
    'GET /api/donaciones': [base],
    'POST /api/donaciones/*/cancelar': conEstado(409, {
      estado: 409,
      codigo: 'CONFLICTO',
      mensaje: 'La donación ya no está preparada',
    }),
  });
  render(envolver(<MisDonaciones />, '/donador'));
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar donación' }));
  await userEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sí, cancelar' }),
  );
  expect(await screen.findByText('La donación ya no está preparada')).toBeInTheDocument();
});

it('sin donaciones muestra el vacío con el botón', async () => {
  responderSegun({ 'GET /api/donaciones': [] });
  render(envolver(<MisDonaciones />, '/donador'));
  expect(await screen.findByText('Todavía no preparas ninguna donación')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Preparar una donación' })[0]).toHaveAttribute(
    'href',
    '/donar',
  );
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/donaciones': [base, recibida] });
  const { container } = render(envolver(<MisDonaciones />, '/donador'));
  await screen.findByText('ACO-2026-7KQ4M');
  expect(await violacionesGraves(container)).toEqual([]);
});
