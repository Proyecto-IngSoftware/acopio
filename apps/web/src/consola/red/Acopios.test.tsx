import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HORARIO_VACIO } from '@acopio/shared';
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
import { Acopios } from './Acopios';
import { FormularioAcopio } from './FormularioAcopio';

vi.mock('../../componentes/mapa/MapaLeaflet', () => ({ default: () => <div>mapa</div> }));

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const LUNES = { ...HORARIO_VACIO, lun: [{ abre: '08:00', cierra: '12:00' }] };
const ACOPIOS = [
  acopioDePrueba({ id: 'x1', nombre: 'Acopio Chapinero', horario: LUNES }),
  acopioDePrueba({
    id: 'x2',
    nombre: 'Acopio Chinchiná',
    municipio: 'Chinchiná',
    estado: 'PAUSADO',
    abiertoAhora: false,
  }),
  acopioDePrueba({
    id: 'x3',
    nombre: 'Acopio Simón Bolívar',
    estado: 'CERRADO',
    abiertoAhora: false,
  }),
].map((a) => ({ ...a, creadoEn: '2026-09-30T10:00:00.000Z' }));
const ENTIDADES = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    nombre: 'Fundación Manos Unidas',
    tipo: 'Fundación',
    nit: [],
    sitioWeb: [],
    telefono: [],
    correo: [],
    descripcion: [],
    verificacion: 'SIN_VERIFICAR',
  },
];
const RESPUESTAS = {
  'GET /api/acopios/gestion': ACOPIOS,
  'GET /api/entidades': ENTIDADES,
  'POST /api/acopios': ACOPIOS[0],
  'PATCH /api/acopios/*': ACOPIOS[0],
  'GET /api/geocodificar': [{ etiqueta: 'Carrera 13 # 60-20, Bogotá', lat: 4.6486, lng: -74.0628 }],
  'GET /api/acopios/*/no-recibir': [],
};

function app(ruta: string) {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios" element={<Acopios />} />
        <Route path="/consola/acopios/nuevo" element={<FormularioAcopio />} />
        <Route path="/consola/acopios/:id" element={<FormularioAcopio />} />
        <Route path="/consola/entidades" element={<p>entidades</p>} />
        <Route path="/consola/acopios/:id/no-recibir" element={<p>no recibir</p>} />
      </Routes>,
      ruta,
      clienteFalso(ADMIN),
    ),
  );
}

describe('C21 lista', () => {
  beforeEach(() => {
    // Lunes 5 de octubre, 11:00 en Bogotá
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T16:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('muestra cada acopio con entidad, municipio, estado y si está abierto', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios');
    const chapinero = await screen.findByRole('link', { name: /Acopio Chapinero/ });
    expect(chapinero).toHaveTextContent('Fundación Manos Unidas');
    expect(chapinero).toHaveTextContent('Bogotá');
    expect(chapinero).toHaveTextContent('Activo');
    expect(chapinero).toHaveTextContent('Abierto ahora · Cierra 12:00');
    expect(screen.getByRole('link', { name: /Acopio Chinchiná/ })).toHaveTextContent('Pausado');
    expect(screen.getByRole('link', { name: /Simón Bolívar/ })).toHaveTextContent('Cerrado');
    expect(screen.getByText('Mostrando 3 de 3')).toBeInTheDocument();
  });

  it('las píldoras filtran por estado y el buscador por nombre o municipio', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios');
    await screen.findByRole('link', { name: /Acopio Chapinero/ });
    await userEvent.click(screen.getByRole('button', { name: /Pausados/ }));
    expect(screen.getAllByRole('link', { name: /Acopio / })).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /Todos/ }));
    await userEvent.type(screen.getByRole('searchbox'), 'chinchi');
    expect(screen.getByText('Mostrando 1 de 3')).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderSegun(RESPUESTAS);
    const { container } = app('/consola/acopios');
    await screen.findByRole('link', { name: /Acopio Chapinero/ });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('C21 formulario', () => {
  it('crea un acopio: busca la dirección, ubica el pin y guarda', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/nuevo');
    await userEvent.selectOptions(
      await screen.findByLabelText('Entidad responsable'),
      'Fundación Manos Unidas',
    );
    await userEvent.type(screen.getByLabelText('Nombre del acopio'), 'Acopio Chapinero');
    await userEvent.type(screen.getByLabelText('Dirección'), 'Carrera 13 # 60-20');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar en el mapa' }));
    await userEvent.click(
      await screen.findByRole('button', { name: /Carrera 13 # 60-20, Bogotá/ }),
    );
    await userEvent.type(screen.getByLabelText('Municipio'), 'Bogotá');
    await userEvent.click(screen.getByRole('button', { name: 'Crear acopio' }));
    expect(await cuerpoDe('POST /api/acopios')).toMatchObject({
      entidadId: '44444444-4444-4444-8444-444444444444',
      nombre: 'Acopio Chapinero',
      direccion: 'Carrera 13 # 60-20',
      municipio: 'Bogotá',
      lat: 4.6486,
      lng: -74.0628,
      telefono: null,
      estado: 'ACTIVO',
    });
    expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
  });

  it('sin pin no guarda y dice qué falta', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/nuevo');
    await userEvent.selectOptions(
      await screen.findByLabelText('Entidad responsable'),
      'Fundación Manos Unidas',
    );
    await userEvent.type(screen.getByLabelText('Nombre del acopio'), 'Acopio Sin Pin');
    await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 1');
    await userEvent.type(screen.getByLabelText('Municipio'), 'Bogotá');
    await userEvent.click(screen.getByRole('button', { name: 'Crear acopio' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ubica el acopio en el mapa');
    expect(peticiones()).not.toContain('POST /api/acopios');
  });

  it('sin entidades ofrece crear una', async () => {
    responderSegun({ ...RESPUESTAS, 'GET /api/entidades': [] });
    app('/consola/acopios/nuevo');
    await userEvent.click(await screen.findByRole('link', { name: 'Crear entidad' }));
    expect(screen.getByText('entidades')).toBeInTheDocument();
  });

  it('al editar carga el acopio, lleva a su «No recibir» y lo cierra con confirmación', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x1');
    expect(await screen.findByLabelText('Nombre del acopio')).toHaveValue('Acopio Chapinero');
    expect(screen.getByRole('link', { name: /Umbrales y no recibir/ })).toHaveAttribute(
      'href',
      '/consola/acopios/x1/no-recibir',
    );
    expect(screen.getByRole('link', { name: /Inventario/ })).toHaveAttribute(
      'href',
      '/consola/acopios/x1/inventario',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar acopio' }));
    const hoja = screen.getByRole('dialog', { name: '¿Cerrar Acopio Chapinero?' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Sí, cerrar' }));
    expect(await cuerpoDe('PATCH /api/acopios/x1')).toEqual({ estado: 'CERRADO' });
  });

  it('un acopio cerrado se puede reabrir', async () => {
    responderSegun(RESPUESTAS);
    app('/consola/acopios/x3');
    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir acopio' }));
    expect(await cuerpoDe('PATCH /api/acopios/x3')).toEqual({ estado: 'ACTIVO' });
  });

  it('el formulario no tiene violaciones graves de accesibilidad', async () => {
    responderSegun(RESPUESTAS);
    const { container } = app('/consola/acopios/x1');
    await screen.findByLabelText('Nombre del acopio');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
