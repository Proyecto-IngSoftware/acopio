import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Zonas } from './Zonas';

vi.mock('../../componentes/mapa/MapaLeaflet', () => ({ default: () => <div>mapa</div> }));

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const emergencia = (id: string, nombre: string, estado = 'ACTIVA') => ({
  id,
  nombre,
  tipo: 'sismo',
  inicio: '2026-09-01T00:00:00.000Z',
  horizonteDias: 7,
  estado,
  destacadaHasta: '2026-12-31T00:00:00.000Z',
  cerradaEn: null,
  motivoCierre: [],
});
const zona = (datos: Record<string, unknown>) => ({
  id: 'z1',
  emergenciaId: 'em1',
  nombre: 'Vereda La Esperanza',
  municipio: 'Chinchiná',
  lat: 4.98,
  lng: -75.6,
  poblacionEstimada: 1250,
  poblacionFuente: 'Junta de acción comunal',
  poblacionFecha: '2026-09-20T00:00:00.000Z',
  estado: 'SIN_ATENDER',
  actualizadoEn: '2026-09-30T00:00:00.000Z',
  ...datos,
});
const RESPUESTAS = {
  'GET /api/emergencias': [
    emergencia('em1', 'Sismo en Caldas'),
    emergencia('em2', 'Inundaciones en el bajo Cauca', 'CERRADA'),
  ],
  'GET /api/zonas': [zona({}), zona({ id: 'z2', nombre: 'Barrio Cervantes', estado: 'CUBIERTA' })],
  'POST /api/zonas': zona({ id: 'z3' }),
};
const pantalla = () => render(envolver(<Zonas />, '/consola/zonas', clienteFalso(ADMIN)));

it('lista las zonas de la emergencia activa con población, fuente y estado', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  const vereda = await screen.findByRole('button', { name: /Vereda La Esperanza/ });
  expect(vereda).toHaveTextContent('1.250 personas');
  expect(vereda).toHaveTextContent('Junta de acción comunal · 20 de septiembre');
  expect(vereda).toHaveTextContent('Sin atender');
  expect(screen.getByRole('button', { name: /Barrio Cervantes/ })).toHaveTextContent('Cubierta');
  expect(peticiones()).toContain('GET /api/zonas?emergencia=em1');
});

it('con la emergencia cerrada avisa, no deja crear y las zonas quedan en solo lectura', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Inundaciones en el bajo Cauca' }),
  );
  expect(await screen.findByText(/Esta emergencia está cerrada/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Nueva zona' })).not.toBeInTheDocument();
  expect(await screen.findByText('Vereda La Esperanza')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Vereda La Esperanza/ })).not.toBeInTheDocument();
  expect(peticiones()).toContain('GET /api/zonas?emergencia=em2');
});

it('sin emergencias lleva a crearlas en el catálogo', async () => {
  responderSegun({ ...RESPUESTAS, 'GET /api/emergencias': [] });
  pantalla();
  expect(await screen.findByRole('link', { name: 'Crear una emergencia' })).toHaveAttribute(
    'href',
    '/consola/catalogo?pestana=emergencias',
  );
});

it('crea una zona con su población y su fuente', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva zona' }));
  const hoja = screen.getByRole('dialog', { name: 'Nueva zona' });
  await userEvent.type(within(hoja).getByLabelText('Nombre'), 'Vereda El Trébol');
  await userEvent.type(within(hoja).getByLabelText('Municipio'), 'Palestina');
  await userEvent.click(within(hoja).getByText('Ajustar coordenadas a mano'));
  await userEvent.type(within(hoja).getByLabelText('Latitud'), '5.01');
  await userEvent.type(within(hoja).getByLabelText('Longitud'), '-75.62');
  await userEvent.type(within(hoja).getByLabelText('Población estimada'), '185');
  await userEvent.type(within(hoja).getByLabelText('Fuente de la población'), 'Líder comunitario');
  await userEvent.type(within(hoja).getByLabelText('Fecha de la estimación'), '2026-09-22');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
  expect(await cuerpoDe('POST /api/zonas')).toEqual({
    emergenciaId: 'em1',
    nombre: 'Vereda El Trébol',
    municipio: 'Palestina',
    lat: 5.01,
    lng: -75.62,
    poblacionEstimada: 185,
    poblacionFuente: 'Líder comunitario',
    poblacionFecha: '2026-09-22',
  });
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  await screen.findByRole('button', { name: /Vereda La Esperanza/ });
  expect(await violacionesGraves(container)).toEqual([]);
});
