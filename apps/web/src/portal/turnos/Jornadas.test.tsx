import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { jornadaDe } from '../../pruebas/datos-turnos';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Jornadas } from './Jornadas';

const TRES = [
  jornadaDe(),
  jornadaDe({
    id: 'j2',
    titulo: 'Clasificar ropa donada',
    inicio: '2026-10-21T19:00:00.000Z',
    fin: '2026-10-21T22:00:00.000Z',
    cupoMaximo: 3,
    ocupados: 3,
    libres: 0,
    aceptaReservas: false,
    motivoSinReserva: 'LLENA',
  }),
  jornadaDe({
    id: 'j3',
    titulo: 'Descargar el camión de agua',
    inicio: '2026-10-22T13:00:00.000Z',
    fin: '2026-10-22T16:00:00.000Z',
    aceptaReservas: false,
    motivoSinReserva: 'PLAZO',
  }),
];

it('agrupa las jornadas por día y marca las llenas y las cerradas', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': TRES });
  const { container } = render(envolver(<Jornadas />, '/voluntariado'));
  const dia21 = await screen.findByRole('region', { name: 'Miércoles 21 de octubre' });
  const dia22 = screen.getByRole('region', { name: 'Jueves 22 de octubre' });
  expect(within(dia21).getAllByRole('link')).toHaveLength(2);
  expect(within(dia22).getAllByRole('link')).toHaveLength(1);

  const llena = screen.getByRole('link', { name: /Clasificar ropa donada/ });
  expect(within(llena).getByText('Llena')).toBeInTheDocument();
  expect(llena).toHaveAttribute('href', '/voluntariado/j2');
  const cerrada = screen.getByRole('link', { name: /Descargar el camión/ });
  expect(within(cerrada).getByText('Reservas cerradas')).toBeInTheDocument();
  expect(
    within(screen.getByRole('link', { name: /Armar mercados/ })).getByText(
      '3 de 10 cupos reservados',
    ),
  ).toBeInTheDocument();

  expect(container.textContent).not.toMatch(/personas presentes/i);
  expect(await violacionesGraves(container)).toEqual([]);
});

it('muestra hace cuánto se ajustaron los cupos a mano', async () => {
  const haceDosHoras = new Date(Date.now() - 2 * 3_600_000 - 60_000).toISOString();
  responderSegun({
    'GET /api/turnos/jornadas': [jornadaDe({ ajuste: 2, ajusteActualizadoEn: haceDosHoras })],
  });
  render(envolver(<Jornadas />, '/voluntariado'));
  expect(await screen.findByText('Ajustado hace 2 h')).toBeInTheDocument();
});

it('el filtro de perfil pide las jornadas de ese perfil', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': TRES });
  render(envolver(<Jornadas />, '/voluntariado'));
  await screen.findByText('Armar mercados');
  await userEvent.click(screen.getByRole('button', { name: /Perfil/ }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Veterinario' }),
  );
  await waitFor(() =>
    expect(peticiones()).toContain('GET /api/turnos/jornadas?perfil=VETERINARIO'),
  );
  expect(screen.getByRole('button', { name: /Veterinario/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('muestra la hora de Bogotá aunque el navegador esté en otra zona', async () => {
  const zona = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
    render(envolver(<Jornadas />, '/voluntariado'));
    expect(await screen.findByText('8:00 a. m. – 12:00 p. m.')).toBeInTheDocument();
  } finally {
    process.env.TZ = zona;
  }
});

it('sin jornadas lo dice', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [] });
  render(envolver(<Jornadas />, '/voluntariado'));
  expect(await screen.findByText('Por ahora no hay jornadas abiertas')).toBeInTheDocument();
});

it('abierta con ?acopio= filtra por ese acopio', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(envolver(<Jornadas />, '/voluntariado?acopio=a1'));
  await waitFor(() => expect(peticiones()).toContain('GET /api/turnos/jornadas?acopio=a1'));
  expect(await screen.findByRole('button', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
