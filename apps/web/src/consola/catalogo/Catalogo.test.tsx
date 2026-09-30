import { render, screen, within } from '@testing-library/react';
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
const cat = (datos: Record<string, unknown>) => ({
  id: 'c1',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: false,
  sinonimos: [],
  archivada: false,
  ...datos,
});
const CATEGORIAS = [
  cat({ id: 'c1', nombre: 'Arroz' }),
  cat({ id: 'c2', nombre: 'Leche', perecedero: true, unidadBase: 'LITRO' }),
  cat({ id: 'c3', nombre: 'Agua potable', grupo: 'AGUA_Y_BEBIDAS', unidadBase: 'LITRO' }),
];
const CANASTA = [
  {
    categoriaId: 'c1',
    categoria: 'Arroz',
    unidadBase: 'KILOGRAMO',
    cantidadPersonaDia: 0.15,
    fuente: 'Esfera',
    vigenteDesde: '2026-09-28',
  },
];
const EMERGENCIAS = [
  {
    id: 'e1',
    nombre: 'Terremoto de 2026 · Caldas',
    tipo: 'sismo',
    inicio: '2026-09-02T00:00:00.000Z',
    horizonteDias: 7,
    estado: 'ACTIVA',
    destacadaHasta: '2026-12-31T00:00:00.000Z',
    cerradaEn: null,
    motivoCierre: [],
  },
  {
    id: 'e2',
    nombre: 'Deslizamiento Rosas',
    tipo: 'deslizamiento',
    inicio: '2026-01-12T00:00:00.000Z',
    horizonteDias: 7,
    estado: 'CERRADA',
    destacadaHasta: '2026-02-01T00:00:00.000Z',
    cerradaEn: '2026-03-01T00:00:00.000Z',
    motivoCierre: [],
  },
];

const RUTAS = {
  'GET /api/categorias': CATEGORIAS,
  'GET /api/categorias/buscar': [{ ...CATEGORIAS[0], puntaje: 0.8 }],
  'GET /api/canasta': CANASTA,
  'GET /api/emergencias': EMERGENCIAS,
  'POST /api/categorias': cat({ id: 'c9', nombre: 'Panela' }),
  'PATCH /api/categorias/*': cat({}),
  'POST /api/categorias/*/archivar': cat({ archivada: true }),
  'POST /api/categorias/*/canasta': {
    id: 'v1',
    cantidadPersonaDia: 0.2,
    fuente: 'Esfera',
    vigenteDesde: '2026-10-01',
  },
  'POST /api/emergencias': EMERGENCIAS[0],
  'POST /api/emergencias/*/cerrar': { ...EMERGENCIAS[0], estado: 'CERRADA' },
};

const pantalla = (ruta = '/consola/catalogo') => {
  responderSegun(RUTAS);
  return render(envolver(<Catalogo />, ruta, clienteFalso(ADMIN)));
};

describe('categorías', () => {
  it('lista por grupo con unidad, perecedero y canasta', async () => {
    pantalla();
    const alimentos = await screen.findByRole('region', { name: 'Alimentos' });
    expect(within(alimentos).getByText('Arroz')).toBeInTheDocument();
    expect(within(alimentos).getByText('0,15 kg por persona al día')).toBeInTheDocument();
    expect(within(alimentos).getByText('Perecedero')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Agua y bebidas' })).toHaveTextContent(
      'Agua potable',
    );
  });

  it('buscar usa la búsqueda tolerante de la API', async () => {
    pantalla();
    await screen.findByRole('region', { name: 'Alimentos' });
    await userEvent.type(screen.getByLabelText('Buscar categoría'), 'aroz');
    expect(await screen.findByText('Arroz')).toBeInTheDocument();
    expect(peticiones().some((p) => p.startsWith('GET /api/categorias/buscar?q=aroz'))).toBe(true);
  });

  it('los grupos y ver archivadas cambian la consulta', async () => {
    pantalla();
    await screen.findByRole('region', { name: 'Alimentos' });
    await userEvent.click(screen.getByRole('button', { name: 'Agua y bebidas' }));
    expect(peticiones().at(-1)).toMatch(/grupo=AGUA_Y_BEBIDAS/);
    await userEvent.click(screen.getByRole('switch', { name: 'Ver archivadas' }));
    expect(peticiones().at(-1)).toMatch(/incluirArchivadas=true/);
  });

  it('archivar una categoría llama a la API', async () => {
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Archivar Arroz' }));
    expect(peticiones()).toContain('POST /api/categorias/c1/archivar');
  });

  it('crear una categoría manda el formulario', async () => {
    pantalla();
    await screen.findByRole('region', { name: 'Alimentos' });
    await userEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }));
    const hoja = screen.getByRole('dialog', { name: 'Nueva categoría' });
    await userEvent.type(within(hoja).getByLabelText('Nombre'), 'Panela');
    await userEvent.selectOptions(within(hoja).getByLabelText('Grupo'), 'ALIMENTOS');
    await userEvent.selectOptions(within(hoja).getByLabelText('Unidad base'), 'KILOGRAMO');
    await userEvent.type(within(hoja).getByLabelText(/Sinónimos/), 'panelita, dulce');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(await cuerpoDe('POST /api/categorias')).toEqual({
      nombre: 'Panela',
      grupo: 'ALIMENTOS',
      unidadBase: 'KILOGRAMO',
      perecedero: false,
      sinonimos: ['panelita', 'dulce'],
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('canasta', () => {
  it('muestra la versión vigente y agrega una nueva', async () => {
    pantalla('/consola/catalogo?pestana=canasta');
    expect(await screen.findByText('0,15 kg por persona al día')).toBeInTheDocument();
    expect(screen.getByText(/Esfera/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Nueva versión de Arroz' }));
    const hoja = screen.getByRole('dialog', { name: 'Canasta de Arroz' });
    await userEvent.clear(within(hoja).getByLabelText(/Cantidad por persona al día/));
    await userEvent.type(within(hoja).getByLabelText(/Cantidad por persona al día/), '0,2');
    await userEvent.type(within(hoja).getByLabelText('Fuente'), 'Esfera 2018');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(await cuerpoDe('POST /api/categorias/c1/canasta')).toMatchObject({
      cantidadPersonaDia: 0.2,
      fuente: 'Esfera 2018',
    });
  });
});

describe('emergencias', () => {
  it('muestra el estado con texto y cierra con motivo', async () => {
    pantalla('/consola/catalogo?pestana=emergencias');
    expect(await screen.findByText('Terremoto de 2026 · Caldas')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByText('Cerrada')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar Terremoto de 2026 · Caldas' }),
    );
    const hoja = screen.getByRole('dialog', { name: 'Cerrar emergencia' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Cerrar emergencia' }));
    expect(within(hoja).getByRole('alert')).toHaveTextContent('Escribe el motivo del cierre.');
    await userEvent.type(within(hoja).getByLabelText('Motivo'), 'Atención terminada');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Cerrar emergencia' }));
    expect(await cuerpoDe('POST /api/emergencias/e1/cerrar')).toEqual({
      motivo: 'Atención terminada',
    });
  });

  it('una emergencia cerrada no se puede editar ni cerrar', async () => {
    pantalla('/consola/catalogo?pestana=emergencias');
    await screen.findByText('Deslizamiento Rosas');
    expect(
      screen.queryByRole('button', { name: 'Editar Deslizamiento Rosas' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cerrar Deslizamiento Rosas' }),
    ).not.toBeInTheDocument();
  });

  it('crea una emergencia', async () => {
    pantalla('/consola/catalogo?pestana=emergencias');
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva emergencia' }));
    const hoja = screen.getByRole('dialog', { name: 'Nueva emergencia' });
    await userEvent.type(within(hoja).getByLabelText('Nombre'), 'Inundaciones en La Mojana');
    await userEvent.type(within(hoja).getByLabelText('Tipo'), 'inundación');
    await userEvent.type(within(hoja).getByLabelText('Inicio'), '2026-09-20');
    await userEvent.type(within(hoja).getByLabelText('Destacada hasta'), '2026-12-31');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(await cuerpoDe('POST /api/emergencias')).toEqual({
      nombre: 'Inundaciones en La Mojana',
      tipo: 'inundación',
      inicio: '2026-09-20',
      destacadaHasta: '2026-12-31',
    });
  });
});

it.each(['categorias', 'canasta', 'emergencias'])(
  'la pestaña %s no tiene violaciones graves de accesibilidad',
  async (pestana) => {
    const { container } = pantalla(`/consola/catalogo?pestana=${pestana}`);
    await screen.findAllByRole('region');
    expect(await violacionesGraves(container)).toEqual([]);
  },
);
