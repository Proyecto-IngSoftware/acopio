import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ErrorApi } from '../../api/cliente';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import { EXCEDENTE_KENNEDY, excedente } from './datos-prueba';
import { EditorLineas } from './EditorLineas';

function editor(props: Partial<Parameters<typeof EditorLineas>[0]> = {}) {
  const alGuardar = vi.fn();
  render(
    envolver(
      <EditorLineas
        acopioId="a-kennedy"
        propias={[]}
        error={null}
        alGuardar={alGuardar}
        etiqueta="Crear borrador"
        ocupado={false}
        {...props}
      />,
    ),
  );
  return alGuardar;
}

it('muestra lo que se puede mandar y deja fuera lo que no tiene movible', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  editor();
  expect(await screen.findByLabelText('Cantidad de Arroz (kg)')).toBeInTheDocument();
  expect(screen.getByText('Se pueden mandar 440 kg')).toBeInTheDocument();
  expect(screen.getByLabelText('Cantidad de Agua potable (L)')).toBeInTheDocument();
  expect(screen.getByText('Vence en 12 días')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Cantidad de Aceite/)).not.toBeInTheDocument();
});

it('sin cantidades el botón no se activa', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  editor();
  await screen.findByLabelText('Cantidad de Arroz (kg)');
  expect(screen.getByRole('button', { name: 'Crear borrador' })).toBeDisabled();
});

it('una cantidad por encima del tope se marca y no deja guardar', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  editor();
  await userEvent.type(await screen.findByLabelText('Cantidad de Arroz (kg)'), '500');
  expect(screen.getByText('Pasa de lo que se puede mandar')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Crear borrador' })).toBeDisabled();
});

it('guarda las líneas con cantidad', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  const alGuardar = editor();
  await userEvent.type(await screen.findByLabelText('Cantidad de Arroz (kg)'), '12');
  await userEvent.click(screen.getByRole('button', { name: 'Crear borrador' }));
  expect(alGuardar).toHaveBeenCalledWith([{ categoriaId: 'c-arroz', cantidad: 12 }]);
});

it('una línea propia sin movible sigue editable hasta su propia cantidad', async () => {
  responderSegun({
    'GET /api/acopios/*/excedentes': [excedente({ movible: 0, superavit: 40, comprometido: 40 })],
  });
  editor({
    propias: [
      {
        categoriaId: 'c-arroz',
        categoria: 'Arroz',
        unidad: 'KILOGRAMO',
        cantidadPlaneada: 40,
        cantidadRecibida: null,
      },
    ],
    etiqueta: 'Guardar líneas',
  });
  expect(await screen.findByLabelText('Cantidad de Arroz (kg)')).toHaveValue(40);
  expect(screen.getByText('Se pueden mandar 40 kg')).toBeInTheDocument();
});

it('con LINEA_EXCEDE_MOVIBLE ofrece usar el máximo de hoy', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  editor({
    error: new ErrorApi(422, 'LINEA_EXCEDE_MOVIBLE', 'Una línea pide 500', {
      categoriaId: 'c-arroz',
      maximo: 300,
    }),
  });
  const campo = await screen.findByLabelText('Cantidad de Arroz (kg)');
  expect(screen.getByText('Hoy se pueden mandar hasta 300 kg')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Usar 300' }));
  expect(campo).toHaveValue(300);
});

it('sin nada movible lo dice en lugar de mostrar un editor vacío', async () => {
  responderSegun({
    'GET /api/acopios/*/excedentes': [excedente({ movible: 0, superavit: 0 })],
  });
  editor();
  expect(await screen.findByText('Este acopio no tiene excedente para mandar')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Crear borrador' })).not.toBeInTheDocument();
});

it('el buscador filtra por nombre', async () => {
  responderSegun({ 'GET /api/acopios/*/excedentes': EXCEDENTE_KENNEDY });
  editor();
  await userEvent.type(await screen.findByLabelText('Buscar categoría'), 'agua');
  expect(screen.queryByLabelText('Cantidad de Arroz (kg)')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Cantidad de Agua potable (L)')).toBeInTheDocument();
});
