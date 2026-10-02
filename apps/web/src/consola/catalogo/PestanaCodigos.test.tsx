import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { Catalogo } from './Catalogo';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const horasAtras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const codigo = (datos: Record<string, unknown>) => ({
  ean: '7702001234567',
  categoriaId: 'c1',
  categoria: 'Arroz',
  unidad: 'KILOGRAMO',
  contenido: 0.5,
  descripcion: null,
  revisado: false,
  grupo: 'ALIMENTOS',
  perecedero: false,
  creadoPor: 'Daniela Méndez',
  creadoEn: horasAtras(2),
  ...datos,
});
const CODIGOS = [
  codigo({}),
  codigo({
    ean: '7702008765432',
    categoriaId: 'c4',
    categoria: 'Pañal adulto',
    unidad: 'UNIDAD',
    contenido: null,
  }),
  codigo({
    ean: '7702009841205',
    categoria: 'Atún',
    unidad: 'UNIDAD',
    contenido: null,
    revisado: true,
  }),
];
const BUSQUEDA = [
  {
    id: 'c5',
    nombre: 'Colchoneta',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'UNIDAD',
    perecedero: false,
    puntaje: 0.8,
  },
  {
    id: 'c3',
    nombre: 'Agua potable',
    grupo: 'AGUA_Y_BEBIDAS',
    unidadBase: 'LITRO',
    perecedero: false,
    puntaje: 0.9,
  },
];

const pantalla = (extra: Record<string, unknown> = {}) => {
  responderSegun({
    'GET /api/codigos-barras': CODIGOS,
    'PATCH /api/codigos-barras/*': codigo({ revisado: true }),
    'GET /api/categorias/buscar': BUSQUEDA,
    ...extra,
  });
  return render(envolver(<Catalogo />, '/consola/catalogo?pestana=codigos', clienteFalso(ADMIN)));
};
const tarjeta = (ean: string) => screen.findByRole('article', { name: ean });

describe('C18 Códigos de barras', () => {
  it('es la cuarta pestaña y empieza por los códigos sin revisar', async () => {
    pantalla();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /Códigos de barras/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('radio', { name: 'Sin revisar (2)' })).toBeChecked();
    const arroz = await tarjeta('7702001234567');
    expect(arroz).toHaveTextContent('Arroz · kg');
    expect(arroz).toHaveTextContent('Cada presentación trae 0,5 kg');
    expect(arroz).toHaveTextContent('Asociado por Daniela Méndez · hace 2 h');
    expect(arroz).toHaveTextContent('Sin revisar');
    expect(await tarjeta('7702008765432')).toHaveTextContent('Sin contenido');
    expect(screen.queryByRole('article', { name: '7702009841205' })).not.toBeInTheDocument();
  });

  it('«Todos» muestra también los revisados, que solo ofrecen «Cambiar»', async () => {
    pantalla();
    await userEvent.click(await screen.findByRole('radio', { name: 'Todos' }));
    const atun = await tarjeta('7702009841205');
    expect(atun).toHaveTextContent('Revisado');
    expect(within(atun).queryByRole('button', { name: 'Marcar revisado' })).not.toBeInTheDocument();
    expect(within(atun).getByRole('button', { name: 'Cambiar' })).toBeInTheDocument();
  });

  it('«Marcar revisado» lo guarda y vuelve a pedir la lista', async () => {
    pantalla();
    const arroz = await tarjeta('7702001234567');
    await userEvent.click(within(arroz).getByRole('button', { name: 'Marcar revisado' }));
    expect(await cuerpoDe('PATCH /api/codigos-barras/7702001234567')).toEqual({ revisado: true });
    await waitFor(() =>
      expect(peticiones().filter((p) => p === 'GET /api/codigos-barras')).toHaveLength(2),
    );
  });

  it('«Cambiar» deja elegir otra categoría y quitar el contenido', async () => {
    pantalla();
    const arroz = await tarjeta('7702001234567');
    await userEvent.click(within(arroz).getByRole('button', { name: 'Cambiar' }));
    const hoja = screen.getByRole('dialog', { name: 'Código 7702001234567' });
    expect(within(hoja).getByLabelText(/Cada presentación trae/)).toHaveValue('0,5');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Otra categoría' }));
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'agua');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Agua potable/ }));
    await userEvent.clear(within(hoja).getByLabelText(/Cada presentación trae/));
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(await cuerpoDe('PATCH /api/codigos-barras/7702001234567')).toEqual({
      categoriaId: 'c3',
      contenido: null,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('pasar a una categoría por unidades con un contenido con decimales no deja guardar', async () => {
    pantalla();
    const arroz = await tarjeta('7702001234567');
    await userEvent.click(within(arroz).getByRole('button', { name: 'Cambiar' }));
    const hoja = screen.getByRole('dialog', { name: 'Código 7702001234567' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Otra categoría' }));
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'colch');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Colchoneta/ }));
    expect(within(hoja).getByRole('alert')).toHaveTextContent(
      'En unidades, el contenido va sin decimales.',
    );
    expect(within(hoja).getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('un contenido mal escrito no borra el que había', async () => {
    pantalla();
    const arroz = await tarjeta('7702001234567');
    await userEvent.click(within(arroz).getByRole('button', { name: 'Cambiar' }));
    const hoja = screen.getByRole('dialog', { name: 'Código 7702001234567' });
    const campo = within(hoja).getByLabelText(/Cada presentación trae/);
    await userEvent.clear(campo);
    await userEvent.type(campo, '1,2,3');
    expect(campo).toHaveValue('1,23');
    await userEvent.clear(campo);
    await userEvent.type(campo, '0');
    expect(within(hoja).getByRole('alert')).toHaveTextContent(
      'El contenido tiene que ser mayor que cero.',
    );
    expect(within(hoja).getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('sin códigos por revisar lo dice', async () => {
    pantalla({ 'GET /api/codigos-barras': [CODIGOS[2]] });
    expect(await screen.findByText('No hay códigos por revisar.')).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = pantalla();
    await tarjeta('7702001234567');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
