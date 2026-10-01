import { render, screen, within } from '@testing-library/react';
import { HORARIO_VACIO } from '@acopio/shared';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import { FichaAcopio } from './FichaAcopio';

const HORARIO = {
  ...HORARIO_VACIO,
  lun: [
    { abre: '08:00', cierra: '12:00' },
    { abre: '14:00', cierra: '18:00' },
  ],
  mar: [{ abre: '08:00', cierra: '17:00' }],
};
const ACOPIO = acopioDePrueba({
  id: 'x1',
  horario: HORARIO,
  telefono: '3124567890',
  indicacionesAcceso: 'Entrar por la puerta lateral de la calle 60',
  lat: 4.6486,
  lng: -74.0628,
});
const RESPUESTAS = {
  'GET /api/acopios/x1': ACOPIO,
  'GET /api/acopios/x1/no-recibir': [
    {
      categoriaId: 'c2',
      categoria: 'Ropa usada',
      hasta: '2026-10-15',
      marcadoEn: '2026-10-05T14:00:00.000Z',
    },
  ],
};
const ficha = (ruta = '/acopios/x1') =>
  render(
    envolver(
      <Routes>
        <Route path="/acopios/:id" element={<FichaAcopio />} />
      </Routes>,
      ruta,
    ),
  );

beforeEach(() => {
  // Lunes 5 de octubre, 11:00 en Bogotá
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-05T16:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('muestra el acopio, su entidad sin sello, si está abierto y cómo llegar', async () => {
  responderSegun(RESPUESTAS);
  ficha();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Acopio Chapinero');
  expect(screen.getByText('Fundación Manos Unidas')).toBeInTheDocument();
  expect(screen.queryByText(/Verificad/)).not.toBeInTheDocument();
  expect(screen.getByText('Abierto ahora · Cierra 12:00')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
    'href',
    'https://www.google.com/maps/dir/?api=1&destination=4.6486,-74.0628',
  );
  expect(screen.queryByText(/de ti/)).not.toBeInTheDocument();
});

it('«No traigan» lista lo marcado con su fecha y su antigüedad', async () => {
  responderSegun(RESPUESTAS);
  ficha();
  const tarjeta = await screen.findByRole('region', { name: 'No traigan' });
  expect(tarjeta).toHaveTextContent('Ropa usada');
  expect(tarjeta).toHaveTextContent('hasta el 15 de octubre');
  expect(tarjeta).toHaveTextContent('Actualizado hace 2 h');
});

it('el horario muestra cada tramo y resalta hoy', async () => {
  responderSegun(RESPUESTAS);
  ficha();
  const horario = await screen.findByRole('region', { name: 'Horario de atención' });
  const hoy = within(horario).getByText('Lunes (hoy)').closest('li')!;
  expect(hoy).toHaveTextContent('08:00 a 12:00 · 14:00 a 18:00');
  expect(within(horario).getByText('Domingo').closest('li')).toHaveTextContent('Cerrado');
});

it('llegando desde «Cerca de mí» dice a qué distancia está', async () => {
  responderSegun(RESPUESTAS);
  ficha('/acopios/x1?cerca=4.6486%2C-74.0728');
  expect(await screen.findByText(/A 1,1 km de ti/)).toBeInTheDocument();
});

it('cómo entrar, llamar y compartir por WhatsApp', async () => {
  responderSegun(RESPUESTAS);
  ficha();
  expect(
    await screen.findByText('Entrar por la puerta lateral de la calle 60'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Llamar/ })).toHaveAttribute('href', 'tel:3124567890');
  expect(screen.getByRole('link', { name: /Compartir por WhatsApp/ })).toHaveAttribute(
    'href',
    expect.stringContaining('https://wa.me/?text=Acopio%20Chapinero'),
  );
  expect(screen.getByText('Llega pronto con el inventario.')).toBeInTheDocument();
});

it('un acopio cerrado o que no existe lo dice y lleva al mapa', async () => {
  responderSegun({});
  ficha();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Este acopio ya no está activo',
  );
  expect(screen.getByRole('link', { name: 'Ver el mapa de acopios' })).toHaveAttribute(
    'href',
    '/mapa',
  );
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(RESPUESTAS);
  const { container } = ficha();
  await screen.findByRole('region', { name: 'No traigan' });
  expect(await violacionesGraves(container)).toEqual([]);
});
