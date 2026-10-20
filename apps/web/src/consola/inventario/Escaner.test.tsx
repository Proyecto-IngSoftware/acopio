import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { BuscadorCategoria } from './BuscadorCategoria';
import { VistaCamara } from './Escaner';

type Abrir = (video: unknown, alLeer: (codigo: string) => void) => Promise<() => void>;
// Una función simple y no vi.fn: vi.fn guarda cada resultado y deja sin atender la promesa
// rechazada del caso sin permiso
const camara = vi.hoisted(() => ({ abrir: (async () => () => {}) as Abrir }));
vi.mock('./camara', () => ({ abrirCamara: (...a: Parameters<Abrir>) => camara.abrir(...a) }));
const camaraAbierta: Abrir = async () => () => {};

const OPERADOR = { id: 'o', username: 'd', nombre: 'Daniela', rol: 'OPERADOR' as const };
const EAN = '7702001045231';
const AGUA = {
  ean: EAN,
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  contenido: 0.6,
  descripcion: null,
  revisado: true,
  grupo: 'AGUA_Y_BEBIDAS',
  perecedero: false,
  creadoPor: 'Jorge Rincón',
  creadoEn: '2026-10-02T12:00:00.000Z',
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
const presentacion = (p: Record<string, unknown>) => ({
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  clase: 'SUELTA',
  contieneId: null,
  unidades: null,
  estado: 'VALIDADO',
  codigos: 0,
  ...p,
});
const BOTELLA = presentacion({ id: 'p1', nombre: 'Botella de agua 600 ml', tamano: 0.6 });
const BOLSA = presentacion({ id: 'p2', nombre: 'Bolsa de agua 6 L', tamano: 6 });
const PAQUETE = presentacion({
  id: 'p3',
  nombre: 'Paquete x12 · botella 600 ml',
  clase: 'PAQUETE',
  tamano: 7.2,
  contieneId: 'p1',
  unidades: 12,
});
const desconocido = conEstado(404, {
  estado: 404,
  codigo: 'EAN_DESCONOCIDO',
  mensaje: 'Este código no está asociado a ninguna categoría',
});
const codigoNuevo = (extra: Record<string, unknown> = {}) => ({
  [`GET /api/codigos-barras/${NUEVO}`]: desconocido,
  'GET /api/categorias/buscar': [AGUA_CAT],
  'GET /api/presentaciones': [BOTELLA, BOLSA],
  'POST /api/codigos-barras': { ...AGUA, ean: NUEVO, estado: 'VALIDADO' },
  ...extra,
});
const abrirHoja = () => screen.findByRole('dialog', { name: 'Código nuevo' });
const elegirAgua = async (hoja: HTMLElement) => {
  await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'agua');
  await userEvent.click(await within(hoja).findByRole('button', { name: /Agua potable/ }));
};
const ARROZ = {
  id: 'c2',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: true,
  puntaje: 0.9,
};

/** La cámara «lee» este código apenas se abre. */
const leera = (codigo: string) => {
  camara.abrir = async (_video, alLeer) => {
    setTimeout(() => alLeer(codigo), 0);
    return () => {};
  };
};

const pantalla = (respuestas: Record<string, unknown>) => {
  const elegida = vi.fn();
  function Buscador() {
    const [q, fijarQ] = useState('');
    return <BuscadorCategoria id="b" q={q} onQ={fijarQ} onElegir={elegida} />;
  }
  responderSegun({ 'GET /api/categorias/buscar': [ARROZ], ...respuestas });
  const r = render(envolver(<Buscador />, '/', clienteFalso(OPERADOR)));
  return { ...r, elegida };
};

const escanear = () => userEvent.click(screen.getByRole('button', { name: 'Escanear' }));

describe('Escáner', () => {
  beforeEach(() => {
    camara.abrir = camaraAbierta;
  });

  it('abre la cámara a pantalla completa y deja buscar por nombre', async () => {
    pantalla({});
    await escanear();
    const vista = screen.getByRole('dialog', { name: 'Escáner' });
    expect(vista).toHaveTextContent('Apunta al código de barras del producto');
    await userEvent.click(within(vista).getByRole('button', { name: 'Buscar por nombre' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toHaveFocus();
  });

  it('un código conocido elige su categoría y entrega lo que trae cada presentación', async () => {
    leera(EAN);
    const { elegida } = pantalla({ [`GET /api/codigos-barras/${EAN}`]: AGUA });
    await escanear();
    await waitFor(() =>
      expect(elegida).toHaveBeenCalledWith(
        {
          id: 'c1',
          nombre: 'Agua potable',
          grupo: 'AGUA_Y_BEBIDAS',
          unidadBase: 'LITRO',
          perecedero: false,
          puntaje: 1,
        },
        { ean: EAN, contenido: 0.6 },
      ),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un código nuevo lista las presentaciones de la categoría y asocia la elegida', async () => {
    leera(NUEVO);
    const { elegida } = pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    expect(within(hoja).getByLabelText('Número del código')).toHaveValue(NUEVO);
    expect(within(hoja).getByRole('button', { name: 'Asociar y seguir' })).toBeDisabled();
    await elegirAgua(hoja);
    expect(await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' })).toBeVisible();
    await userEvent.click(within(hoja).getByRole('radio', { name: 'Botella de agua 600 ml' }));
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    await waitFor(() =>
      expect(elegida).toHaveBeenCalledWith(AGUA_CAT, { ean: NUEVO, contenido: 0.6 }),
    );
    expect(await cuerpoDe('POST /api/codigos-barras')).toEqual({
      ean: NUEVO,
      presentacionId: 'p1',
    });
  });

  it('sin «Solo guardar el código» cuando quien llama no lo pide', async () => {
    leera(NUEVO);
    pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    expect(within(hoja).queryByRole('button', { name: 'Solo guardar el código' })).toBeNull();
  });

  it('«Nueva presentación» como paquete de 12 muestra el total antes de crearla', async () => {
    leera(NUEVO);
    const { elegida } = pantalla(codigoNuevo({ 'POST /api/presentaciones': PAQUETE }));
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    expect(nueva).toHaveTextContent('Agua potable · se mide en litros');
    await userEvent.click(within(nueva).getByRole('radio', { name: 'Paquete' }));
    expect(within(nueva).getByText('Botella de agua 600 ml')).toBeVisible();
    await userEvent.type(within(nueva).getByLabelText('¿Cuántas trae?'), '12');
    expect(nueva).toHaveTextContent('Total: 12 × 0,6 L = 7,2 L');
    await userEvent.click(within(nueva).getByRole('button', { name: 'Crear presentación' }));
    expect(await cuerpoDe('POST /api/presentaciones')).toEqual({
      categoriaId: 'c1',
      nombre: 'Paquete x12 · Botella de agua 600 ml',
      contieneId: 'p1',
      unidades: 12,
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Nueva presentación' })).toBeNull(),
    );
    expect(within(hoja).getByRole('radio', { name: 'Paquete x12 · botella 600 ml' })).toBeChecked();
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    await waitFor(() =>
      expect(elegida).toHaveBeenCalledWith(AGUA_CAT, { ean: NUEVO, contenido: 7.2 }),
    );
    expect(await cuerpoDe('POST /api/codigos-barras')).toEqual({
      ean: NUEVO,
      presentacionId: 'p3',
    });
  });

  it('una suelta del mismo tamaño avisa y ofrece la que existe; si se insiste, la crea', async () => {
    leera(NUEVO);
    pantalla(
      codigoNuevo({ 'POST /api/presentaciones': { ...BOTELLA, id: 'p4', nombre: 'Botella 0,6' } }),
    );
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'Botella 0,6');
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '0,6');
    expect(nueva).toHaveTextContent('Se guarda como 0,6 L');
    expect(within(nueva).getByRole('status')).toHaveTextContent(
      'Ya existe «Botella de agua 600 ml»',
    );
    await userEvent.click(within(nueva).getByRole('button', { name: 'Crear presentación' }));
    expect(await cuerpoDe('POST /api/presentaciones')).toEqual({
      categoriaId: 'c1',
      nombre: 'Botella 0,6',
      tamano: 0.6,
    });
  });

  it('«Usar esa» elige la suelta que existe sin crear nada', async () => {
    leera(NUEVO);
    pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'Botella 0,6');
    await userEvent.click(within(nueva).getByRole('radio', { name: 'ml' }));
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '600');
    await userEvent.click(within(nueva).getByRole('button', { name: 'Usar esa' }));
    expect(screen.queryByRole('dialog', { name: 'Nueva presentación' })).toBeNull();
    expect(within(hoja).getByRole('radio', { name: 'Botella de agua 600 ml' })).toBeChecked();
    expect(peticiones().some((p) => p.startsWith('POST'))).toBe(false);
  });

  it('un tamaño sobre el tope no se puede crear', async () => {
    leera(NUEVO);
    pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'Tanque');
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '60');
    expect(within(nueva).getByRole('alert')).toHaveTextContent('Una presentación llega hasta 50 L');
    expect(within(nueva).getByRole('button', { name: 'Crear presentación' })).toBeDisabled();
  });

  it('«Ahora no» cierra la hoja sin asociar', async () => {
    leera(NUEVO);
    const { elegida } = pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    await userEvent.click(within(hoja).getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(elegida).not.toHaveBeenCalled();
    expect(peticiones().some((p) => p.startsWith('POST'))).toBe(false);
  });

  it('«Escribir el número» busca el código tecleado como si lo escaneara', async () => {
    const { elegida } = pantalla({ [`GET /api/codigos-barras/${EAN}`]: AGUA });
    await escanear();
    const vista = screen.getByRole('dialog', { name: 'Escáner' });
    await userEvent.click(within(vista).getByRole('button', { name: 'Escribir el número' }));
    const hoja = await screen.findByRole('dialog', { name: 'Escribir el número' });
    const buscar = within(hoja).getByRole('button', { name: 'Buscar código' });
    await userEvent.type(within(hoja).getByLabelText('Número del código'), '12345');
    expect(buscar).toBeDisabled();
    await userEvent.clear(within(hoja).getByLabelText('Número del código'));
    await userEvent.type(within(hoja).getByLabelText('Número del código'), EAN);
    await userEvent.click(buscar);
    await waitFor(() =>
      expect(elegida).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }), {
        ean: EAN,
        contenido: 0.6,
      }),
    );
  });

  it('un número escrito que no se conoce abre «Código nuevo»', async () => {
    pantalla(codigoNuevo());
    await escanear();
    await userEvent.click(screen.getByRole('button', { name: 'Escribir el número' }));
    const hoja = await screen.findByRole('dialog', { name: 'Escribir el número' });
    await userEvent.type(within(hoja).getByLabelText('Número del código'), NUEVO);
    await userEvent.click(within(hoja).getByRole('button', { name: 'Buscar código' }));
    const nuevo = await abrirHoja();
    expect(within(nuevo).getByLabelText('Número del código')).toHaveValue(NUEVO);
  });

  it('un error de un intento anterior desaparece al elegir otra presentación', async () => {
    leera(NUEVO);
    pantalla(
      codigoNuevo({
        'POST /api/codigos-barras': conEstado(409, {
          estado: 409,
          codigo: 'CODIGO_DUPLICADO',
          mensaje: 'El código ya existe',
        }),
      }),
    );
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await userEvent.click(
      await within(hoja).findByRole('radio', { name: 'Botella de agua 600 ml' }),
    );
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    expect(await within(hoja).findByText('El código ya existe')).toBeInTheDocument();
    await userEvent.click(within(hoja).getByRole('radio', { name: 'Bolsa de agua 6 L' }));
    expect(within(hoja).queryByText('El código ya existe')).not.toBeInTheDocument();
  });

  it('un nombre repetido se avisa sin llamar a la API, sin importar mayúsculas', async () => {
    leera(NUEVO);
    pantalla(codigoNuevo());
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'bolsa DE agua 6 l');
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '7');
    expect(within(nueva).getByRole('alert')).toHaveTextContent(
      'Ya hay una presentación con ese nombre en la categoría',
    );
    expect(within(nueva).getByRole('button', { name: 'Crear presentación' })).toBeDisabled();
  });

  it('un tamaño que la API rechaza se muestra en la hoja', async () => {
    leera(NUEVO);
    pantalla(
      codigoNuevo({
        'POST /api/presentaciones': conEstado(422, {
          estado: 422,
          codigo: 'TAMANO_FUERA_DE_TOPE',
          mensaje: 'Una presentación llega hasta 50 L',
        }),
      }),
    );
    await escanear();
    const hoja = await abrirHoja();
    await elegirAgua(hoja);
    await within(hoja).findByRole('radio', { name: 'Bolsa de agua 6 L' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Nueva presentación' }));
    const nueva = await screen.findByRole('dialog', { name: 'Nueva presentación' });
    await userEvent.type(within(nueva).getByLabelText('Nombre'), 'Tanque');
    await userEvent.type(within(nueva).getByLabelText('Tamaño'), '40');
    await userEvent.click(within(nueva).getByRole('button', { name: 'Crear presentación' }));
    expect(await within(nueva).findByText('Una presentación llega hasta 50 L')).toBeInTheDocument();
  });

  it('sin permiso de cámara avisa y la búsqueda sigue igual', async () => {
    camara.abrir = () => Promise.reject(new DOMException('denegado', 'NotAllowedError'));
    pantalla({});
    await escanear();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sin permiso para usar la cámara. Busca la categoría por nombre.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toBeInTheDocument();
  });

  it('sin red no consulta ni aprende el código y lo dice', async () => {
    leera(EAN);
    pantalla({});
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    await escanear();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sin conexión, Acopio no aprende códigos nuevos. Busca por nombre.',
    );
  });

  it('la vista de la cámara no tiene violaciones graves de accesibilidad', async () => {
    pantalla({});
    await escanear();
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});

it('VistaCamara acepta otro texto para apuntar y para salir (C13)', async () => {
  camara.abrir = camaraAbierta;
  render(
    envolver(
      <VistaCamara
        alLeer={() => {}}
        alCerrar={() => {}}
        alFallar={() => {}}
        indicacion="Apunta al QR del documento de la remisión"
        textoSalir="Ver la lista"
      />,
    ),
  );
  expect(await screen.findByText('Apunta al QR del documento de la remisión')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver la lista' })).toBeInTheDocument();
});
