import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
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

const UUID = '11111111-1111-4111-8111-111111111111';

it('abierta con ?acopio= filtra por ese acopio', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [jornadaDe({ lugar: { ...jornadaDe().lugar, id: UUID } })],
  });
  render(envolver(<Jornadas />, `/voluntariado?acopio=${UUID}`));
  await waitFor(() => expect(peticiones()).toContain(`GET /api/turnos/jornadas?acopio=${UUID}`));
  expect(await screen.findByRole('button', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('con ajuste manual, los cupos dicen cuántos llegaron sin reserva', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [
      jornadaDe({
        ocupados: 3,
        ajuste: 2,
        libres: 5,
        ajusteActualizadoEn: new Date().toISOString(),
      }),
    ],
  });
  render(envolver(<Jornadas />, '/voluntariado'));
  expect(await screen.findByText('3 de 10 cupos reservados · 2 sin reserva')).toBeInTheDocument();
});

it('ignora un día o un acopio mal escritos en la URL', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(envolver(<Jornadas />, '/voluntariado?dia=mañana&acopio=no-es-uuid'));
  expect(await screen.findByText('Armar mercados')).toBeInTheDocument();
  expect(peticiones().filter((p) => p.startsWith('GET /api/turnos/jornadas'))).toEqual([
    'GET /api/turnos/jornadas',
  ]);
  expect(screen.getByRole('button', { name: /Lugar/ })).toHaveAttribute('aria-pressed', 'false');
});

it('ignora un día que no existe y un UUID sin versión, como la API (P-071)', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(
    envolver(
      <Jornadas />,
      '/voluntariado?dia=2026-02-30&acopio=11111111-1111-1111-1111-111111111111',
    ),
  );
  expect(await screen.findByText('Armar mercados')).toBeInTheDocument();
  expect(peticiones().filter((p) => p.startsWith('GET /api/turnos/jornadas'))).toEqual([
    'GET /api/turnos/jornadas',
  ]);
});

it('un acopio en mayúsculas en la URL coincide con su opción (P-071)', async () => {
  const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
  responderSegun({
    'GET /api/turnos/jornadas': [jornadaDe({ lugar: { ...jornadaDe().lugar, id } })],
  });
  render(envolver(<Jornadas />, `/voluntariado?acopio=${id.toUpperCase()}`));
  await waitFor(() => expect(peticiones()).toContain(`GET /api/turnos/jornadas?acopio=${id}`));
  expect(await screen.findByRole('button', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('el filtro de lugar dice el nombre del acopio aunque no tenga jornadas', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [],
    [`GET /api/acopios/${UUID}`]: acopioDePrueba({ nombre: 'Acopio Suba' }),
  });
  render(envolver(<Jornadas />, `/voluntariado?acopio=${UUID}`));
  expect(await screen.findByRole('button', { name: /Acopio Suba/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('los filtros avisan que abren un diálogo', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(envolver(<Jornadas />, '/voluntariado'));
  await screen.findByText('Armar mercados');
  for (const nombre of [/Lugar/, /Día/, /Perfil/]) {
    expect(screen.getByRole('button', { name: nombre })).toHaveAttribute('aria-haspopup', 'dialog');
  }
});

it('con el ajuste en 0 no dice «Ajustado»', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [
      jornadaDe({ ajuste: 0, ajusteActualizadoEn: new Date().toISOString() }),
    ],
  });
  render(envolver(<Jornadas />, '/voluntariado'));
  await screen.findByText('Armar mercados');
  expect(screen.queryByText(/Ajustado/)).not.toBeInTheDocument();
});
