import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { HojaVincular } from './HojaVincular';

const FOLIO = 'ACO-2026-7KQ4M';
const AUDITOR = { id: 'u1', username: 'aud', nombre: 'Michael', rol: 'AUDITOR' as const };
const ADMIN = { id: 'u2', username: 'admin', nombre: 'Admin', rol: 'ADMIN' as const };
const entrada = (id: string, categoria: string, extra: object = {}) => ({
  id,
  categoriaId: `c-${id}`,
  categoria,
  unidad: 'KILOGRAMO',
  cantidad: 5,
  ocurridoEn: '2026-10-02T21:05:00Z',
  origenOffline: false,
  registradoPor: 'Brayan',
  ...extra,
});
const ubicacion = (id: string, nombre: string) => ({
  tipo: 'ACOPIO',
  id,
  nombre,
  municipio: 'Bogotá',
  estado: 'ACTIVO',
});

const pantalla = (usuario: UsuarioSesion = AUDITOR, extra: Record<string, unknown> = {}) => {
  const alCerrar = vi.fn();
  responderSegun({
    'GET /api/ubicaciones/mias': [
      ubicacion('a1', 'Acopio Chapinero'),
      ubicacion('a2', 'Acopio Kennedy'),
    ],
    'GET /api/acopios/gestion': [
      { id: 'a1', nombre: 'Acopio Chapinero' },
      { id: 'a3', nombre: 'Acopio Mocoa' },
    ],
    'GET /api/comprobantes/*/entradas-vinculables': [
      entrada('m1', 'Agua potable', { unidad: 'LITRO', cantidad: 12, origenOffline: true }),
      entrada('m2', 'Arroz'),
    ],
    'POST /api/comprobantes/*/vinculos': { folio: FOLIO, estado: 'PENDIENTE' },
    ...extra,
  });
  render(
    envolver(
      <HojaVincular
        folio={FOLIO}
        acopio={{ id: 'a1', nombre: 'Acopio Chapinero' }}
        alCerrar={alCerrar}
      />,
      '/',
      clienteFalso(usuario),
    ),
  );
  return { alCerrar };
};

it('lista las entradas sin donación del acopio del comprobante', async () => {
  pantalla();
  const hoja = await screen.findByRole('dialog', { name: 'Vincular entradas' });
  const agua = await within(hoja).findByRole('checkbox', { name: /Agua potable · 12 L/ });
  expect(agua.closest('label')).toHaveTextContent(/Brayan · sin conexión/);
  expect(peticiones()).toContain(`GET /api/comprobantes/${FOLIO}/entradas-vinculables?acopioId=a1`);
});

it('vincular manda los ids elegidos y cierra', async () => {
  const { alCerrar } = pantalla();
  const hoja = await screen.findByRole('dialog', { name: 'Vincular entradas' });
  const boton = within(hoja).getByRole('button', { name: /Vincular/ });
  expect(boton).toBeDisabled();
  await userEvent.click(await within(hoja).findByRole('checkbox', { name: /Agua potable/ }));
  await userEvent.click(within(hoja).getByRole('checkbox', { name: /Arroz/ }));
  expect(boton).toHaveAccessibleName('Vincular 2 entradas');
  await userEvent.click(boton);
  expect(await cuerpoDe(`POST /api/comprobantes/${FOLIO}/vinculos`)).toEqual({
    movimientoIds: ['m1', 'm2'],
  });
  await waitFor(() => expect(alCerrar).toHaveBeenCalled());
});

it('el Auditor elige entre sus acopios; otro acopio avisa que el folio pasa a él', async () => {
  pantalla();
  const hoja = await screen.findByRole('dialog', { name: 'Vincular entradas' });
  const selector = await within(hoja).findByRole('combobox', { name: 'Acopio' });
  await waitFor(() =>
    expect(within(selector).getByRole('option', { name: 'Acopio Kennedy' })).toBeInTheDocument(),
  );
  await userEvent.selectOptions(selector, 'a2');
  await waitFor(() =>
    expect(peticiones()).toContain(
      `GET /api/comprobantes/${FOLIO}/entradas-vinculables?acopioId=a2`,
    ),
  );
  expect(within(hoja).getByText('Este folio pasa a Acopio Kennedy.')).toBeInTheDocument();
});

it('el Administrador elige entre todos los acopios', async () => {
  pantalla(ADMIN);
  const hoja = await screen.findByRole('dialog', { name: 'Vincular entradas' });
  const selector = await within(hoja).findByRole('combobox', { name: 'Acopio' });
  await waitFor(() =>
    expect(within(selector).getByRole('option', { name: 'Acopio Mocoa' })).toBeInTheDocument(),
  );
  expect(peticiones()).not.toContain('GET /api/ubicaciones/mias');
});

it('sin entradas lo dice', async () => {
  pantalla(AUDITOR, { 'GET /api/comprobantes/*/entradas-vinculables': [] });
  expect(
    await screen.findByText('No hay entradas sin donación en los últimos 14 días.'),
  ).toBeInTheDocument();
});

it('un 422 muestra el mensaje de la API', async () => {
  pantalla(AUDITOR, {
    'POST /api/comprobantes/*/vinculos': conEstado(422, {
      estado: 422,
      codigo: 'MOVIMIENTO_NO_VINCULABLE',
      mensaje: 'Una de las entradas ya es de otra donación',
    }),
  });
  const hoja = await screen.findByRole('dialog', { name: 'Vincular entradas' });
  await userEvent.click(await within(hoja).findByRole('checkbox', { name: /Arroz/ }));
  await userEvent.click(within(hoja).getByRole('button', { name: 'Vincular 1 entrada' }));
  expect(await within(hoja).findByRole('alert')).toHaveTextContent(
    'Una de las entradas ya es de otra donación',
  );
});

it('axe: sin violaciones graves', async () => {
  pantalla();
  await screen.findByRole('checkbox', { name: /Arroz/ });
  expect(await violacionesGraves(document.body)).toEqual([]);
});
