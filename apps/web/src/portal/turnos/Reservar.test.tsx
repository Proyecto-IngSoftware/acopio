import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { jornadaDe } from '../../pruebas/datos-turnos';
import { conEstado, cuerpoDe, envolver, responderSegun } from '../../pruebas/utilidades';
import { Reservar } from './Reservar';

function Destino() {
  const l = useLocation();
  return <p>Destino {`${l.pathname}${l.hash}`}</p>;
}

const pantalla = () =>
  render(
    envolver(
      <Routes>
        <Route path="/voluntariado/:id" element={<Reservar />} />
        <Route path="/voluntariado/reserva/:codigo" element={<Destino />} />
      </Routes>,
      '/voluntariado/j1',
    ),
  );

async function llenar() {
  await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana Gómez');
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
}

it('pide nombre, correo, teléfono opcional y el consentimiento con enlace a la política', async () => {
  responderSegun({ 'GET /api/turnos/jornadas/j1': jornadaDe() });
  const { container } = pantalla();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Armar mercados');
  expect(screen.getByText(/Puede haber gente que llegó sin reserva/)).toBeInTheDocument();
  expect(screen.getByLabelText('Teléfono (opcional)')).not.toBeRequired();
  expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute(
    'href',
    '/privacidad',
  );
  await llenar();
  const reservar = screen.getByRole('button', { name: 'Reservar' });
  expect(reservar).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  expect(reservar).toBeEnabled();
  expect(await violacionesGraves(container)).toEqual([]);
});

it('si la jornada pide un perfil, la casilla del perfil es obligatoria y avisa que lo pueden verificar', async () => {
  responderSegun({ 'GET /api/turnos/jornadas/j1': jornadaDe({ perfilRequerido: 'CONDUCTOR_C2' }) });
  pantalla();
  await llenar();
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  const perfil = screen.getByRole('checkbox', { name: /Tengo licencia de conducción C2/ });
  expect(
    screen.getByText('El acopio o la entidad puede pedirte que lo demuestres al llegar.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reservar' })).toBeDisabled();
  await userEvent.click(perfil);
  expect(screen.getByRole('button', { name: 'Reservar' })).toBeEnabled();
});

it('al reservar va a la reserva con el secreto después del #', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe(),
    'POST /api/turnos/jornadas/j1/reservas': {
      codigo: 'K7QM4XPA',
      secreto: 's3cr3t',
      jornada: jornadaDe(),
    },
  });
  pantalla();
  await llenar();
  await userEvent.type(screen.getByLabelText('Teléfono (opcional)'), '3105550101');
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  expect(
    await screen.findByText('Destino /voluntariado/reserva/K7QM4XPA#s3cr3t'),
  ).toBeInTheDocument();
  expect(await cuerpoDe('POST /api/turnos/jornadas/j1/reservas')).toEqual({
    nombre: 'Ana Gómez',
    correo: 'ana@correo.co',
    telefono: '3105550101',
    perfilDeclarado: false,
    consentimiento: true,
  });
});

it('si otra persona tomó el último cupo, muestra el mensaje y conserva lo escrito', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe(),
    'POST /api/turnos/jornadas/j1/reservas': conEstado(409, {
      estado: 409,
      codigo: 'JORNADA_LLENA',
      mensaje: 'La jornada ya no tiene cupos.',
    }),
  });
  pantalla();
  await llenar();
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La jornada ya no tiene cupos.');
  expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Gómez');
  expect(screen.getByLabelText('Correo')).toHaveValue('ana@correo.co');
});

it('un correo que ya reservó muestra el mensaje de la API', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe(),
    'POST /api/turnos/jornadas/j1/reservas': conEstado(409, {
      estado: 409,
      codigo: 'RESERVA_REPETIDA',
      mensaje: 'Ese correo ya tiene una reserva en esta jornada.',
    }),
  });
  pantalla();
  await llenar();
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Ese correo ya tiene una reserva en esta jornada.',
  );
});

it('una jornada cancelada muestra el motivo y no tiene formulario', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe({
      estado: 'CANCELADA',
      motivoCancelacion: 'Se inundó la bodega',
      aceptaReservas: false,
      motivoSinReserva: 'CANCELADA',
    }),
  });
  pantalla();
  expect(await screen.findByText(/Se inundó la bodega/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
});

it('cerradas por plazo lo explica y no tiene formulario', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe({ aceptaReservas: false, motivoSinReserva: 'PLAZO' }),
  });
  pantalla();
  expect(
    await screen.findByText('Las reservas se cerraron 12 horas antes del inicio'),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
});

it('un 500 al cargar la jornada no dice que no existe y deja reintentar', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': conEstado(500, { estado: 500, codigo: 'ERROR', mensaje: 'x' }),
  });
  pantalla();
  expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  expect(screen.queryByText('Esta jornada no existe')).not.toBeInTheDocument();
});

it('no deja reservar con un nombre de una letra ni un teléfono con paréntesis', async () => {
  responderSegun({ 'GET /api/turnos/jornadas/j1': jornadaDe() });
  pantalla();
  await userEvent.type(await screen.findByLabelText('Nombre'), 'A');
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  const reservar = screen.getByRole('button', { name: 'Reservar' });
  expect(reservar).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Nombre'), 'na');
  expect(reservar).toBeEnabled();
  await userEvent.type(screen.getByLabelText('Teléfono (opcional)'), '(310) 555');
  expect(reservar).toBeDisabled();
  expect(screen.getByText(/solo números, espacios, \+ o -/)).toBeInTheDocument();
});

it('si se llenó al enviar, conserva lo escrito y ofrece ver otras jornadas', async () => {
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe(),
    'POST /api/turnos/jornadas/j1/reservas': conEstado(409, {
      estado: 409,
      codigo: 'JORNADA_LLENA',
      mensaje: 'La jornada ya no tiene cupos.',
    }),
  });
  pantalla();
  await llenar();
  await userEvent.click(screen.getByRole('checkbox', { name: /Acepto que guarden/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Reservar' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'Ver otras jornadas' })).toHaveAttribute(
    'href',
    '/voluntariado',
  );
  expect(screen.getByLabelText('Nombre')).toHaveValue('Ana Gómez');
});

// El detalle conserva la regla de RF-TUR-006: reservas, no personas, y el ajuste aparte
it('con ajuste manual, los cupos dicen cuántos llegaron sin reserva y desde cuándo', async () => {
  const haceDosHoras = new Date(Date.now() - 2 * 3_600_000 - 60_000).toISOString();
  responderSegun({
    'GET /api/turnos/jornadas/j1': jornadaDe({
      ocupados: 3,
      ajuste: 2,
      libres: 5,
      ajusteActualizadoEn: haceDosHoras,
    }),
  });
  pantalla();
  expect(await screen.findByText('3 de 10 cupos reservados · 2 sin reserva')).toBeInTheDocument();
  expect(screen.getByText('Ajustado hace 2 h')).toBeInTheDocument();
});
