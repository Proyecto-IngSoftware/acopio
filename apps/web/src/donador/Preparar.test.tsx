import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../pruebas/utilidades';
import { Preparar } from './Preparar';

type Abrir = (video: unknown, alLeer: (codigo: string) => void) => Promise<() => void>;
const camara = vi.hoisted(() => ({ abrir: (async () => () => {}) as Abrir }));
vi.mock('../consola/inventario/camara', () => ({
  abrirCamara: (...a: Parameters<Abrir>) => camara.abrir(...a),
}));

const DONADOR = { id: 'd', username: 'ana', nombre: 'Ana', rol: 'DONADOR' as const };
const EAN = '7702001045231';
const AGUA = {
  ean: EAN,
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  grupo: 'AGUA_Y_BEBIDAS',
  perecedero: false,
  estado: 'VALIDADO',
  presentacion: null,
  contenido: 0.6,
};
const NUEVO = '7702001234567';
const AGUA_CAT = {
  id: 'c1',
  nombre: 'Agua potable',
  grupo: 'AGUA_Y_BEBIDAS',
  unidadBase: 'LITRO',
  perecedero: false,
  puntaje: 0.9,
};
const BOTELLA = {
  id: 'p1',
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  nombre: 'Botella de agua 600 ml',
  clase: 'SUELTA',
  tamano: 0.6,
  contieneId: null,
  unidades: null,
  estado: 'VALIDADO',
  codigos: 1,
};
const desconocido = conEstado(404, {
  estado: 404,
  codigo: 'EAN_DESCONOCIDO',
  mensaje: 'Código desconocido',
});
const ARROZ = {
  id: 'c2',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: true,
  puntaje: 0.9,
};
const JUGO = {
  id: 'c4',
  nombre: 'Jugo',
  grupo: 'AGUA_Y_BEBIDAS',
  unidadBase: 'LITRO',
  perecedero: false,
  puntaje: 0.5,
};
const PANAL = {
  id: 'c3',
  nombre: 'Pañal adulto',
  grupo: 'ADULTO_MAYOR',
  unidadBase: 'UNIDAD',
  perecedero: false,
  puntaje: 0.8,
};
const preparada = (n: number) => ({
  id: `d${n}`,
  folio: `ACO-2026-0000${n}`,
  estado: 'PREPARADO',
  acopio: { id: 'a1', nombre: 'Parroquia San José' },
  creadoEn: new Date().toISOString(),
  lineas: [],
});

const leera = (codigo: string) => {
  camara.abrir = async (_video, alLeer) => {
    setTimeout(() => alLeer(codigo), 0);
    return () => {};
  };
};

const pantalla = (respuestas: Record<string, unknown> = {}) => {
  responderSegun({
    'GET /api/donaciones': [],
    'GET /api/categorias/buscar': [ARROZ],
    ...respuestas,
  });
  return render(envolver(<Preparar />, '/donar', clienteFalso(DONADOR)));
};

const escanear = async () =>
  userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
const siguiente = () => screen.getByRole('button', { name: 'Siguiente: dónde entregar' });

beforeEach(() => {
  camara.abrir = async () => () => {};
});

describe('P9, paso 1: qué llevas', () => {
  it('pide las preparadas y, con 5, avisa y no deja avanzar', async () => {
    pantalla({ 'GET /api/donaciones': [1, 2, 3, 4, 5].map(preparada) });
    expect(
      await screen.findByText(
        'Ya tienes 5 donaciones preparadas. Entrega o cancela una para preparar otra',
      ),
    ).toBeInTheDocument();
    expect(peticiones()).toContain('GET /api/donaciones?estado=PREPARADO');
    expect(screen.getByRole('link', { name: /Mis donaciones/ })).toHaveAttribute(
      'href',
      '/donador',
    );
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Siguiente: dónde entregar' }),
    ).not.toBeInTheDocument();
  });

  it('con 4 preparadas deja armar la donación', async () => {
    pantalla({ 'GET /api/donaciones': [1, 2, 3, 4].map(preparada) });
    expect(await screen.findByRole('searchbox', { name: 'Categoría' })).toBeInTheDocument();
  });

  it('busca por nombre, agrega la línea con cantidad 1 y activa «Siguiente»', async () => {
    pantalla();
    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(siguiente()).toBeDisabled();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    const linea = screen.getByRole('listitem', { name: 'Arroz' });
    expect(within(linea).getByRole('textbox', { name: 'Cantidad de Arroz' })).toHaveValue('1');
    expect(within(linea).getByRole('radio', { name: 'kg' })).toBeChecked();
    expect(siguiente()).toBeEnabled();
  });

  it('«600» en ml cuenta 0,6 L; «0,5» en g avisa y no deja avanzar', async () => {
    pantalla({ 'GET /api/categorias/buscar': [JUGO, ARROZ] });
    await userEvent.type(await screen.findByRole('searchbox'), 'jugo');
    await userEvent.click(await screen.findByRole('button', { name: /Jugo/ }));
    const linea = screen.getByRole('listitem', { name: 'Jugo' });
    const campo = within(linea).getByRole('textbox', { name: 'Cantidad de Jugo' });
    await userEvent.clear(campo);
    await userEvent.type(campo, '600');
    await userEvent.click(within(linea).getByRole('radio', { name: 'ml' }));
    expect(within(linea).getByText('Se cuentan 0,6 L')).toBeInTheDocument();
    expect(siguiente()).toBeEnabled();
    await userEvent.clear(campo);
    await userEvent.type(campo, '0,5');
    expect(within(linea).getByText('En ml, la cantidad va sin decimales')).toBeInTheDocument();
    expect(siguiente()).toBeDisabled();
  });

  it('el − y el + cambian la cantidad, con mínimo 1', async () => {
    pantalla({ 'GET /api/categorias/buscar': [PANAL] });
    await userEvent.type(await screen.findByRole('searchbox'), 'pañal');
    await userEvent.click(await screen.findByRole('button', { name: /Pañal/ }));
    const linea = screen.getByRole('listitem', { name: 'Pañal adulto' });
    expect(within(linea).getByRole('button', { name: /^Menos/ })).toBeDisabled();
    await userEvent.click(within(linea).getByRole('button', { name: /^Más/ }));
    await userEvent.click(within(linea).getByRole('button', { name: /^Más/ }));
    expect(within(linea).getByText('3')).toBeInTheDocument();
    await userEvent.click(within(linea).getByRole('button', { name: /^Menos/ }));
    expect(within(linea).getByText('2')).toBeInTheDocument();
  });

  it('un código conocido agrega la línea con presentación y cuenta presentaciones', async () => {
    leera(EAN);
    pantalla({ [`GET /api/donaciones/codigos/${EAN}`]: AGUA });
    await escanear();
    const linea = await screen.findByRole('listitem', { name: 'Agua potable' });
    expect(within(linea).getByText(EAN)).toBeInTheDocument();
    expect(within(linea).getByText(/Cada una trae 0,6 L/)).toBeInTheDocument();
    expect(within(linea).getByText('= 0,6 L')).toBeInTheDocument();
    await userEvent.click(within(linea).getByRole('button', { name: /^Más/ }));
    for (let i = 0; i < 10; i++) {
      await userEvent.click(within(linea).getByRole('button', { name: /^Más/ }));
    }
    expect(within(linea).getByText('12')).toBeInTheDocument();
    expect(within(linea).getByText('= 7,2 L')).toBeInTheDocument();
  });

  it('escanear dos veces el mismo código suma a la misma línea', async () => {
    leera(EAN);
    pantalla({ [`GET /api/donaciones/codigos/${EAN}`]: AGUA });
    await escanear();
    await screen.findByRole('listitem', { name: 'Agua potable' });
    await escanear();
    await waitFor(() =>
      expect(
        within(screen.getByRole('listitem', { name: 'Agua potable' })).getByText('= 1,2 L'),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByRole('listitem', { name: 'Agua potable' })).toHaveLength(1);
  });

  it('un código propuesto por otro Donador se usa con la marca «sin confirmar»', async () => {
    leera(EAN);
    pantalla({
      [`GET /api/donaciones/codigos/${EAN}`]: {
        ...AGUA,
        estado: 'PROPUESTO',
        presentacion: { id: 'p1', nombre: 'Botella de agua 600 ml', tamano: 0.6 },
      },
    });
    await escanear();
    const linea = await screen.findByRole('listitem', { name: 'Agua potable' });
    expect(within(linea).getByText('Sin confirmar')).toBeInTheDocument();
    expect(within(linea).getByText('= 0,6 L')).toBeInTheDocument();
  });

  it('un código desconocido abre la hoja y lo propone, sin campo para escribir el número', async () => {
    leera(NUEVO);
    pantalla({
      [`GET /api/donaciones/codigos/${NUEVO}`]: desconocido,
      'GET /api/categorias/buscar': [AGUA_CAT],
      'GET /api/presentaciones': [BOTELLA],
      'POST /api/donaciones/codigos': {
        ...AGUA,
        ean: NUEVO,
        estado: 'PROPUESTO',
        presentacion: { id: 'p1', nombre: 'Botella de agua 600 ml', tamano: 0.6 },
      },
    });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    expect(hoja).toHaveTextContent(NUEVO);
    expect(within(hoja).queryByDisplayValue(NUEVO)).not.toBeInTheDocument();
    expect(within(hoja).queryByRole('button', { name: 'Solo guardar el código' })).toBeNull();
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'agua');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Agua potable/ }));
    await userEvent.click(
      await within(hoja).findByRole('radio', { name: 'Botella de agua 600 ml' }),
    );
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    const linea = await screen.findByRole('listitem', { name: 'Agua potable' });
    expect(within(linea).getByText('Sin confirmar')).toBeInTheDocument();
    expect(await cuerpoDe('POST /api/donaciones/codigos')).toEqual({
      ean: NUEVO,
      presentacionId: 'p1',
    });
    expect(peticiones()).not.toContain('POST /api/presentaciones');
  });

  it('una presentación nueva se propone junto con el código, sin crearla aparte', async () => {
    leera(NUEVO);
    pantalla({
      [`GET /api/donaciones/codigos/${NUEVO}`]: desconocido,
      'GET /api/categorias/buscar': [AGUA_CAT],
      'GET /api/presentaciones': [BOTELLA],
      'POST /api/donaciones/codigos': {
        ...AGUA,
        ean: NUEVO,
        estado: 'PROPUESTO',
        presentacion: { id: 'p9', nombre: 'Bolsa 6 L', tamano: 6 },
      },
    });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'agua');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Agua potable/ }));
    await within(hoja).findByRole('radio', { name: 'Botella de agua 600 ml' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'Bolsa 6 L');
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '6');
    await userEvent.click(within(nueva).getByRole('button', { name: 'Crear presentación' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Nueva presentación' })).toBeNull(),
    );
    expect(within(hoja).getByRole('radio', { name: 'Bolsa 6 L' })).toBeChecked();
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    await screen.findByRole('listitem', { name: 'Agua potable' });
    expect(await cuerpoDe('POST /api/donaciones/codigos')).toEqual({
      ean: NUEVO,
      presentacionNueva: { categoriaId: 'c1', nombre: 'Bolsa 6 L', tamano: 6 },
    });
    expect(peticiones()).not.toContain('POST /api/presentaciones');
  });

  it('el Donador no puede escribir el número del código', async () => {
    pantalla();
    await escanear();
    expect(screen.getByRole('dialog', { name: 'Escáner' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Escribir el número' })).not.toBeInTheDocument();
  });

  it('«Ahora no» cierra la hoja sin proponer nada', async () => {
    leera(NUEVO);
    pantalla({ [`GET /api/donaciones/codigos/${NUEVO}`]: desconocido });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(peticiones().filter((p) => p.startsWith('POST'))).toEqual([]);
  });

  it('«Vence (opcional)» solo en las perecederas', async () => {
    leera(EAN);
    pantalla({ [`GET /api/donaciones/codigos/${EAN}`]: AGUA });
    await escanear();
    await screen.findByRole('listitem', { name: 'Agua potable' });
    expect(screen.queryByLabelText('Vence (opcional)')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    const arroz = screen.getByRole('listitem', { name: 'Arroz' });
    expect(within(arroz).getByLabelText('Vence (opcional)')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Vence (opcional)')).toHaveLength(1);
  });

  it('quita una línea', async () => {
    pantalla();
    await userEvent.type(await screen.findByRole('searchbox'), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Arroz' }));
    expect(screen.queryByRole('listitem', { name: 'Arroz' })).not.toBeInTheDocument();
    expect(siguiente()).toBeDisabled();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = pantalla();
    await userEvent.type(await screen.findByRole('searchbox'), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
