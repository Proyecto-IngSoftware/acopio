import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
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
import { EXCEDENTE_KENNEDY, remision } from './datos-prueba';
import { DetalleRemision } from './DetalleRemision';

const OPERADOR = {
  id: 'u1',
  username: 'b.operador',
  nombre: 'Brayan Operador',
  rol: 'OPERADOR' as const,
};

const BASE = {
  'GET /api/ubicaciones/mias': [],
  'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY,
  'GET /api/emergencias': [{ id: 'e-activa', estado: 'ACTIVA' }],
  'GET /api/zonas': [
    { id: 'z-agustin', emergenciaId: 'e-activa', nombre: 'Barrio San Agustín', municipio: 'Mocoa' },
  ],
  'GET /api/remisiones/*/folios-vinculables': [
    {
      folio: 'ACO-2026-AB12C',
      conciliadoEn: '2026-10-14T15:00:00.000Z',
      categorias: ['Agua potable'],
    },
  ],
};

function pantalla(codigo = 'R-2026-K4P7Q') {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/remisiones/:codigo" element={<DetalleRemision />} />
      </Routes>,
      `/consola/remisiones/${codigo}`,
      clienteFalso(OPERADOR),
    ),
  );
}

it('un borrador ofrece despachar y cancelar, y no imprimir', async () => {
  responderSegun({ ...BASE, 'GET /api/remisiones/*': remision({}) });
  pantalla();
  expect(await screen.findByRole('button', { name: 'Despachar' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancelar remisión' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Imprimir documento' })).not.toBeInTheDocument();
  expect(await screen.findByLabelText('Cantidad de Arroz (kg)')).toHaveValue(40);
});

it('en tránsito ofrece imprimir y cancelar, y no despachar', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({
      estado: 'EN_TRANSITO',
      responsable: 'Pedro Gómez',
      despachadaEn: '2026-10-15T10:00:00.000Z',
      folios: ['ACO-2026-AB12C'],
    }),
  });
  pantalla();
  expect(await screen.findByRole('link', { name: 'Imprimir documento' })).toHaveAttribute(
    'href',
    '/consola/remisiones/R-2026-K4P7Q/documento',
  );
  expect(screen.getByRole('button', { name: 'Cancelar remisión' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Despachar' })).not.toBeInTheDocument();
  expect(screen.getByText(/ACO-2026-AB12C/)).toBeInTheDocument();
});

it('una recibida no tiene acciones y muestra sus fotos', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({
      estado: 'RECIBIDA',
      responsable: 'Pedro Gómez',
      despachadaEn: '2026-10-15T10:00:00.000Z',
      recibidaEn: '2026-10-16T10:00:00.000Z',
      notaRecepcion: 'Llegó completo al coliseo',
      evidencias: 2,
      lineas: [
        {
          categoriaId: 'c-arroz',
          categoria: 'Arroz',
          unidad: 'KILOGRAMO',
          cantidadPlaneada: 40,
          cantidadRecibida: 40,
        },
      ],
    }),
  });
  pantalla();
  const fotos = await screen.findAllByRole('img', { name: /Foto \d de la entrega/ });
  expect(fotos).toHaveLength(2);
  expect(fotos[0]!.getAttribute('src')).toMatch(/\/evidencia\/0$/);
  expect(screen.getByText(/Llegó completo al coliseo/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar remisión' })).not.toBeInTheDocument();
});

it('una cancelada muestra el motivo', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({
      estado: 'CANCELADA',
      canceladaEn: '2026-10-15T11:00:00.000Z',
      motivoCancelacion: 'La vía a Mocoa está cerrada',
    }),
  });
  pantalla();
  expect(await screen.findByText(/La vía a Mocoa está cerrada/)).toBeInTheDocument();
});

it('despachar sin responsable lo pide, lo guarda y después despacha con los folios', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({}),
    'PATCH /api/remisiones/*': remision({ responsable: 'Pedro Gómez' }),
    'POST /api/remisiones/*/despachar': remision({ estado: 'EN_TRANSITO' }),
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Despachar' }));
  const hoja = await screen.findByRole('dialog', { name: 'Despachar R-2026-K4P7Q' });
  await userEvent.click(within(hoja).getByRole('button', { name: 'Despachar' }));
  expect(within(hoja).getByText('Escribe quién lleva el envío')).toBeInTheDocument();
  await userEvent.type(within(hoja).getByLabelText('Quién lleva el envío'), 'Pedro Gómez');
  await userEvent.click(await within(hoja).findByRole('checkbox', { name: /ACO-2026-AB12C/ }));
  await userEvent.click(within(hoja).getByRole('button', { name: 'Despachar' }));
  expect(await screen.findByText('R-2026-K4P7Q va en camino')).toBeInTheDocument();
  const orden = peticiones().filter((p) => !p.startsWith('GET'));
  expect(orden).toEqual([
    'PATCH /api/remisiones/R-2026-K4P7Q',
    'POST /api/remisiones/R-2026-K4P7Q/despachar',
  ]);
  expect(await cuerpoDe('PATCH /api/remisiones/R-2026-K4P7Q')).toEqual({
    responsable: 'Pedro Gómez',
  });
  expect(await cuerpoDe('POST /api/remisiones/R-2026-K4P7Q/despachar')).toEqual({
    folios: ['ACO-2026-AB12C'],
  });
});

it('cancelar pide un motivo de al menos 10 caracteres', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({}),
    'POST /api/remisiones/*/cancelar': remision({ estado: 'CANCELADA' }),
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cancelar remisión' }));
  const hoja = await screen.findByRole('dialog', { name: 'Cancelar R-2026-K4P7Q' });
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'corto');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Cancelar remisión' }));
  expect(within(hoja).getByText('Escribe al menos 10 caracteres')).toBeInTheDocument();
  await userEvent.clear(within(hoja).getByLabelText('Motivo'));
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'La vía a Mocoa está cerrada');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Cancelar remisión' }));
  expect(await cuerpoDe('POST /api/remisiones/R-2026-K4P7Q/cancelar')).toEqual({
    motivo: 'La vía a Mocoa está cerrada',
  });
});

it('si la remisión cambió, lo dice y vuelve a pedirla', async () => {
  responderSegun({
    ...BASE,
    'GET /api/remisiones/*': remision({}),
    'PUT /api/remisiones/*/lineas': conEstado(409, {
      estado: 409,
      codigo: 'REMISION_ESTADO_INVALIDO',
      mensaje: 'La remisión está EN_TRANSITO',
    }),
  });
  pantalla();
  const campo = await screen.findByLabelText('Cantidad de Arroz (kg)');
  await userEvent.clear(campo);
  await userEvent.type(campo, '30');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar líneas' }));
  expect(await screen.findByText('La remisión cambió mientras la editabas')).toBeInTheDocument();
  const antes = peticiones().filter((p) => p === 'GET /api/remisiones/R-2026-K4P7Q').length;
  await userEvent.click(screen.getByRole('button', { name: 'Ver cómo quedó' }));
  await vi.waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/remisiones/R-2026-K4P7Q').length).toBe(
      antes + 1,
    ),
  );
});

it('un código que no existe lo dice', async () => {
  responderSegun(BASE);
  pantalla('R-2026-XXXXX');
  expect(await screen.findByText('No encontramos la remisión R-2026-XXXXX')).toBeInTheDocument();
});

it('sin red explica que necesita conexión', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  responderSegun(BASE);
  pantalla();
  expect(
    await screen.findByRole('heading', { name: 'Las remisiones necesitan conexión' }),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ ...BASE, 'GET /api/remisiones/*': remision({}) });
  const { container } = pantalla();
  await screen.findByLabelText('Cantidad de Arroz (kg)');
  expect(await violacionesGraves(container)).toEqual([]);
});
