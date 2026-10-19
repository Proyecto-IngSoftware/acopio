import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { gestionDe, inscritoDe } from '../../pruebas/datos-turnos';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import type { JornadaGestion } from '../../api/turnos';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { DetalleJornada } from './DetalleJornada';

const OPERADOR: UsuarioSesion = { id: 'o', username: 'o', nombre: 'Daniela', rol: 'OPERADOR' };
const hace = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
/** Empezó hace una hora: la asistencia ya se puede marcar. */
const EN_CURSO = gestionDe({ inicio: hace(1), fin: hace(-3), puedeMarcarAsistencia: true });
const INSCRITOS = 'GET /api/turnos/gestion/jornadas/j1/reservas';

const pantalla = (jornada: JornadaGestion = EN_CURSO, alVolver = vi.fn()) => {
  const r = render(
    envolver(
      <DetalleJornada jornada={jornada} alVolver={alVolver} alEditar={vi.fn()} />,
      '/consola/turnos',
      clienteFalso(OPERADOR),
    ),
  );
  return { ...r, alVolver };
};

it('lista los inscritos con su contacto y el perfil que declararon', async () => {
  responderSegun({
    [INSCRITOS]: [
      inscritoDe({ perfilDeclarado: true }),
      inscritoDe({ id: 'r2', nombre: null, correo: null, telefono: null, estado: 'ASISTIO' }),
    ],
  });
  const { container } = pantalla(gestionDe({ ...EN_CURSO, perfilRequerido: 'CONDUCTOR_C2' }));
  const ana = await screen.findByRole('listitem', { name: 'María Fernanda Ruiz' });
  expect(within(ana).getByText(/mafe\.ruiz@correo\.co/)).toBeInTheDocument();
  expect(within(ana).getByText(/3105550101/)).toBeInTheDocument();
  expect(within(ana).getByText('Declaró: Conductor C2')).toBeInTheDocument();
  expect(screen.getByText('Datos borrados (30 días)')).toBeInTheDocument();
  expect(await violacionesGraves(container)).toEqual([]);
});

it('copiar contacto copia el nombre y el teléfono', async () => {
  responderSegun({ [INSCRITOS]: [inscritoDe()] });
  pantalla();
  const fila = await screen.findByRole('listitem', { name: 'María Fernanda Ruiz' });
  const copiar = vi.fn(() => Promise.resolve());
  Object.assign(navigator, { clipboard: { writeText: copiar } });
  await userEvent.click(
    within(fila).getByRole('button', { name: 'Copiar contacto de María Fernanda Ruiz' }),
  );
  expect(copiar).toHaveBeenCalledWith('María Fernanda Ruiz 3105550101');
});

it('marca la asistencia cuando la jornada ya empezó', async () => {
  responderSegun({
    [INSCRITOS]: [inscritoDe()],
    'PUT /api/turnos/gestion/reservas/r1/asistencia': { id: 'r1', estado: 'ASISTIO' },
  });
  pantalla();
  const fila = await screen.findByRole('listitem', { name: 'María Fernanda Ruiz' });
  await userEvent.click(within(fila).getByRole('button', { name: 'Asistió' }));
  expect(await cuerpoDe('PUT /api/turnos/gestion/reservas/r1/asistencia')).toEqual({
    estado: 'ASISTIO',
  });
});

it('fuera del plazo que dice la API la asistencia no se puede marcar, aunque el reloj del navegador diga otra cosa', async () => {
  responderSegun({ [INSCRITOS]: [inscritoDe()] });
  pantalla({ ...EN_CURSO, puedeMarcarAsistencia: false });
  const fila = await screen.findByRole('listitem', { name: 'María Fernanda Ruiz' });
  expect(within(fila).getByRole('button', { name: 'Asistió' })).toBeDisabled();
  expect(
    screen.getByText(/La asistencia se marca desde 2 horas antes del inicio/),
  ).toBeInTheDocument();
});

it('ajusta los cupos por gente que llegó sin reserva', async () => {
  responderSegun({
    [INSCRITOS]: [],
    'PUT /api/turnos/gestion/jornadas/j1/ajuste': gestionDe({ ajuste: 2 }),
  });
  pantalla();
  const mas = await screen.findByRole('button', { name: 'Sumar una persona sin reserva' });
  await userEvent.click(mas);
  await userEvent.click(mas);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  expect(await cuerpoDe('PUT /api/turnos/gestion/jornadas/j1/ajuste')).toEqual({ cupos: 2 });
});

it('el contador toma el ajuste nuevo cuando la lista se refresca', async () => {
  responderSegun({ [INSCRITOS]: [] });
  const { rerender } = pantalla();
  await screen.findByRole('button', { name: 'Sumar una persona sin reserva' });
  rerender(
    envolver(
      <DetalleJornada jornada={{ ...EN_CURSO, ajuste: 3 }} alVolver={vi.fn()} alEditar={vi.fn()} />,
      '/consola/turnos',
      clienteFalso(OPERADOR),
    ),
  );
  expect(await screen.findByText('3', { selector: 'b' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar ajuste' })).not.toBeInTheDocument();
});

it('un ajuste sin cupo muestra el mensaje de la API', async () => {
  responderSegun({
    [INSCRITOS]: [],
    'PUT /api/turnos/gestion/jornadas/j1/ajuste': conEstado(409, {
      estado: 409,
      codigo: 'AJUSTE_SIN_CUPO',
      mensaje: 'No caben más personas sin reserva en esta jornada.',
    }),
  });
  pantalla();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Sumar una persona sin reserva' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Guardar ajuste' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No caben más personas sin reserva en esta jornada.',
  );
});

it('cierra y reabre las reservas desde «Acciones»', async () => {
  responderSegun({
    [INSCRITOS]: [inscritoDe()],
    'POST /api/turnos/gestion/jornadas/j1/cerrar': gestionDe({ estado: 'CERRADA' }),
    'POST /api/turnos/gestion/jornadas/j1/reabrir': gestionDe(),
  });
  const { unmount } = pantalla(gestionDe());
  await userEvent.click(await screen.findByRole('radio', { name: 'Acciones' }));
  await userEvent.click(screen.getByRole('button', { name: /Cerrar las reservas/ }));
  await waitFor(() =>
    expect(peticiones()).toContain('POST /api/turnos/gestion/jornadas/j1/cerrar'),
  );
  unmount();
  pantalla(gestionDe({ estado: 'CERRADA', motivoSinReserva: 'CERRADA' }));
  await userEvent.click(await screen.findByRole('radio', { name: 'Acciones' }));
  await userEvent.click(screen.getByRole('button', { name: /Reabrir las reservas/ }));
  await waitFor(() =>
    expect(peticiones()).toContain('POST /api/turnos/gestion/jornadas/j1/reabrir'),
  );
});

it('cancelar pide un motivo', async () => {
  responderSegun({
    [INSCRITOS]: [inscritoDe()],
    'POST /api/turnos/gestion/jornadas/j1/cancelar': gestionDe({ estado: 'CANCELADA' }),
  });
  pantalla(gestionDe());
  await userEvent.click(await screen.findByRole('radio', { name: 'Acciones' }));
  await userEvent.click(screen.getByRole('button', { name: /Cancelar la jornada/ }));
  const hoja = screen.getByRole('dialog');
  const confirmar = within(hoja).getByRole('button', { name: 'Cancelar jornada' });
  expect(confirmar).toBeDisabled();
  // La API pide al menos 5 caracteres
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'abc');
  expect(confirmar).toBeDisabled();
  await userEvent.clear(within(hoja).getByLabelText('Motivo'));
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'Se inundó la bodega');
  await userEvent.click(confirmar);
  await waitFor(async () =>
    expect(await cuerpoDe('POST /api/turnos/gestion/jornadas/j1/cancelar')).toEqual({
      motivo: 'Se inundó la bodega',
    }),
  );
});

it('«Borrar» solo aparece si la jornada nunca tuvo reservas', async () => {
  responderSegun({
    [INSCRITOS]: [],
    'DELETE /api/turnos/gestion/jornadas/j1': conEstado(204, null),
  });
  const { alVolver, unmount } = pantalla(gestionDe({ ocupados: 0 }));
  await userEvent.click(await screen.findByRole('radio', { name: 'Acciones' }));
  await userEvent.click(await screen.findByRole('button', { name: /Borrar la jornada/ }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Borrar jornada' }),
  );
  await waitFor(() => expect(alVolver).toHaveBeenCalled());
  unmount();

  responderSegun({ [INSCRITOS]: [inscritoDe({ estado: 'CANCELADA' })] });
  pantalla(gestionDe({ ocupados: 0 }));
  await userEvent.click(await screen.findByRole('radio', { name: 'Acciones' }));
  await screen.findByRole('button', { name: /Cerrar las reservas/ });
  expect(screen.queryByRole('button', { name: /Borrar la jornada/ })).not.toBeInTheDocument();
});

it('si fallan los inscritos lo dice y deja reintentar, no que nadie reservó', async () => {
  responderSegun({
    [INSCRITOS]: conEstado(500, { estado: 500, codigo: 'ERROR', mensaje: 'x' }),
  });
  pantalla();
  expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  expect(screen.queryByText('Nadie ha reservado todavía')).not.toBeInTheDocument();
});
