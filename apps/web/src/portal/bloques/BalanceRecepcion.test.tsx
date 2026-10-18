import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { conEstado, envolver, responderSegun } from '../../pruebas/utilidades';
import { BalanceRecepcion } from './BalanceRecepcion';

const BALANCE = {
  faltan: [
    { categoriaId: 'c1', categoria: 'Agua potable', acopios: 3 },
    { categoriaId: 'c2', categoria: 'Arroz', acopios: 1 },
  ],
  noTraigan: [{ categoriaId: 'c3', categoria: 'Ropa usada', acopios: 2 }],
};

it('«Qué hace falta» lista las categorías con en cuántos acopios faltan y lleva al mapa', async () => {
  responderSegun({ 'GET /api/publico/balance': BALANCE });
  const { container } = render(envolver(<BalanceRecepcion />));
  const panel = await screen.findByRole('tabpanel');
  expect(await within(panel).findByText('Agua potable')).toBeInTheDocument();
  expect(within(panel).getByText('Falta en 3 acopios')).toBeInTheDocument();
  expect(within(panel).getByText('Falta en 1 acopio')).toBeInTheDocument();
  expect(within(panel).getByRole('link', { name: /Ver mapa de acopios/ })).toHaveAttribute(
    'href',
    '/mapa',
  );
  expect(await violacionesGraves(container)).toEqual([]);
});

it('«No traigan» lista lo que los acopios no reciben', async () => {
  responderSegun({ 'GET /api/publico/balance': BALANCE });
  render(envolver(<BalanceRecepcion />));
  await screen.findByText('Agua potable');
  await userEvent.click(screen.getByRole('tab', { name: 'No traigan' }));
  const panel = screen.getByRole('tabpanel');
  expect(within(panel).getByText('Ropa usada')).toBeInTheDocument();
  expect(within(panel).getByText('2 acopios no lo reciben')).toBeInTheDocument();
});

it('sin datos lo dice en cada pestaña, sin inventar acopios', async () => {
  responderSegun({ 'GET /api/publico/balance': { faltan: [], noTraigan: [] } });
  render(envolver(<BalanceRecepcion />));
  expect(await screen.findByText(/Ningún acopio está por debajo de lo mínimo/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'No traigan' }));
  expect(screen.getByText(/Ningún acopio pide que no le lleven nada/)).toBeInTheDocument();
});

it('si falla la consulta lo dice y deja reintentar', async () => {
  responderSegun({ 'GET /api/publico/balance': conEstado(500, {}) });
  render(envolver(<BalanceRecepcion />));
  expect(await screen.findByText('No se pudo cargar el balance.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
});
