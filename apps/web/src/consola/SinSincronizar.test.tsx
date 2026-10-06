import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Categoria } from '../api/catalogo';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { abrir } from '../sin-conexion/base-local';
import { encolar, listarCola } from '../sin-conexion/cola';
import { guardarCategorias } from '../sin-conexion/datos-locales';
import { SinSincronizar } from './SinSincronizar';

const OPERADORA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const categoria = (id: string, nombre: string, unidadBase: Categoria['unidadBase']): Categoria => ({
  id,
  nombre,
  grupo: 'ALIMENTOS',
  unidadBase,
  perecedero: false,
  sinonimos: [],
  archivada: false,
});
const sinRed = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
const pantalla = () =>
  render(envolver(<SinSincronizar />, '/consola/sin-sincronizar', clienteFalso(OPERADORA)));

async function rechazar(id: string, codigo: string, motivo: string) {
  const base = await abrir();
  const fila = (await base.get('cola', id))!;
  await base.put('cola', { ...fila, estado: 'rechazada', codigo, motivo });
}

beforeEach(async () => {
  await guardarCategorias([
    categoria('c-arroz', 'Arroz', 'KILOGRAMO'),
    categoria('c-agua', 'Agua potable', 'LITRO'),
    categoria('c-aceite', 'Aceite', 'LITRO'),
  ]);
});

describe('Sin sincronizar', () => {
  it('lista lo que espera, en orden, con cantidad y hora', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c-arroz', cantidad: 12 });
    await encolar('u1', 'x1', { id: 'e2', categoriaId: 'c-agua', cantidad: 24 });
    pantalla();

    const lista = await screen.findByRole('list', { name: 'Por enviar (2)' });
    const filas = within(lista).getAllByRole('listitem');
    expect(filas[0]).toHaveTextContent(/Arroz · 12 kg.*\d{1,2}:\d{2}/);
    expect(filas[1]).toHaveTextContent('Agua potable · 24 L');
  });

  it('sin red avisa y no deja «Enviar ahora»', async () => {
    sinRed();
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c-arroz', cantidad: 12 });
    pantalla();

    expect(
      await screen.findByText('Sin conexión. Se envían solas al volver la señal.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar ahora' })).toBeDisabled();
  });

  it('con red, «Enviar ahora» pide el envío', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c-arroz', cantidad: 12 });
    const pedido = vi.fn();
    window.addEventListener('acopio:enviar-cola', pedido);
    pantalla();

    await userEvent.click(await screen.findByRole('button', { name: 'Enviar ahora' }));

    expect(pedido).toHaveBeenCalled();
    window.removeEventListener('acopio:enviar-cola', pedido);
  });

  it('una rechazada muestra su motivo y se puede descartar', async () => {
    await encolar('u1', 'x1', { id: 'e3', categoriaId: 'c-aceite', cantidad: 5 });
    await rechazar('e3', 'NO_AUTORIZADO', 'No tienes ese acopio');
    pantalla();

    const tarjeta = await screen.findByRole('article', { name: 'Aceite · 5 L' });
    expect(tarjeta).toHaveTextContent('No tienes ese acopio');
    // Sin la asignación no hay nada que corregir
    expect(within(tarjeta).queryByRole('button', { name: 'Corregir' })).not.toBeInTheDocument();

    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Descartar' }));

    await waitFor(async () => expect(await listarCola('u1')).toEqual([]));
    expect(await screen.findByText('No hay entradas sin enviar.')).toBeInTheDocument();
  });

  it('una rechazada por la fecha se corrige y vuelve a la cola', async () => {
    await encolar(
      'u1',
      'x1',
      { id: 'e3', categoriaId: 'c-aceite', cantidad: 5 },
      new Date('2026-09-26T14:10:00Z'),
    );
    await rechazar('e3', 'FECHA_FUERA_DE_RANGO', 'La fecha es de hace más de 7 días');
    pantalla();

    const tarjeta = await screen.findByRole('article', { name: 'Aceite · 5 L' });
    await userEvent.click(within(tarjeta).getByRole('button', { name: 'Corregir' }));
    const hoja = await screen.findByRole('dialog', { name: 'Corregir la fecha' });
    const campo = within(hoja).getByLabelText('Cuándo llegó');
    await userEvent.clear(campo);
    await userEvent.type(campo, '2026-10-03T09:10');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar y volver a enviar' }));

    await waitFor(async () => expect((await listarCola('u1'))[0]?.estado).toBe('pendiente'));
    const [fila] = await listarCola('u1');
    expect(new Date(fila!.cuerpo.ocurridoEn).getTime()).toBe(
      new Date('2026-10-03T09:10').getTime(),
    );
    expect(await screen.findByRole('list', { name: 'Por enviar (1)' })).toBeInTheDocument();
  });

  it('sin nada en la cola lo dice', async () => {
    pantalla();
    expect(await screen.findByText('No hay entradas sin enviar.')).toBeInTheDocument();
  });
});
