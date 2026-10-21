import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { jornadaDe } from '../../pruebas/datos-turnos';
import {
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import type { ReservaPublica } from '../../api/turnos';
import { MiReserva } from './MiReserva';

const reservaDe = (extra: Partial<ReservaPublica> = {}): ReservaPublica => ({
  codigo: 'K7QM4XPA',
  estado: 'ACTIVA',
  puedeCancelar: true,
  nombre: 'Ana Gómez',
  perfilDeclarado: false,
  jornadaCambiadaEn: null,
  jornada: jornadaDe(),
  ...extra,
});

const pantalla = (ruta = '/voluntariado/reserva/K7QM4XPA#s3cr3t') =>
  render(
    envolver(
      <Routes>
        <Route path="/voluntariado/reserva/:codigo" element={<MiReserva />} />
      </Routes>,
      ruta,
    ),
  );

const CONSULTAR = 'POST /api/turnos/reservas/K7QM4XPA/consultar';
const CANCELAR = 'POST /api/turnos/reservas/K7QM4XPA/cancelar';

it('muestra el código, el lugar con cómo llegar, la hora y qué llevar', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  const { container } = pantalla();
  expect(await screen.findByText('K7QM4XPA')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tu cupo está reservado');
  expect(screen.getByText('8:00 a. m. – 12:00 p. m.')).toBeInTheDocument();
  expect(screen.getByText('Guantes, agua y ropa cómoda')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
    'href',
    'https://www.google.com/maps/search/?api=1&query=4.6486,-74.0628',
  );
  expect(
    screen.getByText('Guarda este enlace: es la única forma de volver a tu reserva'),
  ).toBeInTheDocument();
  expect(await cuerpoDe(CONSULTAR)).toEqual({ secreto: 's3cr3t' });
  expect(await violacionesGraves(container)).toEqual([]);
});

it('sin punto en el mapa, cómo llegar busca la dirección', async () => {
  responderSegun({
    [CONSULTAR]: reservaDe({
      jornada: jornadaDe({
        lugar: {
          tipo: 'ENTIDAD',
          id: 'e1',
          nombre: 'Cruz Roja Colombiana',
          direccion: 'Calle 68 # 66-31',
          municipio: 'Bogotá',
          lat: null,
          lng: null,
        },
      }),
    }),
  });
  pantalla();
  expect(await screen.findByRole('link', { name: /Cómo llegar/ })).toHaveAttribute(
    'href',
    'https://www.google.com/maps/search/?api=1&query=Calle%2068%20%23%2066-31%2C%20Bogot%C3%A1',
  );
});

it('agregar al calendario descarga el .ics de la reserva', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  const crear = vi.fn((_: Blob) => 'blob:ics');
  Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
  let nombre = '';
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    nombre = this.download;
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Agregar al calendario/ }));
  expect(nombre).toBe('reserva-K7QM4XPA.ics');
  const texto = await crear.mock.calls[0]![0].text();
  expect(texto).toContain('SUMMARY:Armar mercados');
  expect(texto).toContain('DTSTART:20261021T130000Z');
});

it('copiar enlace copia la dirección completa con el secreto', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  const copiar = vi.fn(() => Promise.resolve());
  pantalla();
  await screen.findByText('K7QM4XPA');
  Object.assign(navigator, { clipboard: { writeText: copiar } });
  await userEvent.click(screen.getByRole('button', { name: /Copiar enlace/ }));
  expect(copiar).toHaveBeenCalledWith(
    `${window.location.origin}/voluntariado/reserva/K7QM4XPA#s3cr3t`,
  );
  expect(await screen.findByText('Enlace copiado')).toBeInTheDocument();
});

it('cancelar pide confirmar y después lo dice', async () => {
  responderSegun({ [CONSULTAR]: reservaDe(), [CANCELAR]: {} });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  const hoja = screen.getByRole('dialog');
  expect(peticiones()).not.toContain(CANCELAR);
  await userEvent.click(within(hoja).getByRole('button', { name: 'Cancelar reserva' }));
  expect(await screen.findByText('Cancelaste tu reserva')).toBeInTheDocument();
  expect(await cuerpoDe(CANCELAR)).toEqual({ secreto: 's3cr3t' });
});

it('sin el # dice que el enlace está incompleto y no llama a la API', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  pantalla('/voluntariado/reserva/K7QM4XPA');
  expect(await screen.findByText('Este enlace está incompleto')).toBeInTheDocument();
  expect(peticiones()).toEqual([]);
});

it('un 404 dice que no encontramos la reserva', async () => {
  responderSegun({
    [CONSULTAR]: conEstado(404, { estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'No existe' }),
  });
  pantalla();
  expect(await screen.findByText('No encontramos esa reserva')).toBeInTheDocument();
});

it('una reserva cancelada lo dice', async () => {
  responderSegun({ [CONSULTAR]: reservaDe({ estado: 'CANCELADA' }) });
  pantalla();
  expect(await screen.findByText('Cancelaste tu reserva')).toBeInTheDocument();
});

it('si la jornada se canceló muestra el motivo', async () => {
  responderSegun({
    [CONSULTAR]: reservaDe({
      jornada: jornadaDe({
        estado: 'CANCELADA',
        motivoCancelacion: 'El paso a Mocoa está cerrado',
        aceptaReservas: false,
        motivoSinReserva: 'CANCELADA',
      }),
    }),
  });
  pantalla();
  expect(await screen.findByText(/El paso a Mocoa está cerrado/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
});

it('el secreto nunca aparece en una URL que se pide a la API', async () => {
  responderSegun({ [CONSULTAR]: reservaDe(), [CANCELAR]: {} });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar reserva' }),
  );
  await screen.findByText('Cancelaste tu reserva');
  await waitFor(() => expect(peticiones()).toContain(CANCELAR));
  for (const p of peticiones()) expect(p).not.toContain('s3cr3t');
});

it.each([
  [500, 'ERROR', 'Algo falló'],
  [429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos'],
])('un %s no dice que la reserva no existe y deja reintentar', async (estado, codigo, mensaje) => {
  responderSegun({ [CONSULTAR]: conEstado(estado, { estado, codigo, mensaje }) });
  pantalla();
  expect(await screen.findByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  expect(screen.queryByText('No encontramos esa reserva')).not.toBeInTheDocument();
});

it('si la API dice que ya no se cancela, no lo ofrece aunque el navegador vea la jornada en el futuro', async () => {
  // El reloj del navegador puede estar adelantado o atrasado: manda `puedeCancelar` (P-070)
  responderSegun({ [CONSULTAR]: reservaDe({ puedeCancelar: false, jornada: jornadaDe() }) });
  pantalla();
  await screen.findByText('K7QM4XPA');
  expect(screen.queryByRole('button', { name: 'Cancelar reserva' })).not.toBeInTheDocument();
  expect(screen.getByText(/La jornada ya empezó/)).toBeInTheDocument();
});

it('si cambiaron la hora o el lugar después de reservar, lo avisa arriba', async () => {
  responderSegun({ [CONSULTAR]: reservaDe({ jornadaCambiadaEn: '2026-10-19T15:00:00.000Z' }) });
  pantalla();
  const aviso = await screen.findByRole('status', { name: 'La jornada cambió' });
  expect(aviso).toHaveTextContent('Cambiaron la hora o el lugar el 19 oct, 10:00 a. m.');
});

it('sin cambios no muestra el aviso', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  pantalla();
  await screen.findByText('K7QM4XPA');
  expect(screen.queryByRole('status', { name: 'La jornada cambió' })).not.toBeInTheDocument();
});

it('la reserva activa muestra el sello y el bloque de fecha de la jornada', async () => {
  responderSegun({ [CONSULTAR]: reservaDe() });
  pantalla();
  expect(await screen.findByRole('img', { name: 'Reserva confirmada' })).toBeInTheDocument();
  const jornada = screen.getByRole('region', { name: 'La jornada' });
  expect(
    within(jornada).getByText('Miércoles 21 de octubre', { selector: '.sr-only' }),
  ).toBeInTheDocument();
});

it('sin reserva que mostrar, el mensaje lleva el calendario', async () => {
  responderSegun({
    [CONSULTAR]: conEstado(404, { estado: 404, codigo: 'NO_ENCONTRADO', mensaje: 'No existe' }),
  });
  pantalla();
  expect(
    await screen.findByRole('img', { name: 'Calendario con una planta que brota' }),
  ).toBeInTheDocument();
});

it('mientras cancela, el botón de la hoja está ocupado', async () => {
  let cancelaciones = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation((entrada) => {
    const p = entrada as Request;
    if (p.url.endsWith('/cancelar')) {
      cancelaciones++;
      return new Promise(() => {});
    }
    return Promise.resolve(
      new Response(JSON.stringify(reservaDe()), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }));
  const hoja = screen.getByRole('dialog');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Cancelar reserva' }));
  const boton = await within(hoja).findByRole('button', { name: /Cancelando/ });
  expect(boton).toHaveAttribute('aria-busy', 'true');
  await userEvent.click(boton);
  expect(cancelaciones).toBe(1);
});
