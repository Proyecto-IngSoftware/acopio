import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  responderSegun,
} from '../../pruebas/utilidades';
import { EXCEDENTE_KENNEDY, excedente, remision } from './datos-prueba';
import { NuevaRemision } from './NuevaRemision';

const persona = (rol: 'ADMIN' | 'OPERADOR') => ({
  id: 'u1',
  username: 'b.operador',
  nombre: 'Brayan Operador',
  rol,
});

const BASE = {
  'GET /api/ubicaciones/mias': [
    {
      tipo: 'ACOPIO',
      id: 'a-kennedy',
      nombre: 'Acopio Kennedy',
      municipio: 'Bogotá',
      estado: 'ACTIVO',
    },
  ],
  'GET /api/acopios/gestion': [
    { id: 'a-kennedy', nombre: 'Acopio Kennedy' },
    { id: 'a-suba', nombre: 'Acopio Suba' },
  ],
  'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY,
  'GET /api/emergencias': [
    { id: 'e-activa', estado: 'ACTIVA' },
    { id: 'e-cerrada', estado: 'CERRADA' },
  ],
  'GET /api/zonas': [
    { id: 'z-agustin', emergenciaId: 'e-activa', nombre: 'Barrio San Agustín', municipio: 'Mocoa' },
    { id: 'z-vieja', emergenciaId: 'e-cerrada', nombre: 'Vereda Vieja', municipio: 'Mocoa' },
  ],
};

function pantalla(rol: 'ADMIN' | 'OPERADOR') {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/remisiones/nueva" element={<NuevaRemision />} />
        <Route path="/consola/remisiones/:codigo" element={<p>Detalle abierto</p>} />
      </Routes>,
      '/consola/remisiones/nueva',
      clienteFalso(persona(rol)),
    ),
  );
}

it('el Operador arma la remisión en su acopio, sin elegirlo', async () => {
  responderSegun(BASE);
  pantalla('OPERADOR');
  expect(await screen.findByLabelText('Cantidad de Arroz (kg)')).toBeInTheDocument();
  expect(screen.queryByLabelText('Acopio de origen')).not.toBeInTheDocument();
});

it('el Administrador elige el acopio antes de ver el editor', async () => {
  responderSegun(BASE);
  pantalla('ADMIN');
  const acopio = await screen.findByLabelText('Acopio de origen');
  expect(screen.queryByLabelText('Cantidad de Arroz (kg)')).not.toBeInTheDocument();
  await screen.findByRole('option', { name: 'Acopio Kennedy' });
  await userEvent.selectOptions(acopio, 'a-kennedy');
  expect(await screen.findByLabelText('Cantidad de Arroz (kg)')).toBeInTheDocument();
});

it('crea un despacho general sin responsable y abre el detalle', async () => {
  responderSegun({ ...BASE, 'POST /api/remisiones': remision({ zona: null }) });
  pantalla('OPERADOR');
  await userEvent.type(await screen.findByLabelText('Cantidad de Arroz (kg)'), '12');
  await userEvent.click(screen.getByRole('button', { name: 'Crear borrador' }));
  expect(await screen.findByText('Detalle abierto')).toBeInTheDocument();
  expect(await cuerpoDe('POST /api/remisiones')).toEqual({
    acopioId: 'a-kennedy',
    zonaId: null,
    responsable: null,
    lineas: [{ categoriaId: 'c-arroz', cantidad: 12 }],
  });
});

it('el destino ofrece solo zonas de emergencias vigentes', async () => {
  responderSegun(BASE);
  pantalla('OPERADOR');
  const destino = await screen.findByLabelText('Destino');
  expect(
    await screen.findByRole('option', { name: 'Barrio San Agustín · Mocoa' }),
  ).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /Vereda Vieja/ })).not.toBeInTheDocument();
  expect(destino).toHaveValue('');
});

it('una zona de una emergencia cerrada muestra el mensaje de la API junto al destino', async () => {
  responderSegun({
    ...BASE,
    'POST /api/remisiones': conEstado(409, {
      estado: 409,
      codigo: 'ZONA_SOLO_LECTURA',
      mensaje: 'La emergencia está cerrada: sus zonas quedan en solo lectura',
    }),
  });
  pantalla('OPERADOR');
  await userEvent.selectOptions(await screen.findByLabelText('Destino'), 'z-agustin');
  await userEvent.type(screen.getByLabelText('Cantidad de Arroz (kg)'), '12');
  await userEvent.click(screen.getByRole('button', { name: 'Crear borrador' }));
  expect(
    await screen.findByText('La emergencia está cerrada: sus zonas quedan en solo lectura'),
  ).toBeInTheDocument();
});

it('sin nada movible lo explica', async () => {
  responderSegun({ ...BASE, 'GET /api/acopios/*/excedentes': [excedente({ movible: 0 })] });
  pantalla('OPERADOR');
  expect(await screen.findByText('Este acopio no tiene excedente para mandar')).toBeInTheDocument();
});

it('sin red explica que necesita conexión', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  responderSegun(BASE);
  pantalla('OPERADOR');
  expect(
    await screen.findByRole('heading', { name: 'Las remisiones necesitan conexión' }),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(BASE);
  const { container } = pantalla('OPERADOR');
  await screen.findByLabelText('Cantidad de Arroz (kg)');
  expect(await violacionesGraves(container)).toEqual([]);
});

it('un Operador sin acopio activo sabe por qué no ve el editor', async () => {
  responderSegun({ ...BASE, 'GET /api/ubicaciones/mias': [] });
  pantalla('OPERADOR');
  expect(await screen.findByText('Elige un acopio para armar la remisión')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Cantidad de/)).not.toBeInTheDocument();
});
