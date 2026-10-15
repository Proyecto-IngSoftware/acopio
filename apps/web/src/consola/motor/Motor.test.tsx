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
import { Motor } from './Motor';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };

const sugerencia = (datos: Record<string, unknown>) => ({
  id: 's1',
  ronda: '2026-10-14T14:40:00.000Z',
  estado: 'PROPUESTA',
  acopio: { id: 'a-suba', nombre: 'Acopio Suba' },
  zona: { id: 'z-pepino', nombre: 'Vereda El Pepino' },
  emergencia: { id: 'e1', nombre: 'Inundaciones Putumayo' },
  categoria: { id: 'c-arroz', nombre: 'Arroz', unidad: 'KILOGRAMO' },
  cantidad: 560,
  puntaje: 0.6,
  desglose: { criticidad: 1, urgencia: 0.4, proximidad: 0, magnitud: 0.8 },
  justificacion:
    'Vereda El Pepino tiene 0 % de cobertura en arroz; Acopio Suba puede mandar 700 kg sin bajar de su máximo, a 493 km',
  cantidadAprobada: null,
  remisionCodigo: null,
  motivoDescarte: null,
  decididaPor: null,
  decididaEn: null,
  ...datos,
});

const KENNEDY = sugerencia({
  id: 's2',
  acopio: { id: 'a-kennedy', nombre: 'Acopio Kennedy' },
  zona: { id: 'z-agustin', nombre: 'Barrio San Agustín' },
  cantidad: 440,
  puntaje: 0.48,
  desglose: { criticidad: 0.97, urgencia: 0.4, proximidad: 0.04, magnitud: 0.63 },
  justificacion:
    'Barrio San Agustín tiene 3 % de cobertura en arroz; Acopio Kennedy puede mandar 440 kg sin bajar de su máximo, a 474 km',
});
const LISTA = [KENNEDY, sugerencia({})];

const aprobacion = (creada: boolean) => ({
  sugerenciaId: 's1',
  cantidad: 500,
  remision: { id: 'r1', codigo: 'R-2026-K4P7Q', creada },
});

const pantalla = (ruta = '/consola/motor') =>
  render(envolver(<Motor />, ruta, clienteFalso(ADMIN)));

const tarjetas = async () => {
  await screen.findByText(/Vereda El Pepino tiene 0 %/);
  return screen.getAllByRole('article');
};

it('lista las sugerencias por puntaje con su justificación y sus cuatro componentes', async () => {
  responderSegun({ 'GET /api/sugerencias': LISTA });
  pantalla();
  const [primera, segunda] = await tarjetas();
  expect(primera).toHaveTextContent('Acopio Suba → Vereda El Pepino');
  expect(primera).toHaveTextContent('0,60');
  expect(primera).toHaveTextContent('Arroz · 560 kg');
  expect(primera).toHaveTextContent(
    'Vereda El Pepino tiene 0 % de cobertura en arroz; Acopio Suba puede mandar 700 kg sin bajar de su máximo, a 493 km',
  );
  expect(within(primera!).getAllByRole('meter')).toHaveLength(4);
  expect(within(primera!).getByRole('meter', { name: 'Magnitud' })).toHaveAttribute(
    'aria-valuenow',
    '80',
  );
  expect(segunda).toHaveTextContent('0,48');
  expect(peticiones()).toContain('GET /api/sugerencias?estado=PROPUESTA');
});

it('recalcular pide una ronda nueva y dice cuántas sugerencias dejó', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/recalcular': { ronda: '2026-10-14T15:00:00.000Z', generadas: 2 },
  });
  pantalla();
  await tarjetas();
  await userEvent.click(screen.getByRole('button', { name: 'Recalcular' }));
  expect(await screen.findByText('Ronda nueva: 2 sugerencias')).toBeInTheDocument();
  expect(peticiones()).toContain('POST /api/sugerencias/recalcular');
});

it('sin sugerencias explica que el motor no encontró traslados', async () => {
  responderSegun({
    'GET /api/sugerencias': [],
    'POST /api/sugerencias/recalcular': { ronda: '2026-10-14T15:00:00.000Z', generadas: 0 },
  });
  pantalla();
  expect(await screen.findByText('El motor no encontró traslados que hacer')).toBeInTheDocument();
  expect(screen.getByText(/Sin rondas todavía/)).toBeInTheDocument();
});

it('aprobar con la cantidad editada crea la remisión y lo dice', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/aprobar': aprobacion(true),
  });
  pantalla();
  const [suba] = await tarjetas();
  await userEvent.click(within(suba!).getByRole('button', { name: 'Aprobar' }));
  const hoja = screen.getByRole('dialog', { name: 'Aprobar traslado' });
  expect(hoja).toHaveTextContent('Sugeridos 560 kg');
  const campo = within(hoja).getByLabelText('Cantidad (kg)');
  await userEvent.clear(campo);
  await userEvent.type(campo, '500');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Aprobar 500 kg' }));
  expect(await cuerpoDe('POST /api/sugerencias/s1/aprobar')).toEqual({ cantidad: 500 });
  expect(await screen.findByText('Se creó la remisión R-2026-K4P7Q')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('si ya había borrador, dice a cuál se sumó', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/aprobar': aprobacion(false),
  });
  pantalla();
  const [suba] = await tarjetas();
  await userEvent.click(within(suba!).getByRole('button', { name: 'Aprobar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar 560 kg' }));
  expect(await screen.findByText('Sumado a R-2026-K4P7Q')).toBeInTheDocument();
});

it('si la situación cambió, ofrece usar el máximo que da la API', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/aprobar': conEstado(409, {
      estado: 409,
      codigo: 'SUGERENCIA_DESACTUALIZADA',
      mensaje: 'La situación cambió: hoy se pueden mandar hasta 300. Recalcula el motor',
      detalles: { maximo: 300 },
    }),
  });
  pantalla();
  const [suba] = await tarjetas();
  await userEvent.click(within(suba!).getByRole('button', { name: 'Aprobar' }));
  const hoja = screen.getByRole('dialog', { name: 'Aprobar traslado' });
  await userEvent.click(within(hoja).getByRole('button', { name: 'Aprobar 560 kg' }));
  await userEvent.click(await within(hoja).findByRole('button', { name: 'Usar 300' }));
  expect(within(hoja).getByLabelText('Cantidad (kg)')).toHaveValue('300');
});

it('si otra persona ya decidió, cierra la hoja y vuelve a pedir la lista', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/aprobar': conEstado(409, {
      estado: 409,
      codigo: 'SUGERENCIA_DECIDIDA',
      mensaje: 'Esta sugerencia ya fue decidida',
    }),
  });
  pantalla();
  const [suba] = await tarjetas();
  await userEvent.click(within(suba!).getByRole('button', { name: 'Aprobar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar 560 kg' }));
  expect(await screen.findByText('Otra persona ya decidió esta sugerencia')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/sugerencias?estado=PROPUESTA')).toHaveLength(
      2,
    ),
  );
});

it('descartar exige un motivo de al menos 10 caracteres; los atajos lo llenan', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/descartar': { id: 's2' },
  });
  pantalla();
  const [, kennedy] = await tarjetas();
  await userEvent.click(within(kennedy!).getByRole('button', { name: 'Descartar' }));
  const hoja = screen.getByRole('dialog', { name: 'Descartar traslado' });
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'corta');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Descartar' }));
  expect(within(hoja).getByText('Escribe al menos 10 caracteres')).toBeInTheDocument();
  expect(peticiones()).not.toContain('POST /api/sugerencias/s2/descartar');
  await userEvent.click(within(hoja).getByRole('button', { name: 'La vía está cerrada' }));
  await userEvent.click(within(hoja).getByRole('button', { name: 'Descartar' }));
  expect(await cuerpoDe('POST /api/sugerencias/s2/descartar')).toEqual({
    motivo: 'La vía está cerrada',
  });
});

it('el filtro de descartadas muestra el motivo en lugar de los botones', async () => {
  responderSegun({
    'GET /api/sugerencias': [
      sugerencia({
        estado: 'DESCARTADA',
        motivoDescarte: 'La vía está cerrada',
        decididaPor: 'Joseph Quintero',
        decididaEn: '2026-10-14T15:02:00.000Z',
      }),
    ],
  });
  pantalla('/consola/motor?estado=DESCARTADA');
  const [tarjeta] = await tarjetas();
  expect(tarjeta).toHaveTextContent('Descartada por Joseph Quintero · «La vía está cerrada»');
  expect(within(tarjeta!).queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  expect(peticiones()).toContain('GET /api/sugerencias?estado=DESCARTADA');
});

it('sin red explica que necesita conexión', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  pantalla();
  expect(
    await screen.findByRole('heading', { name: 'El motor necesita conexión' }),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/sugerencias': LISTA });
  const { container } = pantalla();
  await tarjetas();
  expect(await violacionesGraves(container)).toEqual([]);
});

it('un filtro que ya no tiene sugerencias se ve y se puede quitar', async () => {
  responderSegun({ 'GET /api/sugerencias': [] });
  pantalla('/consola/motor?estado=APROBADA&zona=z-otra');
  await userEvent.click(await screen.findByRole('button', { name: 'Quitar filtros' }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/sugerencias?estado=APROBADA'));
  expect(screen.getByLabelText('Zona')).toHaveValue('');
});

it('al descartar algo que otra persona ya decidió, cierra la hoja y recarga', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/descartar': conEstado(409, {
      estado: 409,
      codigo: 'SUGERENCIA_DECIDIDA',
      mensaje: 'Esta sugerencia ya se decidió',
    }),
  });
  pantalla();
  const [, kennedy] = await tarjetas();
  await userEvent.click(within(kennedy!).getByRole('button', { name: 'Descartar' }));
  const hoja = screen.getByRole('dialog', { name: 'Descartar traslado' });
  await userEvent.click(within(hoja).getByRole('button', { name: 'La vía está cerrada' }));
  await userEvent.click(within(hoja).getByRole('button', { name: 'Descartar' }));
  expect(await screen.findByText('Otra persona ya decidió esta sugerencia')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(peticiones().filter((p) => p === 'GET /api/sugerencias?estado=PROPUESTA')).toHaveLength(
      2,
    ),
  );
});

it('si la sugerencia ya no existe porque el motor recalculó, lo dice y recarga', async () => {
  responderSegun({
    'GET /api/sugerencias': LISTA,
    'POST /api/sugerencias/*/aprobar': conEstado(404, {
      estado: 404,
      codigo: 'SUGERENCIA_NO_ENCONTRADA',
      mensaje: 'La sugerencia no existe. Revisa la lista nueva',
    }),
  });
  pantalla();
  const [suba] = await tarjetas();
  await userEvent.click(within(suba!).getByRole('button', { name: 'Aprobar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar 560 kg' }));
  expect(
    await screen.findByText('Esa sugerencia ya no está: el motor recalculó'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('quitar uno a una cantidad con decimales no deja ruido de coma flotante', async () => {
  responderSegun({ 'GET /api/sugerencias': [sugerencia({ cantidad: 1.4 })] });
  pantalla();
  const [tarjeta] = await tarjetas();
  await userEvent.click(within(tarjeta!).getByRole('button', { name: 'Aprobar' }));
  const hoja = screen.getByRole('dialog', { name: 'Aprobar traslado' });
  await userEvent.click(within(hoja).getByRole('button', { name: 'Quitar uno' }));
  expect(within(hoja).getByLabelText('Cantidad (kg)')).toHaveValue('0,4');
});
