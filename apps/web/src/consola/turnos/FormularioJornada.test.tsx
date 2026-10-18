import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { gestionDe } from '../../pruebas/datos-turnos';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  responderSegun,
} from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { FormularioJornada } from './FormularioJornada';

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'u1',
  username: 'p',
  nombre: 'Daniela Méndez',
  rol,
});

const MIAS = [
  { tipo: 'ACOPIO', id: 'x1', nombre: 'Acopio Chapinero', municipio: 'Bogotá', estado: 'ACTIVO' },
  { tipo: 'ZONA', id: 'z1', nombre: 'Barrio San Agustín', municipio: 'Mocoa', estado: 'ACTIVA' },
];
const entidad = (id: string, nombre: string, verificacion: string) => ({
  id,
  nombre,
  tipo: 'ONG',
  nit: null,
  sitioWeb: null,
  telefono: null,
  correo: null,
  descripcion: null,
  verificacion,
  verificadaEn: verificacion === 'VERIFICADA' ? '2026-10-17T15:00:00.000Z' : null,
  tieneLogo: false,
  causasActivas: 0,
});

const pantalla = (rol: UsuarioSesion['rol'], alTerminar = vi.fn()) => {
  const r = render(
    envolver(
      <FormularioJornada jornada={null} hoy="2026-10-17" alTerminar={alTerminar} />,
      '/consola/turnos',
      clienteFalso(persona(rol)),
    ),
  );
  return { ...r, alTerminar };
};

async function llenar() {
  await userEvent.type(screen.getByLabelText('Título'), 'Armar mercados');
  await userEvent.type(
    screen.getByLabelText('Labor'),
    'Empacar arroz y granos para 200 familias de Mocoa.',
  );
  await userEvent.click(screen.getByRole('button', { name: '22 de octubre' }));
  await userEvent.click(screen.getByRole('button', { name: '20 de octubre' }));
  await userEvent.click(screen.getByRole('button', { name: '21 de octubre' }));
  await userEvent.type(screen.getByLabelText('Empieza'), '14:00');
  await userEvent.type(screen.getByLabelText('Termina'), '18:00');
  await userEvent.clear(screen.getByLabelText('Cupos por jornada'));
  await userEvent.type(screen.getByLabelText('Cupos por jornada'), '20');
}

it('el Operador crea varias fechas en su acopio, ordenadas, y vuelve a la lista', async () => {
  responderSegun({
    'GET /api/ubicaciones/mias': MIAS,
    'POST /api/turnos/gestion/jornadas': [
      gestionDe(),
      gestionDe({ id: 'j2' }),
      gestionDe({ id: 'j3' }),
    ],
  });
  const { container, alTerminar } = pantalla('OPERADOR');
  expect(await screen.findByRole('option', { name: 'Acopio Chapinero' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Barrio San Agustín' })).not.toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Una entidad' })).not.toBeInTheDocument();
  expect(screen.getByText(/Las reservas se cierran 12 horas antes del inicio/)).toBeInTheDocument();
  await llenar();
  await userEvent.click(screen.getByRole('button', { name: 'Crear 3 jornadas' }));
  await waitFor(() => expect(alTerminar).toHaveBeenCalled());
  expect(await cuerpoDe('POST /api/turnos/gestion/jornadas')).toEqual({
    acopioId: 'x1',
    titulo: 'Armar mercados',
    descripcion: 'Empacar arroz y granos para 200 familias de Mocoa.',
    queLlevar: null,
    cupoMaximo: 20,
    requisitos: { ropaCerrada: false, carga: false },
    perfilRequerido: null,
    fechas: ['2026-10-20', '2026-10-21', '2026-10-22'],
    horaInicio: '14:00',
    horaFin: '18:00',
  });
  expect(await violacionesGraves(container)).toEqual([]);
});

it('el Administrador puede crear una jornada de una entidad verificada en una dirección propia', async () => {
  responderSegun({
    'GET /api/acopios/gestion': [acopioDePrueba()],
    'GET /api/entidades': [
      entidad('e1', 'Cruz Roja Colombiana', 'VERIFICADA'),
      entidad('e2', 'Fundación sin verificar', 'SIN_VERIFICAR'),
    ],
    'POST /api/turnos/gestion/jornadas': [gestionDe()],
  });
  pantalla('ADMIN');
  await userEvent.click(await screen.findByRole('radio', { name: 'Una entidad' }));
  const selector = screen.getByLabelText('Entidad');
  expect(
    within(selector).getByRole('option', { name: 'Cruz Roja Colombiana' }),
  ).toBeInTheDocument();
  expect(
    within(selector).queryByRole('option', { name: 'Fundación sin verificar' }),
  ).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Dirección'), 'Calle 68 # 66-31');
  await userEvent.type(screen.getByLabelText('Municipio'), 'Bogotá');
  await llenar();
  await userEvent.selectOptions(
    screen.getByLabelText('Perfil que pide (opcional)'),
    'CONDUCTOR_C2',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Crear 3 jornadas' }));
  await waitFor(async () =>
    expect(await cuerpoDe('POST /api/turnos/gestion/jornadas')).toMatchObject({
      entidadId: 'e1',
      direccion: 'Calle 68 # 66-31',
      municipio: 'Bogotá',
      perfilRequerido: 'CONDUCTOR_C2',
    }),
  );
  expect(await cuerpoDe('POST /api/turnos/gestion/jornadas')).not.toHaveProperty('acopioId');
});

it('un 422 de la API se muestra junto al horario', async () => {
  responderSegun({
    'GET /api/ubicaciones/mias': MIAS,
    'POST /api/turnos/gestion/jornadas': conEstado(422, {
      estado: 422,
      codigo: 'JORNADA_INVALIDA',
      mensaje: 'Una jornada dura entre 1 y 12 horas.',
    }),
  });
  const { alTerminar } = pantalla('OPERADOR');
  await screen.findByRole('option', { name: 'Acopio Chapinero' });
  await llenar();
  await userEvent.click(screen.getByRole('button', { name: 'Crear 3 jornadas' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Una jornada dura entre 1 y 12 horas.',
  );
  expect(alTerminar).not.toHaveBeenCalled();
});

it('al editar una jornada de entidad, el Operador no ve el lugar y el Administrador sí', async () => {
  const deEntidad = gestionDe({
    lugar: {
      tipo: 'ENTIDAD',
      id: 'e1',
      nombre: 'Cruz Roja Colombiana',
      direccion: 'Calle 68 # 66-31',
      municipio: 'Bogotá',
      lat: null,
      lng: null,
    },
  });
  responderSegun({
    'GET /api/ubicaciones/mias': MIAS,
    'GET /api/acopios/gestion': [],
    'GET /api/entidades': [],
  });
  const editar = (rol: UsuarioSesion['rol']) =>
    render(
      envolver(
        <FormularioJornada jornada={deEntidad} hoy="2026-10-17" alTerminar={vi.fn()} />,
        '/consola/turnos',
        clienteFalso(persona(rol)),
      ),
    );
  const { unmount } = editar('OPERADOR');
  expect(await screen.findByRole('heading', { name: 'Editar jornada' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Dirección')).not.toBeInTheDocument();
  unmount();
  editar('ADMIN');
  expect(await screen.findByLabelText('Dirección')).toHaveValue('Calle 68 # 66-31');
});
