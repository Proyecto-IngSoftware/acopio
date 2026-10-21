import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { jornadaDe } from '../../pruebas/datos-turnos';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Jornadas } from './Jornadas';

vi.mock('./MapaJornadas', () => ({
  default: ({
    grupos = [],
    alElegir,
  }: {
    grupos?: { lugar: { id: string }; jornadas: { id: string }[] }[];
    alElegir?: (id: string) => void;
  }) => (
    <div>
      mapa de jornadas
      {grupos.map((g) => (
        <button key={g.lugar.id} type="button" onClick={() => alElegir?.(g.lugar.id)}>
          lugar {g.lugar.id} con {g.jornadas.length}
        </button>
      ))}
    </div>
  ),
}));

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

afterEach(() => vi.useRealTimers());

it('agrupa las jornadas por día y marca las llenas y las cerradas', async () => {
  // 20 de octubre de 2026 en Bogotá: ningún día de TRES es «Hoy»
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T15:00:00Z'));
  responderSegun({ 'GET /api/turnos/jornadas': TRES });
  const { container } = render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
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
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
  expect(await screen.findByText('Ajustado hace 2 h')).toBeInTheDocument();
});

it('el filtro de perfil pide las jornadas de ese perfil', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': TRES });
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
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
    render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
    expect(await screen.findByText('8:00 a. m. – 12:00 p. m.')).toBeInTheDocument();
  } finally {
    process.env.TZ = zona;
  }
});

it('sin jornadas lo dice', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [] });
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
  expect(await screen.findByText('Por ahora no hay jornadas abiertas')).toBeInTheDocument();
});

const UUID = '11111111-1111-4111-8111-111111111111';

it('abierta con ?acopio= filtra por ese acopio', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [jornadaDe({ lugar: { ...jornadaDe().lugar, id: UUID } })],
  });
  render(envolver(<Jornadas />, `/voluntariado?vista=lista&acopio=${UUID}`));
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
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
  expect(await screen.findByText('3 de 10 cupos reservados · 2 sin reserva')).toBeInTheDocument();
});

it('ignora un día o un acopio mal escritos en la URL', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(envolver(<Jornadas />, '/voluntariado?vista=lista&dia=mañana&acopio=no-es-uuid'));
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
      '/voluntariado?vista=lista&dia=2026-02-30&acopio=11111111-1111-1111-1111-111111111111',
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
  render(envolver(<Jornadas />, `/voluntariado?vista=lista&acopio=${id.toUpperCase()}`));
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
  render(envolver(<Jornadas />, `/voluntariado?vista=lista&acopio=${UUID}`));
  expect(await screen.findByRole('button', { name: /Acopio Suba/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('los filtros avisan que abren un diálogo', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [jornadaDe()] });
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
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
  render(envolver(<Jornadas />, '/voluntariado?vista=lista'));
  await screen.findByText('Armar mercados');
  expect(screen.queryByText(/Ajustado/)).not.toBeInTheDocument();
});

function Ubicacion() {
  return <p data-testid="busqueda">{useLocation().search}</p>;
}

const CON_CUPOS = jornadaDe({
  id: 'j4',
  titulo: 'Cocinar en la olla comunitaria',
  cupoMaximo: 5,
  ocupados: 3,
  libres: 2,
  lugar: { ...jornadaDe().lugar, id: 'a2', nombre: 'Acopio Suba', lat: 4.74, lng: -74.08 },
});

it('sin parámetro abre en «Mapa», como el mapa de acopios', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': TRES });
  render(envolver(<Jornadas />, '/voluntariado'));
  expect(await screen.findByText('mapa de jornadas')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Mapa' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Lista' })).not.toBeChecked();
});

it('la lista queda en la URL y los chips filtran en el mapa', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [...TRES, CON_CUPOS] });
  render(
    envolver(
      <>
        <Jornadas />
        <Ubicacion />
      </>,
      '/voluntariado?vista=lista',
    ),
  );
  await screen.findByText('Armar mercados');
  expect(screen.getByRole('button', { name: 'Todas 4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Falta gente 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Con cupos 1' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('radio', { name: 'Mapa' }));
  expect(screen.getByTestId('busqueda')).not.toHaveTextContent('vista');
  // En el mapa entran la que falta gente, la de cupos y la llena; la fuera de plazo no
  expect(await screen.findByText('mapa de jornadas')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'lugar a1 con 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'lugar a2 con 1' })).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'lugar a1 con 2' }));
  expect(screen.getByRole('link', { name: /Armar mercados/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Clasificar ropa donada/ })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Falta gente 1' }));
  expect(screen.getByTestId('busqueda')).toHaveTextContent('estado=faltan');
  expect(screen.getByRole('button', { name: 'lugar a1 con 1' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /lugar a2/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Clasificar ropa donada/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('radio', { name: 'Lista' }));
  expect(screen.getByTestId('busqueda')).toHaveTextContent('vista=lista');
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: /Armar mercados/ })).toBeInTheDocument();
});

it('una jornada sin coordenadas lo avisa bajo el mapa', async () => {
  responderSegun({
    'GET /api/turnos/jornadas': [
      jornadaDe(),
      CON_CUPOS,
      jornadaDe({ id: 'j5', lugar: { ...jornadaDe().lugar, id: 'e1', lat: null, lng: null } }),
    ],
  });
  render(envolver(<Jornadas />, '/voluntariado'));
  expect(
    await screen.findByText('1 jornada no tiene ubicación en el mapa; está en la lista.'),
  ).toBeInTheDocument();
});

it('«Quitar los filtros» conserva la vista', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [] });
  render(
    envolver(
      <>
        <Jornadas />
        <Ubicacion />
      </>,
      '/voluntariado?vista=lista&perfil=VETERINARIO',
    ),
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Quitar los filtros' }));
  expect(screen.getByTestId('busqueda')).toHaveTextContent(/^\?vista=lista$/);
});

it('un ?estado= de un enlace compartido sin jornadas deja su chip en el mapa para quitarlo', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [] });
  function Ubicacion() {
    return <p data-testid="busqueda">{useLocation().search}</p>;
  }
  render(
    envolver(
      <>
        <Jornadas />
        <Ubicacion />
      </>,
      '/voluntariado?estado=faltan',
    ),
  );
  const falta = await screen.findByRole('button', { name: 'Falta gente 0' });
  expect(falta).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Todas 0' }));
  expect(screen.getByTestId('busqueda')).not.toHaveTextContent('estado=');
});
