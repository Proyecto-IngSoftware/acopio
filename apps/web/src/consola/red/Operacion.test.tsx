import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import {
  clienteFalso,
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
    expect(await screen.findByRole('link', { name: /No recibir · 1 categoría/ })).toHaveAttribute(
      'href',
      '/consola/acopios/x1/no-recibir',
    );
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
