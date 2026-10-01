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
  sitioWeb: [],
  telefono: [],
  correo: [],
  descripcion: [],
  verificacion: 'SIN_VERIFICAR',
  ...datos,
});
const RESPUESTAS = {
  'GET /api/entidades': [
    entidad({}),
    entidad({ id: 'e2', nombre: 'Parroquia San José', tipo: 'Iglesia', nit: [] }),
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
