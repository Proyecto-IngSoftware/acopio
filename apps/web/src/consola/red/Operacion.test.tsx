import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { MiAcopio } from './MiAcopio';
import { NoRecibir } from './NoRecibir';

const OPERADOR = {
  id: 'o',
  username: 'd.mendez',
  nombre: 'Diana Méndez',
  rol: 'OPERADOR' as const,
};
const ACOPIO = {
  ...acopioDePrueba({ id: 'x1', telefono: '3001234567' }),
  creadoEn: '2026-09-30T10:00:00.000Z',
};
const cat = (id: string, nombre: string, grupo: string) => ({
  id,
  nombre,
  grupo,
  unidadBase: 'UNIDAD',
  perecedero: false,
  sinonimos: [],
  archivada: false,
});
const RESPUESTAS = {
  'GET /api/acopios/gestion': [ACOPIO],
  'PATCH /api/acopios/*/operacion': { ...ACOPIO, estado: 'PAUSADO' },
  'GET /api/acopios/*/no-recibir': [
    {
      categoriaId: 'c2',
      categoria: 'Ropa usada',
      hasta: '2026-10-15',
      marcadoEn: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
  ],
  'GET /api/categorias': [
    cat('c1', 'Arroz', 'ALIMENTOS'),
    cat('c2', 'Ropa usada', 'ROPA_Y_ABRIGO'),
    cat('c3', 'Colchonetas', 'ROPA_Y_ABRIGO'),
  ],
  'GET /api/acopios/*/saldos': [
    {
      categoriaId: 'c1',
      categoria: 'Arroz',
      grupo: 'ALIMENTOS',
      unidad: 'UNIDAD',
      perecedero: false,
      cantidad: 120,
      umbral: { minimo: 100, maximo: 400 },
      semaforo: 'CERCA',
      ultimoMovimiento: null,
      vencimientos: [],
    },
  ],
  'PUT /api/acopios/*/umbrales/*': {
    categoriaId: 'c3',
    minimo: 10,
    maximo: 50,
    actualizadoEn: '2026-10-02T15:00:00.000Z',
  },
  'DELETE /api/acopios/*/umbrales/*': {},
  'PUT /api/acopios/*/no-recibir/*': {},
  'DELETE /api/acopios/*/no-recibir/*': {},
};
const app = (ruta: string) =>
  render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/operacion" element={<MiAcopio />} />
        <Route path="/consola/acopios/:id/no-recibir" element={<NoRecibir />} />
      </Routes>,
      ruta,
      clienteFalso(OPERADOR),
    ),
  );

describe('Mi acopio', () => {
  it('muestra el acopio en solo lectura y lo que el Operador sí puede cambiar', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/operacion');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Mi acopio');
    expect(await screen.findByText('Acopio Chapinero')).toBeInTheDocument();
    expect(screen.getByText(/habla con el Administrador/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Activo' })).toBeChecked();
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
    expect(
      await screen.findByRole('link', { name: /Umbrales y no recibir.*No recibe 1 categoría/ }),
    ).toHaveAttribute('href', '/consola/acopios/x1/no-recibir');
  });

  it('pausar y guardar manda solo lo operativo', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/operacion');
    await userEvent.click(await screen.findByRole('radio', { name: 'Pausado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await cuerpoDe('PATCH /api/acopios/x1/operacion')).toEqual({
      estado: 'PAUSADO',
      horario: ACOPIO.horario,
      telefono: '3001234567',
      indicacionesAcceso: null,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Cambios guardados');
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderSegun(RESPUESTAS);
    const { container } = app('/consola/acopios/x1/operacion');
    await screen.findByLabelText('Teléfono');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('C7 No recibir', () => {
  it('resume lo marcado y muestra un interruptor por categoría, agrupado', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    const resumen = await screen.findByRole('region', { name: 'No traigan' });
    expect(resumen).toHaveTextContent('Ropa usada');
    expect(resumen).toHaveTextContent('hasta el 15 de octubre');
    const ropa = screen.getByRole('region', { name: 'Ropa y abrigo' });
    expect(within(ropa).getByRole('switch', { name: 'Ropa usada' })).toBeChecked();
    expect(within(ropa).getByRole('switch', { name: 'Colchonetas' })).not.toBeChecked();
    expect(within(ropa).getByText('Marcado hace 2 h')).toBeInTheDocument();
  });

  it('marcar guarda al tocar, sin fecha; desmarcar la quita', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await screen.findByRole('switch', { name: 'Colchonetas' }));
    expect(await cuerpoDe('PUT /api/acopios/x1/no-recibir/c3')).toEqual({ hasta: null });
    await userEvent.click(screen.getByRole('switch', { name: 'Ropa usada' }));
    await waitFor(() => expect(peticiones()).toContain('DELETE /api/acopios/x1/no-recibir/c2'));
  });

  it('cambiar la fecha de reapertura vuelve a guardar', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    const fecha = await screen.findByLabelText('No recibir hasta (Ropa usada)');
    fireEvent.change(fecha, { target: { value: '2026-10-20' } });
    await waitFor(() => expect(peticiones()).toContain('PUT /api/acopios/x1/no-recibir/c2'));
    expect(await cuerpoDe('PUT /api/acopios/x1/no-recibir/c2')).toEqual({ hasta: '2026-10-20' });
  });

  it('el buscador filtra categorías', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await screen.findByRole('switch', { name: 'Arroz' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar categoría' }), 'colch');
    expect(screen.queryByRole('switch', { name: 'Arroz' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Colchonetas' })).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderSegun(RESPUESTAS);
    const { container } = app('/consola/acopios/x1/no-recibir');
    await screen.findByRole('switch', { name: 'Arroz' });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('C7 Umbrales', () => {
  const fila = (nombre: string) => screen.findByRole('button', { name: new RegExp(`^${nombre}`) });
  const hoja = () => screen.getByRole('dialog');

  it('se llama «Umbrales y no recibir» y cada fila dice su umbral', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Umbrales y no recibir',
    );
    expect(await fila('Arroz')).toHaveTextContent('Mín. 100 · Máx. 400 und.');
    expect(await fila('Colchonetas')).toHaveTextContent('Sin umbral');
  });

  it('tocar la fila abre la hoja y guarda mínimo y máximo', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Colchonetas'));
    expect(hoja()).toHaveAccessibleName('Umbral de Colchonetas');
    await userEvent.type(within(hoja()).getByLabelText('Mínimo'), '10');
    await userEvent.type(within(hoja()).getByLabelText('Máximo'), '50');
    await userEvent.click(within(hoja()).getByRole('button', { name: 'Guardar umbral' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await cuerpoDe('PUT /api/acopios/x1/umbrales/c3')).toEqual({ minimo: 10, maximo: 50 });
  });

  it('con el mínimo sobre el máximo avisa y no deja guardar', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Colchonetas'));
    await userEvent.type(within(hoja()).getByLabelText('Mínimo'), '60');
    await userEvent.type(within(hoja()).getByLabelText('Máximo'), '50');
    expect(within(hoja()).getByRole('alert')).toHaveTextContent(
      'El mínimo no puede ser mayor que el máximo.',
    );
    expect(within(hoja()).getByRole('button', { name: 'Guardar umbral' })).toBeDisabled();
  });

  it('abre con el umbral actual y «Quitar umbral» lo borra', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Arroz'));
    expect(within(hoja()).getByLabelText('Mínimo')).toHaveValue('100');
    expect(within(hoja()).getByLabelText('Máximo')).toHaveValue('400');
    await userEvent.click(within(hoja()).getByRole('button', { name: 'Quitar umbral' }));
    await waitFor(() => expect(peticiones()).toContain('DELETE /api/acopios/x1/umbrales/c1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sin umbral no ofrece quitarlo', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Colchonetas'));
    expect(within(hoja()).queryByRole('button', { name: 'Quitar umbral' })).not.toBeInTheDocument();
  });

  it('si la API rechaza el umbral, la hoja muestra el mensaje y sigue abierta', async () => {
    responderSegun({
      ...RESPUESTAS,
      'PUT /api/acopios/*/umbrales/*': conEstado(403, {
        estado: 403,
        codigo: 'PROHIBIDO',
        mensaje: 'No tienes acceso a este acopio',
      }),
    });
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Colchonetas'));
    await userEvent.type(within(hoja()).getByLabelText('Mínimo'), '10');
    await userEvent.type(within(hoja()).getByLabelText('Máximo'), '50');
    await userEvent.click(within(hoja()).getByRole('button', { name: 'Guardar umbral' }));
    expect(await within(hoja()).findByText('No tienes acceso a este acopio')).toBeInTheDocument();
  });

  it('la hoja no tiene violaciones graves de accesibilidad', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1/no-recibir');
    await userEvent.click(await fila('Arroz'));
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});
