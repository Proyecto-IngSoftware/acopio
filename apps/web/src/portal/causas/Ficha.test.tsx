import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { causaDePrueba } from '../../pruebas/datos-causas';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import { Ficha } from './Ficha';

const ficha = () =>
  render(
    envolver(
      <Routes>
        <Route path="/causas/:id" element={<Ficha />} />
      </Routes>,
      '/causas/c1',
    ),
  );

it('muestra la entidad con su sello, los pasos y la salida al sitio oficial', async () => {
  responderSegun({ 'GET /api/causas/c1': causaDePrueba() });
  const { container } = ficha();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
    'Mercados para familias damnificadas en Mocoa',
  );
  expect(screen.getByText('Verificada el 12 de agosto de 2026')).toBeInTheDocument();
  expect(screen.getByText('Verificada por el equipo de Acopio.')).toBeInTheDocument();
  const pasos = screen.getByRole('list', { name: 'Cómo donar' });
  expect(within(pasos).getAllByRole('listitem')).toHaveLength(2);
  expect(screen.getByText(/Acopio no recibe dinero/)).toBeInTheDocument();
  expect(await violacionesGraves(container)).toEqual([]);

  await userEvent.click(screen.getByRole('button', { name: /Ir al sitio oficial/ }));
  const hoja = screen.getByRole('dialog', { name: 'Vas a salir de Acopio' });
  expect(within(hoja).getByText('fundacion.org')).toBeInTheDocument();
  const continuar = within(hoja).getByRole('link', { name: 'Continuar al sitio' });
  expect(continuar).toHaveAttribute('href', 'https://www.fundacion.org/donar');
  expect(continuar).toHaveAttribute('target', '_blank');
  expect(continuar).toHaveAttribute('rel', 'noopener noreferrer');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Quedarme aquí' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('una atendida de una entidad que perdió la verificación no tiene enlace ni sello', async () => {
  responderSegun({
    'GET /api/causas/c1': causaDePrueba({
      urlOficial: null,
      dominio: null,
      cerroEl: '2026-10-17',
      motivo: 'ENTIDAD_SIN_VERIFICAR',
      entidad: { id: 'e1', nombre: 'Fundación Tierra Viva', tieneLogo: false, verificadaEn: null },
    }),
  });
  ficha();
  expect(
    await screen.findByText('Esta entidad ya no está verificada por Acopio.'),
  ).toBeInTheDocument();
  expect(screen.queryByText(/Verificada el/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /sitio oficial/ })).not.toBeInTheDocument();
  expect(
    screen.queryAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('https')),
  ).toEqual([]);
});

it('una atendida verificada dice cuándo cerró y deja el enlace como secundario', async () => {
  responderSegun({
    'GET /api/causas/c1': causaDePrueba({ cerroEl: '2026-09-30', motivo: 'VENCIDA' }),
  });
  ficha();
  expect(
    await screen.findByText(/Esta causa cerró el 30 de septiembre de 2026/),
  ).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Cómo se donaba' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Ir al sitio oficial/ })).toBeInTheDocument();
});

it('una causa que no existe lo dice y lleva al directorio', async () => {
  responderSegun({});
  ficha();
  expect(await screen.findByText('Esta causa no existe')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver las causas' })).toHaveAttribute('href', '/causas');
});
