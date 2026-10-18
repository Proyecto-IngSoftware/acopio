import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { causaDePrueba } from '../../pruebas/datos-causas';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Directorio } from './Directorio';

const DOS = [
  causaDePrueba(),
  causaDePrueba({
    id: 'c2',
    categoria: 'ANIMALES',
    titulo: 'Alimento para animales rescatados',
    entidad: {
      id: 'e2',
      nombre: 'Huellas del Putumayo',
      tieneLogo: false,
      verificadaEn: '2026-08-10T15:00:00.000Z',
    },
  }),
];

it('muestra las causas con su sello y el aviso de que Acopio no recibe dinero', async () => {
  responderSegun({ 'GET /api/causas': DOS });
  const { container } = render(envolver(<Directorio />, '/causas'));
  expect(
    await screen.findByText('Mercados para familias damnificadas en Mocoa'),
  ).toBeInTheDocument();
  expect(screen.getByText('Verificada el 12 de agosto de 2026')).toBeInTheDocument();
  expect(screen.getByText(/Acopio no recibe dinero/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Mercados para familias/ })).toHaveAttribute(
    'href',
    '/causas/c1',
  );
  // Personas desaparecidas siempre está en «Todas», al final
  expect(screen.getByRole('heading', { name: 'Personas desaparecidas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Causas atendidas/ })).toHaveAttribute(
    'href',
    '/causas/atendidas',
  );
  expect(await violacionesGraves(container)).toEqual([]);
});

it('el chip de personas desaparecidas muestra solo los tres enlaces oficiales', async () => {
  responderSegun({ 'GET /api/causas': DOS });
  render(envolver(<Directorio />, '/causas'));
  await screen.findByText('Mercados para familias damnificadas en Mocoa');
  await userEvent.click(screen.getByRole('button', { name: 'Personas desaparecidas' }));
  expect(
    screen.queryByText('Mercados para familias damnificadas en Mocoa'),
  ).not.toBeInTheDocument();
  const tarjeta = screen.getByRole('region', { name: 'Personas desaparecidas' });
  const enlaces = within(tarjeta).getAllByRole('link');
  expect(enlaces.map((e) => e.getAttribute('href'))).toEqual([
    'https://ubpdbusquedadesaparecidos.co',
    'https://www.cruzrojacolombiana.org',
    'https://www.medicinalegal.gov.co',
  ]);
  for (const e of enlaces) expect(e).toHaveAttribute('rel', 'noopener noreferrer');
});

it('un chip de categoría pide solo esa categoría', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Directorio />, '/causas'));
  await userEvent.click(await screen.findByRole('button', { name: 'Animales' }));
  expect(await screen.findByText('Aún no hay causas de animales')).toBeInTheDocument();
  expect(peticiones()).toContain('GET /api/causas?categoria=ANIMALES');
});

it('sin causas publicadas lo dice, y deja personas desaparecidas', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Directorio />, '/causas'));
  expect(await screen.findByText('Aún no hay causas')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Personas desaparecidas' })).toBeInTheDocument();
});
