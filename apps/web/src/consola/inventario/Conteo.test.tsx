import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { ACOPIO, SALDOS } from './datos-prueba';
import { Conteo } from './Conteo';

const OPERADOR = {
  id: 'o',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const busqueda = [
  {
    id: 'c2',
    nombre: 'Arroz',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: true,
    puntaje: 0.9,
  },
  {
    id: 'c3',
    nombre: 'Pañal adulto',
    grupo: 'ADULTO_MAYOR',
    unidadBase: 'UNIDAD',
    perecedero: false,
    puntaje: 0.8,
  },
];
const resultado = (cantidad: number, signo: 1 | -1, saldo: number) => ({
  movimiento: {
    id: 'm1',
    tipo: 'AJUSTE',
    categoriaId: 'c3',
    cantidad,
    signo,
    motivoSalida: null,
    nota: null,
    motivo: 'Paquetes rotos por humedad',
    venceEn: null,
    ocurridoEn: '2026-10-02T15:00:00.000Z',
    registradoEn: '2026-10-02T15:00:00.000Z',
    origenOffline: false,
  },
  saldo,
  noRecibe: false,
});

const pantalla = (extra: Record<string, unknown> = {}) => {
  responderSegun({
    'GET /api/categorias/buscar': busqueda,
    'GET /api/acopios/x1/saldos': SALDOS,
    'GET /api/acopios/x1': ACOPIO,
    'POST /api/acopios/x1/ajustes': resultado(12, -1, 300),
    ...extra,
  });
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/conteo" element={<Conteo />} />
      </Routes>,
      '/consola/acopios/x1/conteo',
      clienteFalso(OPERADOR),
    ),
  );
};

const elegir = async (texto: string, nombre: RegExp) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), texto);
  await userEvent.click(await screen.findByRole('button', { name: nombre }));
};
const teclear = async (...teclas: string[]) => {
  const teclado = screen.getByRole('group', { name: 'Teclado numérico' });
  for (const t of teclas) await userEvent.click(within(teclado).getByRole('button', { name: t }));
};
const registrar = () => screen.getByRole('button', { name: /Registrar ajuste/ });
const motivo = () => screen.getByRole('textbox', { name: 'Motivo del ajuste' });

describe('C6 Conteo físico', () => {
  it('muestra lo que dice el sistema y cuándo fue el último movimiento', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('En el sistema: 312 und.');
    expect(elegida).toHaveTextContent('Último movimiento hace 1 día');
  });

  it('muestra la diferencia con su signo y el saldo que queda', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '0', '0');
    const dif = screen.getByRole('region', { name: 'Diferencia' });
    expect(dif).toHaveTextContent('Diferencia −12 und.');
    expect(dif).toHaveTextContent('El saldo pasará de 312 und. a 300 und.');
    await teclear('Borrar', 'Borrar', '2', '0');
    expect(screen.getByRole('region', { name: 'Diferencia' })).toHaveTextContent(
      'Diferencia +8 und.',
    );
  });

  it('si lo contado coincide con el sistema no deja registrar', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '1', '2');
    await userEvent.type(motivo(), 'Conteo semanal completo');
    expect(screen.getByRole('region', { name: 'Diferencia' })).toHaveTextContent(
      'Coincide con el sistema',
    );
    expect(registrar()).toBeDisabled();
  });

  it('pide 10 caracteres de motivo y dice cuántos faltan', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '0', '0');
    await userEvent.type(motivo(), 'Rotos    ');
    expect(screen.getByText(/Faltan 5 caracteres/)).toBeInTheDocument();
    expect(registrar()).toBeDisabled();
    await userEvent.type(motivo(), 'por humedad');
    expect(screen.queryByText(/Faltan/)).not.toBeInTheDocument();
    expect(registrar()).toBeEnabled();
  });

  it('registra el ajuste, muestra el saldo resultante y queda lista para otro', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '0', '0');
    await userEvent.type(motivo(), ' Paquetes rotos por humedad ');
    await userEvent.click(registrar());
    expect(await screen.findByRole('status')).toHaveTextContent('Pañal adulto: 300 und.');
    expect(await cuerpoDe('POST /api/acopios/x1/ajustes')).toEqual({
      categoriaId: 'c3',
      cantidadContada: 300,
      motivo: 'Paquetes rotos por humedad',
    });
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toHaveValue('');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('');
  });

  it('acepta un conteo de cero', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('0');
    await userEvent.type(motivo(), 'Se mojó toda la estiba');
    expect(screen.getByRole('region', { name: 'Diferencia' })).toHaveTextContent(
      'Diferencia −312 und.',
    );
    expect(registrar()).toBeEnabled();
  });

  it('si la API dice que no hay diferencia, muestra que coincide', async () => {
    pantalla({
      'POST /api/acopios/x1/ajustes': conEstado(422, {
        estado: 422,
        codigo: 'SIN_DIFERENCIA',
        mensaje: 'La cantidad contada es igual al saldo',
      }),
    });
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '0', '0');
    await userEvent.type(motivo(), 'Conteo semanal completo');
    await userEvent.click(registrar());
    expect(
      await screen.findByText('Otra persona registró antes: ahora coincide con el sistema.'),
    ).toBeInTheDocument();
    expect(peticiones().filter((p) => p === 'GET /api/acopios/x1/saldos').length).toBeGreaterThan(
      1,
    );
  });

  it('cambiar de categoría limpia la cantidad y el motivo', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('5');
    await userEvent.type(motivo(), 'Algo pasó aquí');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await elegir('arroz', /Arroz/);
    expect(screen.getByLabelText('Cantidad')).toHaveValue('');
    expect(motivo()).toHaveValue('');
  });

  it('si el Operador ya no está asignado muestra el mensaje de la API', async () => {
    pantalla({
      'POST /api/acopios/x1/ajustes': conEstado(403, {
        estado: 403,
        codigo: 'PROHIBIDO',
        mensaje: 'No tienes acceso a este acopio',
      }),
    });
    await elegir('panal', /Pañal adulto/);
    await teclear('3', '0', '0');
    await userEvent.type(motivo(), 'Paquetes rotos por humedad');
    await userEvent.click(registrar());
    expect(await screen.findByText('No tienes acceso a este acopio')).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = pantalla();
    await elegir('arroz', /Arroz/);
    await teclear('1', '0');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
