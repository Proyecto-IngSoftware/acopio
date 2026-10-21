import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { focusManager } from '@tanstack/react-query';
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
  expect(screen.getByRole('link', { name: 'Imprimir documento' })).toHaveAttribute(
    'href',
    '/consola/remisiones/R-2026-K4P7Q/documento',
  );
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
  expect(screen.getByRole('img', { name: 'Remisión despachada' })).toBeInTheDocument();
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

describe('hallazgos de la revisión final', () => {
  const CERRADA = {
    ...BASE,
    'GET /api/emergencias': [
      { id: 'e-activa', estado: 'ACTIVA' },
      { id: 'e-cerrada', estado: 'CERRADA' },
    ],
    'GET /api/zonas': [
      {
        id: 'z-agustin',
        emergenciaId: 'e-activa',
        nombre: 'Barrio San Agustín',
        municipio: 'Mocoa',
      },
      { id: 'z-vieja', emergenciaId: 'e-cerrada', nombre: 'Vereda Vieja', municipio: 'Mocoa' },
    ],
  };

  it('con la zona de una emergencia cerrada, la muestra y guarda solo lo que cambió', async () => {
    responderSegun({
      ...CERRADA,
      'GET /api/remisiones/*': remision({ zona: { id: 'z-vieja', nombre: 'Vereda Vieja' } }),
      'PATCH /api/remisiones/*': remision({ responsable: 'Pedro Gómez' }),
    });
    pantalla();
    const destino = await screen.findByLabelText('Destino');
    await screen.findByRole('option', { name: 'Vereda Vieja (emergencia cerrada)' });
    expect(destino).toHaveValue('z-vieja');
    await userEvent.type(screen.getByLabelText('Quién lleva el envío'), 'Pedro Gómez');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar destino' }));
    await screen.findByText('Destino guardado');
    expect(await cuerpoDe('PATCH /api/remisiones/R-2026-K4P7Q')).toEqual({
      responsable: 'Pedro Gómez',
    });
  });

  it('un error al guardar las líneas se muestra', async () => {
    responderSegun({
      ...BASE,
      'GET /api/remisiones/*': remision({}),
      'PUT /api/remisiones/*/lineas': conEstado(500, {
        estado: 500,
        codigo: 'ERROR_INTERNO',
        mensaje: 'Algo falló en el servidor',
      }),
    });
    pantalla();
    const campo = await screen.findByLabelText('Cantidad de Arroz (kg)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '30');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar líneas' }));
    expect(await screen.findByText('Algo falló en el servidor')).toBeInTheDocument();
  });

  it('las cantidades escritas sobreviven a «Guardar destino»', async () => {
    responderSegun({ ...BASE, 'GET /api/remisiones/*': remision({}) });
    pantalla();
    const campo = await screen.findByLabelText('Cantidad de Arroz (kg)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '30');
    responderSegun({
      ...BASE,
      'GET /api/remisiones/*': remision({ responsable: 'Pedro Gómez' }),
      'PATCH /api/remisiones/*': remision({ responsable: 'Pedro Gómez' }),
    });
    await userEvent.type(screen.getByLabelText('Quién lleva el envío'), 'Pedro Gómez');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar destino' }));
    await screen.findByText('Destino guardado');
    await vi.waitFor(() =>
      expect(screen.getByLabelText('Quién lleva el envío')).toHaveValue('Pedro Gómez'),
    );
    expect(screen.getByLabelText('Cantidad de Arroz (kg)')).toHaveValue(30);
  });

  it('con cantidades sin guardar no deja despachar', async () => {
    responderSegun({ ...BASE, 'GET /api/remisiones/*': remision({}) });
    pantalla();
    const campo = await screen.findByLabelText('Cantidad de Arroz (kg)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '30');
    expect(screen.getByRole('button', { name: 'Despachar' })).toBeDisabled();
    expect(screen.getByText('Guarda las líneas antes de despachar')).toBeInTheDocument();
  });

  it('la hoja de despachar lista lo que sale', async () => {
    responderSegun({ ...BASE, 'GET /api/remisiones/*': remision({ responsable: 'Pedro' }) });
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Despachar' }));
    const hoja = await screen.findByRole('dialog', { name: 'Despachar R-2026-K4P7Q' });
    expect(within(hoja).getByText('Arroz · 40 kg')).toBeInTheDocument();
  });

  it('REMISION_CAMBIO al despachar ofrece ver cómo quedó', async () => {
    responderSegun({
      ...BASE,
      'GET /api/remisiones/*': remision({ responsable: 'Pedro' }),
      'POST /api/remisiones/*/despachar': conEstado(409, {
        estado: 409,
        codigo: 'REMISION_CAMBIO',
        mensaje: 'La remisión cambió; vuelve a cargarla',
      }),
    });
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Despachar' }));
    const hoja = await screen.findByRole('dialog', { name: 'Despachar R-2026-K4P7Q' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Despachar' }));
    expect(await screen.findByText('La remisión cambió mientras la editabas')).toBeInTheDocument();
  });

  it('si los folios no cargan, la hoja lo dice', async () => {
    responderSegun({
      ...BASE,
      'GET /api/remisiones/*': remision({ responsable: 'Pedro' }),
      'GET /api/remisiones/*/folios-vinculables': conEstado(500, {
        estado: 500,
        codigo: 'ERROR_INTERNO',
        mensaje: 'Falla',
      }),
    });
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Despachar' }));
    const hoja = await screen.findByRole('dialog', { name: 'Despachar R-2026-K4P7Q' });
    expect(
      await within(hoja).findByText(
        'No se pudieron cargar los folios. Puedes despachar sin vincular.',
      ),
    ).toBeInTheDocument();
  });

  it('el aviso de cambio se quita cuando la remisión vuelve a cargar sola', async () => {
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
    await screen.findByText('La remisión cambió mientras la editabas');
    // Volver a la pestaña recarga la remisión (refetchOnWindowFocus)
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await vi.waitFor(() =>
      expect(screen.queryByText('La remisión cambió mientras la editabas')).not.toBeInTheDocument(),
    );
    focusManager.setFocused(undefined);
  });

  it('con muchos folios, la hoja deja buscarlos por folio o categoría', async () => {
    const muchos = Array.from({ length: 12 }, (_, i) => ({
      folio: `ACO-2026-F${String(i).padStart(4, '0')}`,
      conciliadoEn: '2026-10-14T15:00:00.000Z',
      categorias: [i === 7 ? 'Pañales' : 'Arroz'],
    }));
    responderSegun({
      ...BASE,
      'GET /api/remisiones/*': remision({ responsable: 'Pedro' }),
      'GET /api/remisiones/*/folios-vinculables': muchos,
    });
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Despachar' }));
    const hoja = await screen.findByRole('dialog', { name: 'Despachar R-2026-K4P7Q' });
    await within(hoja).findAllByRole('checkbox');
    await userEvent.type(within(hoja).getByLabelText('Buscar folio'), 'pañales');
    expect(within(hoja).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(hoja).getByRole('checkbox', { name: /ACO-2026-F0007/ })).toBeInTheDocument();
  });
});
