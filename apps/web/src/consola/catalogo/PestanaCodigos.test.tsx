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
const BOTELLA = { id: 'p1', nombre: 'Botella de agua 600 ml', tamano: 0.6 };
const PAQUETE = { id: 'p2', nombre: 'Paquete x12 · botella 600 ml', tamano: 7.2 };
const BOLSA = { id: 'p3', nombre: 'Bolsa de arroz 500 g', tamano: 0.5 };
const codigo = (datos: Record<string, unknown>) => ({
  ean: '7702001234567',
  categoriaId: 'c3',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  presentacion: BOTELLA,
  contenido: 0.6,
  estado: 'VALIDADO',
  porRevisar: false,
  grupo: 'AGUA_Y_BEBIDAS',
  perecedero: false,
  creadoPor: 'Daniela Méndez',
  creadoEn: horasAtras(2),
  ...datos,
});
const CODIGOS = [
  codigo({ ean: '7702001000001', presentacion: PAQUETE, contenido: 7.2, estado: 'PROPUESTO' }),
  codigo({
    ean: '7702001000002',
    presentacion: PAQUETE,
    contenido: 7.2,
    porRevisar: true,
    creadoPor: null,
  }),
  codigo({ ean: '7702001000003', presentacion: PAQUETE, contenido: 7.2 }),
  codigo({ ean: '7702001000004' }),
  codigo({
    ean: '7702009000005',
    categoriaId: 'c1',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    presentacion: BOLSA,
    contenido: 0.5,
    estado: 'PROPUESTO',
    grupo: 'ALIMENTOS',
  }),
  codigo({
    ean: '7702009000006',
    categoriaId: 'c1',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    presentacion: null,
    contenido: null,
    porRevisar: true,
    grupo: 'ALIMENTOS',
  }),
];
const BUSQUEDA = [
  {
    id: 'c1',
    nombre: 'Arroz',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    puntaje: 0.9,
  },
];
const PRESENTACIONES = [
  {
    id: 'p3',
    categoriaId: 'c1',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    nombre: 'Bolsa de arroz 500 g',
    clase: 'SUELTA',
    tamano: 0.5,
    contieneId: null,
    unidades: null,
    estado: 'VALIDADO',
    codigos: 1,
  },
];

const pantalla = (extra: Record<string, unknown> = {}) => {
  responderSegun({
    'GET /api/codigos-barras': CODIGOS,
    'PATCH /api/codigos-barras/*': CODIGOS[0],
    'GET /api/categorias/buscar': BUSQUEDA,
    'GET /api/presentaciones': PRESENTACIONES,
    ...extra,
  });
  return render(envolver(<Catalogo />, '/consola/catalogo?pestana=codigos', clienteFalso(ADMIN)));
};
const fila = (nombre: string | RegExp) => screen.findByRole('button', { name: nombre });

describe('C18 Códigos', () => {
  it('es la cuarta pestaña y el filtro arranca en «Propuestos» con PROPUESTO y por revisar', async () => {
    pantalla();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(await screen.findByRole('radio', { name: 'Propuestos (4)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Todos' })).toBeInTheDocument();
    // La botella solo tiene un código validado: no sale entre los propuestos
    expect(await fila(/Paquete x12/)).toHaveTextContent('2 propuestos');
    expect(screen.queryByRole('button', { name: /Botella de agua/ })).not.toBeInTheDocument();
  });

  it('agrupa por categoría y presentación con su número de códigos, y deja sin presentación aparte', async () => {
    pantalla();
    await userEvent.click(await screen.findByRole('radio', { name: 'Todos' }));
    expect(await fila(/Botella de agua 600 ml/)).toHaveTextContent('1 código');
    expect(await fila(/Paquete x12/)).toHaveTextContent('3 códigos');
    expect(await fila(/Bolsa de arroz/)).toHaveTextContent('1 código');
    const grupos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(grupos).toEqual(['Agua potable', 'Arroz']);
    expect(await fila(/Sin presentación/)).toHaveTextContent('1 código');
  });

  it('escribir en el buscador manda q a la API tras 300 ms', async () => {
    pantalla();
    await screen.findByRole('radio', { name: 'Propuestos (4)' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar códigos' }), 'arroz');
    expect(peticiones().filter((p) => p.includes('q=arroz'))).toHaveLength(0);
    await waitFor(() =>
      expect(peticiones().filter((p) => p.includes('q=arroz')).length).toBeGreaterThan(0),
    );
    expect(peticiones().filter((p) => p.includes('q=a&') || p.endsWith('q=a'))).toHaveLength(0);
  });

  it('abrir una presentación muestra sus códigos con «Aprobar» y «Cambiar de presentación», sin «Borrar»', async () => {
    pantalla();
    await userEvent.click(await fila(/Paquete x12/));
    expect(await screen.findByRole('heading', { level: 2, name: /Paquete x12/ })).toBeVisible();
    const propuesto = screen.getByRole('article', { name: '7702001000001' });
    expect(propuesto).toHaveTextContent('Propuesto');
    expect(within(propuesto).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(
      within(propuesto).getByRole('button', { name: 'Cambiar de presentación' }),
    ).toBeInTheDocument();
    const porRevisar = screen.getByRole('article', { name: '7702001000002' });
    expect(porRevisar).toHaveTextContent('Por revisar');
    expect(within(porRevisar).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    const validado = screen.getByRole('article', { name: '7702001000003' });
    expect(validado).toHaveTextContent('Validado');
    expect(within(validado).queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Borrar/ })).not.toBeInTheDocument();
  });

  it('«Aprobar» valida el código y quita la marca de revisión', async () => {
    pantalla();
    await userEvent.click(await fila(/Paquete x12/));
    const propuesto = await screen.findByRole('article', { name: '7702001000001' });
    await userEvent.click(within(propuesto).getByRole('button', { name: 'Aprobar' }));
    expect(await cuerpoDe('PATCH /api/codigos-barras/7702001000001')).toEqual({
      estado: 'VALIDADO',
      porRevisar: false,
    });
    await waitFor(() =>
      expect(peticiones().filter((p) => p === 'GET /api/codigos-barras')).toHaveLength(2),
    );
  });

  it('«Cambiar de presentación» deja elegir una de cualquier categoría', async () => {
    pantalla();
    await userEvent.click(await fila(/Sin presentación/));
    const huerfano = await screen.findByRole('article', { name: '7702009000006' });
    await userEvent.click(
      within(huerfano).getByRole('button', { name: 'Cambiar de presentación' }),
    );
    const hoja = screen.getByRole('dialog', { name: 'Cambiar de presentación' });
    await userEvent.click(await within(hoja).findByRole('radio', { name: /Bolsa de arroz/ }));
    await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar' }));
    expect(await cuerpoDe('PATCH /api/codigos-barras/7702009000006')).toEqual({
      presentacionId: 'p3',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('«Agregar código» abre la hoja con el campo para escribir el número', async () => {
    pantalla();
    await screen.findByRole('radio', { name: 'Propuestos (4)' });
    await userEvent.click(screen.getAllByRole('button', { name: 'Agregar código' })[0]!);
    const hoja = screen.getByRole('dialog', { name: 'Código nuevo' });
    expect(within(hoja).getByRole('textbox', { name: 'Número del código' })).toBeInTheDocument();
  });

  it('sin propuestos lo dice', async () => {
    pantalla({ 'GET /api/codigos-barras': [CODIGOS[3]] });
    expect(await screen.findByText('No hay códigos propuestos.')).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = pantalla();
    await fila(/Paquete x12/);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
