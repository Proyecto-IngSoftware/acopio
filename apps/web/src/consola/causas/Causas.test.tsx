import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { causaGestionDePrueba } from '../../pruebas/datos-causas';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Causas } from './Causas';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const entidad = (datos: Record<string, unknown>) => ({
  id: 'e1',
  nombre: 'Cruz Roja Colombiana',
  tipo: 'ONG',
  nit: null,
  sitioWeb: 'https://www.cruzrojacolombiana.org',
  telefono: null,
  correo: null,
  descripcion: null,
  verificacion: 'VERIFICADA',
  verificadaEn: '2026-10-17T15:00:00.000Z',
  tieneLogo: false,
  causasActivas: 1,
  ...datos,
});
const PRONTO = causaGestionDePrueba({
  id: 'c2',
  titulo: 'Kits escolares para niños de Mocoa',
  cierraEl: '2026-10-27',
  porCerrar: true,
  entidad: {
    id: 'e1',
    nombre: 'Cruz Roja Colombiana',
    tieneLogo: false,
    verificadaEn: '2026-10-17T15:00:00.000Z',
  },
});
const ATENDIDA = causaGestionDePrueba({
  id: 'c3',
  titulo: 'Alimento para animales rescatados',
  estado: 'ATENDIDA',
  cerroEl: '2026-09-30',
  motivo: 'VENCIDA',
  entidad: {
    id: 'e1',
    nombre: 'Cruz Roja Colombiana',
    tieneLogo: false,
    verificadaEn: '2026-10-17T15:00:00.000Z',
  },
});
const RESPUESTAS = {
  'GET /api/causas/gestion': [causaGestionDePrueba(), PRONTO],
  'GET /api/entidades': [
    entidad({}),
    entidad({
      id: 'e2',
      nombre: 'Parroquia San José',
      verificacion: 'SIN_VERIFICAR',
      verificadaEn: null,
    }),
  ],
  'POST /api/causas': causaGestionDePrueba({ id: 'c9' }),
  'POST /api/causas/*/renovar': PRONTO,
  'POST /api/causas/*/reactivar': ATENDIDA,
  'POST /api/causas/*/archivar': ATENDIDA,
};
const pantalla = () => render(envolver(<Causas />, '/consola/causas', clienteFalso(ADMIN)));

beforeEach(() => {
  // 17 de octubre de 2026, 10:00 en Bogotá: el tope de cierre es el 17 de abril de 2027
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T15:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('las pestañas piden activas, por cerrar y atendidas', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  expect(await screen.findByText('Kits escolares para niños de Mocoa')).toBeInTheDocument();
  expect(screen.getByText('Cierra en 10 días')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: /Por cerrar/ }));
  await userEvent.click(screen.getByRole('radio', { name: 'Atendidas' }));
  expect(peticiones()).toEqual(
    expect.arrayContaining([
      'GET /api/causas/gestion?estado=activas',
      'GET /api/causas/gestion?estado=por-cerrar',
      'GET /api/causas/gestion?estado=atendidas',
    ]),
  );
  expect(await violacionesGraves(container)).toEqual([]);
});

async function abrirFormulario() {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva causa' }));
  return screen.getByRole('form', { name: 'Nueva causa' });
}

it('solo ofrece entidades verificadas y no ofrece personas desaparecidas', async () => {
  const form = await abrirFormulario();
  const selector = within(form).getByLabelText('Entidad');
  expect(
    within(selector).getByRole('option', { name: 'Cruz Roja Colombiana' }),
  ).toBeInTheDocument();
  expect(
    within(selector).queryByRole('option', { name: 'Parroquia San José' }),
  ).not.toBeInTheDocument();
  expect(
    within(form).queryByRole('button', { name: 'Personas desaparecidas' }),
  ).not.toBeInTheDocument();
  expect(within(form).getByLabelText('Fecha de cierre')).toHaveAttribute('max', '2027-04-17');
  expect(within(form).getByLabelText('Fecha de cierre')).toHaveAttribute('min', '2026-10-17');
});

async function llenar(form: HTMLElement, url = 'https://www.cruzrojacolombiana.org/donar') {
  await userEvent.click(within(form).getByRole('button', { name: 'Animales' }));
  await userEvent.type(within(form).getByLabelText('Título'), 'Alimento para animales');
  await userEvent.type(
    within(form).getByLabelText('Descripción'),
    'Concentrado y atención veterinaria para animales rescatados',
  );
  await userEvent.type(within(form).getByLabelText('Paso 1'), 'Entra al sitio');
  await userEvent.click(within(form).getByRole('button', { name: 'Agregar paso' }));
  await userEvent.type(within(form).getByLabelText('Paso 2'), 'Elige donar');
  await userEvent.click(within(form).getByRole('button', { name: 'Agregar paso' }));
  await userEvent.type(within(form).getByLabelText('Paso 3'), 'Sobra');
  await userEvent.click(within(form).getByRole('button', { name: 'Quitar paso 3' }));
  await userEvent.click(within(form).getByRole('button', { name: 'Subir paso 2' }));
  await userEvent.type(within(form).getByLabelText('Enlace oficial'), url);
  await userEvent.type(within(form).getByLabelText('Fecha de cierre'), '2026-12-01');
}

it('publicar confirma la entidad y el dominio, y manda los pasos en su orden', async () => {
  const form = await abrirFormulario();
  await llenar(form);
  await userEvent.click(within(form).getByRole('button', { name: 'Publicar causa' }));
  const confirmar = screen.getByRole('dialog', { name: '¿Publicar esta causa?' });
  expect(confirmar).toHaveTextContent('Cruz Roja Colombiana');
  expect(confirmar).toHaveTextContent('cruzrojacolombiana.org');
  expect(confirmar).not.toHaveTextContent('Ojo');
  await userEvent.click(within(confirmar).getByRole('button', { name: 'Publicar' }));
  expect(await cuerpoDe('POST /api/causas')).toEqual({
    entidadId: 'e1',
    categoria: 'ANIMALES',
    titulo: 'Alimento para animales',
    descripcion: 'Concentrado y atención veterinaria para animales rescatados',
    pasos: ['Elige donar', 'Entra al sitio'],
    urlOficial: 'https://www.cruzrojacolombiana.org/donar',
    cierraEl: '2026-12-01',
    confirmo: true,
  });
});

it('advierte si el enlace no es del dominio de la entidad', async () => {
  const form = await abrirFormulario();
  await llenar(form, 'https://donaciones-mocoa.co/x');
  await userEvent.click(within(form).getByRole('button', { name: 'Publicar causa' }));
  expect(screen.getByRole('dialog', { name: '¿Publicar esta causa?' })).toHaveTextContent(
    'Ojo: el sitio de la entidad es cruzrojacolombiana.org',
  );
});

it('muestra el error si la entidad dejó de estar verificada', async () => {
  const form = await abrirFormulario();
  await llenar(form);
  responderSegun({
    ...RESPUESTAS,
    'POST /api/causas': conEstado(409, {
      estado: 409,
      codigo: 'ENTIDAD_SIN_VERIFICAR',
      mensaje: 'Solo se publican causas de entidades verificadas',
    }),
  });
  await userEvent.click(within(form).getByRole('button', { name: 'Publicar causa' }));
  await userEvent.click(
    within(screen.getByRole('dialog', { name: '¿Publicar esta causa?' })).getByRole('button', {
      name: 'Publicar',
    }),
  );
  expect(
    await screen.findByText('Solo se publican causas de entidades verificadas'),
  ).toBeInTheDocument();
});

it('renovar pide confirmar y manda la fecha nueva', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Kits escolares/ }));
  await userEvent.clear(screen.getByLabelText('Renovar hasta'));
  await userEvent.type(screen.getByLabelText('Renovar hasta'), '2027-04-01');
  await userEvent.click(screen.getByRole('button', { name: 'Renovar' }));
  const confirmar = screen.getByRole('dialog', { name: '¿Renovar esta causa?' });
  await userEvent.click(within(confirmar).getByRole('button', { name: 'Renovar' }));
  expect(await cuerpoDe('POST /api/causas/c2/renovar')).toEqual({
    cierraEl: '2027-04-01',
    confirmo: true,
  });
});

it('reactivar una atendida también pide confirmar', async () => {
  responderSegun({ ...RESPUESTAS, 'GET /api/causas/gestion': [ATENDIDA] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Alimento para animales/ }));
  await userEvent.type(screen.getByLabelText('Reactivar hasta'), '2027-01-15');
  await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }));
  const confirmar = screen.getByRole('dialog', { name: '¿Reactivar esta causa?' });
  await userEvent.click(within(confirmar).getByRole('button', { name: 'Reactivar' }));
  expect(await cuerpoDe('POST /api/causas/c3/reactivar')).toEqual({
    cierraEl: '2027-01-15',
    confirmo: true,
  });
});
