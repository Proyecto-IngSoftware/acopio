import { render, screen } from '@testing-library/react';
import { envolver, responderError, responderJson } from '../pruebas/utilidades';
import { useEmergenciasVigentes, type Emergencia } from './emergencias';

const emergencia = (datos: Partial<Emergencia>): Emergencia => ({
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Sismo de prueba',
  tipo: 'sismo',
  inicio: '2026-09-01T00:00:00.000Z',
  horizonteDias: 7,
  estado: 'ACTIVA',
  destacadaHasta: '2026-12-31T00:00:00.000Z',
  cerradaEn: null,
  motivoCierre: [],
  ...datos,
});

function Lista() {
  const { data, error, isPending } = useEmergenciasVigentes();
  if (isPending) return <p>cargando</p>;
  if (error) return <p>error: {error.message}</p>;
  return <p>{data.map((e) => e.nombre).join(', ') || 'ninguna'}</p>;
}

it('entrega activas y en seguimiento, sin las cerradas', async () => {
  responderJson([
    emergencia({ id: 'a', nombre: 'Activa' }),
    emergencia({ id: 'b', nombre: 'Seguimiento', estado: 'EN_SEGUIMIENTO' }),
    emergencia({ id: 'c', nombre: 'Cerrada', estado: 'CERRADA' }),
  ]);
  render(envolver(<Lista />));
  expect(await screen.findByText('Activa, Seguimiento')).toBeInTheDocument();
});

it('con solo emergencias cerradas entrega una lista vacía', async () => {
  responderJson([emergencia({ estado: 'CERRADA' })]);
  render(envolver(<Lista />));
  expect(await screen.findByText('ninguna')).toBeInTheDocument();
});

it('un error de la API llega con el mensaje que mandó la API', async () => {
  responderJson({ estado: 503, codigo: 'SIN_BASE', mensaje: 'La base no responde' }, 503);
  render(envolver(<Lista />));
  expect(await screen.findByText('error: La base no responde')).toBeInTheDocument();
});

it('sin red, el error dice que no hay conexión', async () => {
  responderError();
  render(envolver(<Lista />));
  expect(
    await screen.findByText('error: No pudimos conectar con Acopio. Revisa tu conexión.'),
  ).toBeInTheDocument();
});
