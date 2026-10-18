import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Entidades } from './Entidades';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const entidad = (datos: Record<string, unknown>) => ({
  id: 'e1',
  nombre: 'Fundación Manos Unidas',
  tipo: 'Fundación',
  nit: '900123456-7',
  sitioWeb: null,
  telefono: null,
  correo: null,
  descripcion: null,
  verificacion: 'SIN_VERIFICAR',
  verificadaEn: null,
  tieneLogo: false,
  causasActivas: 0,
  ...datos,
});
const RESPUESTAS = {
  'GET /api/entidades': [
    entidad({}),
    entidad({ id: 'e2', nombre: 'Parroquia San José', tipo: 'Iglesia', nit: null }),
  ],
  'GET /api/acopios/gestion': [
    acopioDePrueba({ id: 'x1', entidad: { id: 'e1', nombre: 'Fundación Manos Unidas' } }),
    acopioDePrueba({ id: 'x2', entidad: { id: 'e1', nombre: 'Fundación Manos Unidas' } }),
  ],
  'POST /api/entidades': entidad({ id: 'e3', nombre: 'Cruz Roja' }),
  'PATCH /api/entidades/*': entidad({}),
};
const pantalla = () => render(envolver(<Entidades />, '/consola/entidades', clienteFalso(ADMIN)));

it('lista las entidades con tipo, NIT, cuántos acopios tienen y «Sin verificar»', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  const manos = await screen.findByRole('button', { name: /Fundación Manos Unidas/ });
  expect(manos).toHaveTextContent('Fundación');
  expect(manos).toHaveTextContent('NIT 900123456-7');
  expect(manos).toHaveTextContent('2 acopios');
  expect(manos).toHaveTextContent('Sin verificar');
  expect(screen.getByRole('button', { name: /Parroquia San José/ })).toHaveTextContent(
    'Sin acopios',
  );
});

it('el buscador filtra por nombre', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('button', { name: /Parroquia/ });
  await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar entidad' }), 'parro');
  expect(screen.queryByRole('button', { name: /Manos Unidas/ })).not.toBeInTheDocument();
});

it('crea una entidad desde la hoja', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Nueva entidad' }));
  const hoja = screen.getByRole('dialog', { name: 'Nueva entidad' });
  await userEvent.type(within(hoja).getByLabelText('Nombre'), 'Cruz Roja');
  await userEvent.type(within(hoja).getByLabelText('Tipo'), 'ONG');
  await userEvent.type(within(hoja).getByLabelText('Correo'), 'bogota@cruzroja.org.co');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
  expect(await cuerpoDe('POST /api/entidades')).toEqual({
    nombre: 'Cruz Roja',
    tipo: 'ONG',
    nit: null,
    sitioWeb: null,
    telefono: null,
    correo: 'bogota@cruzroja.org.co',
    descripcion: null,
  });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('edita una entidad y manda solo lo que cambió', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Fundación Manos Unidas/ }));
  await userEvent.click(
    within(screen.getByRole('dialog', { name: 'Fundación Manos Unidas' })).getByRole('button', {
      name: 'Editar datos',
    }),
  );
  const hoja = screen.getByRole('dialog', { name: 'Editar Fundación Manos Unidas' });
  await userEvent.type(within(hoja).getByLabelText('Teléfono'), '3001234567');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
  expect(await cuerpoDe('PATCH /api/entidades/e1')).toEqual({ telefono: '3001234567' });
  expect(peticiones()).toContain('PATCH /api/entidades/e1');
});

it('no tiene violaciones graves de accesibilidad, tampoco con la hoja abierta', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Fundación Manos Unidas/ }));
  expect(await violacionesGraves(container.ownerDocument.body)).toEqual([]);
});

const CRUZ = entidad({
  id: 'e4',
  nombre: 'Cruz Roja Colombiana',
  tipo: 'ONG',
  nit: null,
  sitioWeb: 'https://www.cruzrojacolombiana.org',
  verificacion: 'VERIFICADA',
  verificadaEn: '2026-10-17T15:00:00.000Z',
  causasActivas: 2,
});
const UNICEF = entidad({
  id: 'e5',
  nombre: 'UNICEF Colombia',
  tipo: 'ONG',
  nit: null,
  sitioWeb: 'https://www.unicef.org/colombia',
});
const CON_VERIFICACION = {
  ...RESPUESTAS,
  'GET /api/entidades': [entidad({}), CRUZ, UNICEF],
  'POST /api/entidades/*/verificar': { ...UNICEF, verificacion: 'VERIFICADA' },
  'POST /api/entidades/*/quitar-verificacion': { archivadas: 2 },
};
const abrir = async (nombre: string) => {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(nombre) }));
  return screen.getByRole('dialog', { name: nombre });
};

describe('verificación (pieza C, HU-15)', () => {
  it('una verificada muestra su sello con fecha y sus causas activas', async () => {
    responderSegun(CON_VERIFICACION);
    pantalla();
    const fila = await screen.findByRole('button', { name: /Cruz Roja Colombiana/ });
    expect(fila).toHaveTextContent('Verificada el 17 de octubre de 2026');
    expect(fila).toHaveTextContent('2 causas activas');
  });

  it('verificar pide marcar la casilla del aviso antes de enviar', async () => {
    responderSegun(CON_VERIFICACION);
    pantalla();
    const hoja = await abrir('UNICEF Colombia');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Verificar entidad' }));
    const aviso = screen.getByRole('dialog', { name: 'Verificar UNICEF Colombia' });
    expect(aviso).toHaveTextContent(
      'Acopio va a dirigir a los donantes hacia esta entidad. Si no es quien dice ser, los estaremos mandando a una estafa.',
    );
    const boton = within(aviso).getByRole('button', { name: 'Verificar entidad' });
    expect(boton).toBeDisabled();
    await userEvent.click(
      within(aviso).getByRole('checkbox', {
        name: 'Confirmo que revisé la entidad y su sitio oficial.',
      }),
    );
    expect(boton).toBeEnabled();
    await userEvent.click(boton);
    expect(await cuerpoDe('POST /api/entidades/e5/verificar')).toEqual({ confirmo: true });
  });

  it('sin sitio web no ofrece verificar', async () => {
    responderSegun(CON_VERIFICACION);
    pantalla();
    const hoja = await abrir('Fundación Manos Unidas');
    expect(
      within(hoja).queryByRole('button', { name: 'Verificar entidad' }),
    ).not.toBeInTheDocument();
    expect(hoja).toHaveTextContent('Agrega el sitio web para poder verificarla');
  });

  it('quitar la verificación dice cuántas causas pasan a atendidas', async () => {
    responderSegun(CON_VERIFICACION);
    pantalla();
    const hoja = await abrir('Cruz Roja Colombiana');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Quitar verificación' }));
    const confirmar = screen.getByRole('dialog', { name: '¿Quitar la verificación?' });
    expect(confirmar).toHaveTextContent('Sus 2 causas activas pasan a atendidas');
    await userEvent.click(within(confirmar).getByRole('button', { name: 'Quitar verificación' }));
    expect(peticiones()).toContain('POST /api/entidades/e4/quitar-verificacion');
  });
});
