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

// La cámara «lee» `camara.lee` apenas se abre (sin él, queda abierta), o falla con `camara.falla`
const camara = vi.hoisted(() => ({ lee: '', falla: null as unknown }));
vi.mock('../inventario/camara', () => ({
  abrirCamara: async (_video: unknown, alLeer: (codigo: string) => void) => {
    if (camara.falla) throw camara.falla;
    if (camara.lee) setTimeout(() => alLeer(camara.lee), 0);
    return () => {};
  },
}));

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
  beforeEach(() => {
    camara.lee = '';
    camara.falla = null;
  });

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

  it('un código sin presentación no se aprueba: «Aprobar» queda deshabilitado y remite a «Cambiar de presentación»', async () => {
    pantalla();
    await userEvent.click(await fila(/Sin presentación/));
    const huerfano = await screen.findByRole('article', { name: '7702009000006' });
    const aprobar = within(huerfano).getByRole('button', { name: 'Aprobar' });
    expect(aprobar).toBeDisabled();
    expect(aprobar).toHaveAccessibleDescription(
      'Para aprobarlo, primero usa «Cambiar de presentación» y elige una.',
    );
    expect(peticiones().filter((p) => p.startsWith('PATCH'))).toHaveLength(0);
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

  it('«Escribir el número» abre la hoja con el campo vacío para escribirlo', async () => {
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Escribir el número' }));
    const hoja = screen.getByRole('dialog', { name: 'Código nuevo' });
    expect(within(hoja).getByRole('textbox', { name: 'Número del código' })).toHaveValue('');
  });

  it('«Agregar código» del encabezado y «Escanear» del pie abren la cámara', async () => {
    pantalla();
    await screen.findByRole('radio', { name: 'Propuestos (4)' });
    await userEvent.click(screen.getByRole('button', { name: 'Agregar código' }));
    const escaner = screen.getByRole('dialog', { name: 'Escáner' });
    await userEvent.click(within(escaner).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Escáner' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Escanear' }));
    expect(screen.getByRole('dialog', { name: 'Escáner' })).toBeInTheDocument();
  });

  it('un código que Acopio no conoce abre «Código nuevo» con el número leído, que se puede corregir', async () => {
    camara.lee = '7709999000001';
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    const numero = within(hoja).getByRole('textbox', { name: 'Número del código' });
    expect(numero).toHaveValue('7709999000001');
    expect(screen.queryByRole('dialog', { name: 'Escáner' })).not.toBeInTheDocument();
    expect(peticiones()).toContain('GET /api/codigos-barras/7709999000001');
  });

  it('un código que ya existe lo avisa y abre el detalle de su presentación', async () => {
    camara.lee = '7702001000001';
    pantalla({ 'GET /api/codigos-barras/*': CODIGOS[0] });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    expect(
      await screen.findByText('Ese código ya está en Agua potable · Paquete x12 · botella 600 ml.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: /Paquete x12/ })).toBeVisible();
    expect(screen.getByRole('article', { name: '7702001000001' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Código nuevo' })).not.toBeInTheDocument();
  });

  it('sin permiso para la cámara lo avisa y abre la hoja para escribir el número', async () => {
    camara.falla = new DOMException('negado', 'NotAllowedError');
    pantalla();
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    expect(
      await screen.findByText('Sin permiso para usar la cámara. Escribe el número.'),
    ).toBeInTheDocument();
    const hoja = screen.getByRole('dialog', { name: 'Código nuevo' });
    expect(within(hoja).getByRole('textbox', { name: 'Número del código' })).toHaveValue('');
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
