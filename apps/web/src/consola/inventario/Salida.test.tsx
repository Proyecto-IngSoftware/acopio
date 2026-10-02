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
import { Salida } from './Salida';

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
const resultado = (cantidad: number, saldo: number) => ({
  movimiento: {
    id: 'm1',
    tipo: 'SALIDA',
    categoriaId: 'c3',
    cantidad,
    signo: -1,
    motivoSalida: 'ENTREGA_FAMILIAS',
    nota: null,
    motivo: null,
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
    'POST /api/acopios/x1/salidas': resultado(12, 300),
    ...extra,
  });
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/salida" element={<Salida />} />
      </Routes>,
      '/consola/acopios/x1/salida',
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
const registrar = () => screen.getByRole('button', { name: /Registrar salida/ });

describe('C5 Salida', () => {
  it('muestra el saldo con su semáforo y, en perecederos, lo que vence primero', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Saldo actual: 120 kg');
    expect(elegida).toHaveTextContent('Cerca del mínimo');
    const primero = screen.getByRole('region', { name: 'Sale primero' });
    expect(primero).toHaveTextContent('40 kg vencen el 12 de octubre');
    expect(primero).toHaveTextContent('80 kg vencen el 30 de octubre');
  });

  it('sin fechas de vencimiento no muestra «Sale primero»', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(screen.queryByRole('region', { name: 'Sale primero' })).not.toBeInTheDocument();
  });

  it('registra con el motivo, muestra el saldo resultante y queda lista para otra', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('1', '2');
    expect(screen.getByText('Quedan 300 und.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Entrega directa a familias' })).toBeChecked();
    await userEvent.click(registrar());
    expect(await screen.findByRole('status')).toHaveTextContent('Pañal adulto: 300 und.');
    expect(await cuerpoDe('POST /api/acopios/x1/salidas')).toEqual({
      categoriaId: 'c3',
      cantidad: 12,
      motivoSalida: 'ENTREGA_FAMILIAS',
    });
    expect(screen.queryByRole('region', { name: 'Categoría elegida' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toHaveValue('');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('');
  });

  it('Traslado pide una nota; con solo espacios no deja registrar', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('1', '2');
    expect(screen.queryByRole('textbox', { name: 'Nota' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Traslado a otra organización' }));
    const nota = screen.getByRole('textbox', { name: 'Nota' });
    expect(registrar()).toBeDisabled();
    await userEvent.type(nota, '   ');
    expect(registrar()).toBeDisabled();
    await userEvent.type(nota, 'Fundación Sol ');
    await userEvent.click(registrar());
    await screen.findByRole('status');
    expect(await cuerpoDe('POST /api/acopios/x1/salidas')).toEqual({
      categoriaId: 'c3',
      cantidad: 12,
      motivoSalida: 'TRASLADO',
      nota: 'Fundación Sol',
    });
  });

  it('si la cantidad pasa del saldo avisa cuánto hay y no deja registrar', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('4', '0', '0');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Solo hay 312 und. Escribe una cantidad igual o menor.',
    );
    expect(registrar()).toBeDisabled();
  });

  it('si la API responde que no alcanza, avisa con su saldo y vuelve a pedir los saldos', async () => {
    pantalla({
      'POST /api/acopios/x1/salidas': conEstado(409, {
        estado: 409,
        codigo: 'SALDO_INSUFICIENTE',
        mensaje: 'No alcanza: hay 5 disponibles',
        detalles: { saldo: 5 },
      }),
    });
    await elegir('panal', /Pañal adulto/);
    await teclear('1', '2');
    await userEvent.click(registrar());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Solo hay 5 und. Escribe una cantidad igual o menor.',
    );
    expect(peticiones().filter((p) => p === 'GET /api/acopios/x1/saldos').length).toBeGreaterThan(
      1,
    );
  });

  it('cambiar de categoría limpia la cantidad y el motivo', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('5');
    await userEvent.click(screen.getByRole('radio', { name: 'Vencido o dañado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await elegir('arroz', /Arroz/);
    expect(screen.getByLabelText('Cantidad')).toHaveValue('');
    expect(screen.getByRole('radio', { name: 'Entrega directa a familias' })).toBeChecked();
  });

  it('si el Operador ya no está asignado muestra el mensaje de la API', async () => {
    pantalla({
      'POST /api/acopios/x1/salidas': conEstado(403, {
        estado: 403,
        codigo: 'PROHIBIDO',
        mensaje: 'No tienes acceso a este acopio',
      }),
    });
    await elegir('panal', /Pañal adulto/);
    await teclear('1');
    await userEvent.click(registrar());
    expect(await screen.findByText('No tienes acceso a este acopio')).toBeInTheDocument();
    expect(peticiones().filter((p) => p.startsWith('POST')).length).toBe(1);
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = pantalla();
    await elegir('arroz', /Arroz/);
    await teclear('1', '0');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
