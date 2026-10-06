import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
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
  contenido: 0.6,
};
const ARROZ = {
  id: 'c2',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: true,
  puntaje: 0.9,
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
    expect(within(linea).getByText('1')).toBeInTheDocument();
    expect(within(linea).getByText('kg')).toBeInTheDocument();
    expect(siguiente()).toBeEnabled();
  });

  it('el − y el + cambian la cantidad, con mínimo 1', async () => {
    pantalla();
    await userEvent.type(await screen.findByRole('searchbox'), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    const linea = screen.getByRole('listitem', { name: 'Arroz' });
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

  it('un código desconocido avisa, deja buscar por nombre y no guarda el código', async () => {
    leera('7702001234567');
    pantalla({
      'GET /api/donaciones/codigos/7702001234567': conEstado(404, {
        estado: 404,
        codigo: 'EAN_DESCONOCIDO',
        mensaje: 'Código desconocido',
      }),
    });
    await escanear();
    expect(
      await screen.findByText(/No conocemos este código: búscalo por nombre/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    const linea = screen.getByRole('listitem', { name: 'Arroz' });
    expect(within(linea).queryByText('7702001234567')).not.toBeInTheDocument();
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
