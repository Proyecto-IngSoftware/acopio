import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Pesos } from './Pesos';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const PESOS = { criticidad: 0.4, urgencia: 0.2, proximidad: 0.15, magnitud: 0.25 };
const fila = (acopio: string, zona: string, categoria: string, puntaje: number) => ({
  acopio,
  zona,
  categoria,
  cantidad: 100,
  puntaje,
});
const RESPUESTAS = {
  'GET /api/motor/configuracion': { pesos: PESOS, cantidadMinima: 20 },
  'PUT /api/motor/configuracion': { pesos: PESOS, cantidadMinima: 20 },
  'POST /api/motor/configuracion/vista-previa': {
    actual: [
      fila('Suba', 'El Pepino', 'Arroz', 0.6),
      fila('Kennedy', 'San Agustín', 'Arroz', 0.48),
      fila('Suba', 'El Pepino', 'Agua', 0.46),
    ],
    propuesta: [
      fila('Suba', 'El Pepino', 'Arroz', 0.62),
      fila('Suba', 'El Pepino', 'Agua', 0.55),
      fila('Kennedy', 'San Agustín', 'Arroz', 0.47),
    ],
  },
};
const VISTA = 'POST /api/motor/configuracion/vista-previa';

const pantalla = () => render(envolver(<Pesos />, '/consola/motor/pesos', clienteFalso(ADMIN)));
const deslizador = (nombre: string) => screen.getByRole('slider', { name: nombre });
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

it('los deslizadores arrancan en los pesos guardados', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await waitFor(() => expect(deslizador('Criticidad')).toHaveValue('0.4'));
  expect(deslizador('Magnitud')).toHaveValue('0.25');
  expect(screen.getByLabelText('Cantidad mínima por traslado')).toHaveValue('20');
});

it('si los pesos no suman 1 lo dice, no deja guardar y no pide vista previa', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await waitFor(() => expect(deslizador('Magnitud')).toHaveValue('0.25'));
  fireEvent.change(deslizador('Magnitud'), { target: { value: '0.3' } });
  expect(screen.getByText('Suman 1,05; tienen que sumar 1')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar pesos' })).toBeDisabled();
  await espera(600);
  expect(peticiones()).not.toContain(VISTA);
});

it('con pesos válidos pide una sola vista previa tras el último cambio y marca lo que sube', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await waitFor(() => expect(deslizador('Magnitud')).toHaveValue('0.25'));
  fireEvent.change(deslizador('Criticidad'), { target: { value: '0.35' } });
  fireEvent.change(deslizador('Magnitud'), { target: { value: '0.3' } });
  const lista = await screen.findByRole('list', { name: 'Con los pesos nuevos' });
  expect(peticiones().filter((p) => p === VISTA)).toHaveLength(1);
  expect(await cuerpoDe(VISTA)).toEqual({
    pesos: { criticidad: 0.35, urgencia: 0.2, proximidad: 0.15, magnitud: 0.3 },
    cantidadMinima: 20,
  });
  const filas = within(lista).getAllByRole('listitem');
  expect(filas[1]).toHaveTextContent('Suba → El Pepino · Agua');
  expect(filas[1]).toHaveTextContent('↑');
  expect(filas[0]).not.toHaveTextContent('↑');
  expect(filas[2]).not.toHaveTextContent('↑');
});

it('guardar manda pesos y cantidad mínima y lo confirma', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await waitFor(() => expect(deslizador('Magnitud')).toHaveValue('0.25'));
  fireEvent.change(deslizador('Criticidad'), { target: { value: '0.35' } });
  fireEvent.change(deslizador('Magnitud'), { target: { value: '0.3' } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar pesos' }));
  expect(await cuerpoDe('PUT /api/motor/configuracion')).toEqual({
    pesos: { criticidad: 0.35, urgencia: 0.2, proximidad: 0.15, magnitud: 0.3 },
    cantidadMinima: 20,
  });
  expect(
    await screen.findByText('Pesos guardados. El próximo recálculo los usa'),
  ).toBeInTheDocument();
});

it('descartar cambios vuelve a los pesos guardados', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await waitFor(() => expect(deslizador('Magnitud')).toHaveValue('0.25'));
  fireEvent.change(deslizador('Magnitud'), { target: { value: '0.3' } });
  await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  expect(deslizador('Magnitud')).toHaveValue('0.25');
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  await waitFor(() => expect(deslizador('Magnitud')).toHaveValue('0.25'));
  expect(await violacionesGraves(container)).toEqual([]);
});
