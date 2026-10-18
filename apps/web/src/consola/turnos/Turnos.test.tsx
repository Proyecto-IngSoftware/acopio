import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { gestionDe } from '../../pruebas/datos-turnos';
import { clienteFalso, envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { Turnos } from './Turnos';

const OPERADOR: UsuarioSesion = { id: 'o', username: 'o', nombre: 'Daniela', rol: 'OPERADOR' };

const pantalla = () => render(envolver(<Turnos />, '/consola/turnos', clienteFalso(OPERADOR)));

it('las pestañas piden próximas, en curso y pasadas', async () => {
  responderSegun({ 'GET /api/turnos/gestion/jornadas': [] });
  const { container } = pantalla();
  await waitFor(() =>
    expect(peticiones()).toContain('GET /api/turnos/gestion/jornadas?pestana=proximas'),
  );
  await userEvent.click(screen.getByRole('radio', { name: 'En curso' }));
  await waitFor(() =>
    expect(peticiones()).toContain('GET /api/turnos/gestion/jornadas?pestana=en-curso'),
  );
  await userEvent.click(screen.getByRole('radio', { name: 'Pasadas' }));
  await waitFor(() =>
    expect(peticiones()).toContain('GET /api/turnos/gestion/jornadas?pestana=pasadas'),
  );
  expect(await screen.findByText('No hay jornadas aquí')).toBeInTheDocument();
  expect(await violacionesGraves(container)).toEqual([]);
});

it('cada fila dice su estado, su fecha y los cupos reservados', async () => {
  responderSegun({
    'GET /api/turnos/gestion/jornadas': [
      gestionDe({ ajuste: 2, ajusteActualizadoEn: new Date().toISOString() }),
      gestionDe({
        id: 'j2',
        titulo: 'Clasificar ropa',
        estado: 'CERRADA',
        motivoSinReserva: 'CERRADA',
      }),
    ],
  });
  pantalla();
  const fila = await screen.findByRole('button', { name: /Armar mercados/ });
  expect(within(fila).getByText('Abierta')).toBeInTheDocument();
  expect(within(fila).getByText(/3 de 10 cupos reservados · 2 sin reserva/)).toBeInTheDocument();
  expect(within(fila).getByText(/Mié 21 oct · 8:00 a\. m\. – 12:00 p\. m\./)).toBeInTheDocument();
  const cerrada = screen.getByRole('button', { name: /Clasificar ropa/ });
  expect(within(cerrada).getByText('Cerrada')).toBeInTheDocument();
});

it('«Nueva jornada» abre el formulario y al crear vuelve a la lista con las nuevas', async () => {
  let creadas = false;
  responderSegun({ 'GET /api/ubicaciones/mias': [] });
  vi.mocked(globalThis.fetch).mockImplementation((entrada) => {
    const p = entrada as Request;
    const ruta = new URL(p.url).pathname;
    const json = (cuerpo: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(cuerpo), { headers: { 'content-type': 'application/json' } }),
      );
    if (p.method === 'POST') {
      creadas = true;
      return json([gestionDe({ id: 'nueva', titulo: 'Jornada nueva' })]);
    }
    if (ruta === '/api/ubicaciones/mias')
      return json([
        {
          tipo: 'ACOPIO',
          id: 'a1',
          nombre: 'Acopio Chapinero',
          municipio: 'Bogotá',
          estado: 'ACTIVO',
        },
      ]);
    return json(creadas ? [gestionDe({ id: 'nueva', titulo: 'Jornada nueva' })] : []);
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Nueva jornada/ }));
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Nueva jornada' }),
  ).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Acopio Chapinero' });
  await userEvent.type(screen.getByLabelText('Título'), 'Jornada nueva');
  await userEvent.type(screen.getByLabelText('Labor'), 'Empacar mercados para las familias.');
  const dias = screen
    .getAllByRole('button', { pressed: false })
    .filter(
      (b) => /de /.test(b.getAttribute('aria-label') ?? '') && !(b as HTMLButtonElement).disabled,
    );
  await userEvent.click(dias.at(-1)!);
  await userEvent.type(screen.getByLabelText('Empieza'), '14:00');
  await userEvent.type(screen.getByLabelText('Termina'), '18:00');
  await userEvent.click(screen.getByRole('button', { name: 'Crear jornada' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Turnos' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /Jornada nueva/ })).toBeInTheDocument();
});
