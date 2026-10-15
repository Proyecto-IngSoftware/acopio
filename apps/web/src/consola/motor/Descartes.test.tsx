import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Descartes } from './Descartes';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };

const descartada = {
  id: 's9',
  ronda: '2026-10-14T14:40:00.000Z',
  estado: 'DESCARTADA',
  acopio: { id: 'a-kennedy', nombre: 'Acopio Kennedy' },
  zona: { id: 'z-agustin', nombre: 'Barrio San Agustín' },
  emergencia: { id: 'e1', nombre: 'Inundaciones Putumayo' },
  categoria: { id: 'c-arroz', nombre: 'Arroz', unidad: 'KILOGRAMO' },
  cantidad: 440,
  puntaje: 0.48,
  desglose: { criticidad: 0.97, urgencia: 0.4, proximidad: 0.04, magnitud: 0.63 },
  justificacion: 'Barrio San Agustín tiene 3 % de cobertura en arroz',
  cantidadAprobada: null,
  remisionCodigo: null,
  motivoDescarte: 'La vía está cerrada',
  decididaPor: 'Joseph Quintero',
  decididaEn: '2026-10-14T15:02:00.000Z',
};

const INFORME = {
  total: 14,
  porMotivo: [
    { nombre: 'La vía está cerrada', veces: 6 },
    { nombre: 'El acopio ya comprometió ese insumo', veces: 5 },
    { nombre: 'Otros', veces: 3 },
  ],
  porCategoria: [
    { nombre: 'Arroz', veces: 8 },
    { nombre: 'Agua potable', veces: 6 },
  ],
  porAcopio: [
    { nombre: 'Acopio Kennedy', veces: 9 },
    { nombre: 'Acopio Suba', veces: 5 },
  ],
  recientes: [descartada],
};

const pantalla = () =>
  render(envolver(<Descartes />, '/consola/motor/descartes', clienteFalso(ADMIN)));

afterEach(() => vi.useRealTimers());

it('pide los descartes de los últimos 30 días y muestra los conteos', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
  responderSegun({ 'GET /api/sugerencias/descartes': INFORME });
  pantalla();
  expect(await screen.findByText('14')).toBeInTheDocument();
  expect(peticiones()).toContain('GET /api/sugerencias/descartes?desde=2026-09-14');
  const motivos = screen.getByRole('table', { name: 'Por motivo' });
  expect(within(motivos).getByRole('row', { name: /La vía está cerrada/ })).toHaveTextContent('6');
  const acopios = screen.getByRole('table', { name: 'Por acopio' });
  expect(within(acopios).getByRole('row', { name: /Acopio Kennedy/ })).toHaveTextContent('9');
});

it('lista los descartes recientes con su motivo', async () => {
  responderSegun({ 'GET /api/sugerencias/descartes': INFORME });
  pantalla();
  const recientes = await screen.findByRole('region', { name: 'Recientes' });
  expect(recientes).toHaveTextContent('Acopio Kennedy → Barrio San Agustín');
  expect(recientes).toHaveTextContent('Descartada por Joseph Quintero · «La vía está cerrada»');
});

it('sin descartes lo dice', async () => {
  responderSegun({
    'GET /api/sugerencias/descartes': {
      total: 0,
      porMotivo: [],
      porCategoria: [],
      porAcopio: [],
      recientes: [],
    },
  });
  pantalla();
  expect(
    await screen.findByText('Nadie descartó sugerencias en los últimos 30 días'),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/sugerencias/descartes': INFORME });
  const { container } = pantalla();
  await screen.findByText('14');
  expect(await violacionesGraves(container)).toEqual([]);
});
