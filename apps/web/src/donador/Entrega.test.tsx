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

const DONADOR = { id: 'd', username: 'ana', nombre: 'Ana', rol: 'DONADOR' as const };
const ARROZ = {
  id: 'c2',
  nombre: 'Arroz',
  grupo: 'ALIMENTOS',
  unidadBase: 'KILOGRAMO',
  perecedero: true,
  puntaje: 0.9,
};
const A1 = '11111111-1111-4111-8111-111111111111';
const A2 = '22222222-2222-4222-8222-222222222222';
const SUGERENCIAS = [
  {
    acopioId: A1,
    nombre: 'Parroquia San José',
    direccion: 'Chapinero',
    abiertoAhora: true,
    distanciaKm: [1.2],
    noRecibe: [],
    lineasAceptadas: 1,
  },
  {
    acopioId: A2,
    nombre: 'Acopio Norte',
    direccion: 'Usaquén',
    abiertoAhora: false,
    distanciaKm: [],
    noRecibe: ['Agua potable'],
    lineasAceptadas: 0,
  },
];
const CREADA = {
  id: 'x',
  folio: 'ACO-2026-7KQ4M',
  estado: 'PREPARADO',
  acopio: { id: A1, nombre: 'Parroquia San José' },
  creadoEn: new Date().toISOString(),
  recibidoEn: null,
  verificadoEn: null,
  motivoRechazo: [],
  notaRechazo: [],
  tieneFactura: false,
  lineas: [
    {
      id: 'l1',
      categoriaId: 'c2',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      perecedero: true,
      ean: null,
      contenidoUnitario: 1,
      cantidadDeclarada: 2,
      cantidadConfirmada: null,
      venceEn: '2026-11-20',
      motivoDiferencia: null,
    },
  ],
};

const base = (extra: Record<string, unknown> = {}) => ({
  'GET /api/donaciones': [],
  'GET /api/categorias/buscar': [ARROZ],
  'POST /api/donaciones/sugerencias': SUGERENCIAS,
  ...extra,
});

async function alPasoDos(ruta = '/donar') {
  render(envolver(<Preparar />, ruta, clienteFalso(DONADOR)));
  await userEvent.type(await screen.findByRole('searchbox', { name: 'Categoría' }), 'arroz');
  await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
  const linea = screen.getByRole('listitem', { name: 'Arroz' });
  await userEvent.type(within(linea).getByLabelText('Vence (opcional)'), '2026-11-20');
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente: dónde entregar' }));
}

const preparar = () => screen.findByRole('button', { name: 'Preparar y ver mi folio' });

afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation');
});

describe('P9, paso 2: dónde entregar', () => {
  it('muestra la barra de pasos y las sugerencias, con la primera elegida', async () => {
    responderSegun(base());
    await alPasoDos();
    const pasos = await screen.findByRole('list', { name: 'Pasos' });
    expect(within(pasos).getByText('2 Dónde entregar').closest('li')).toHaveAttribute(
      'aria-current',
      'step',
    );
    const primero = await screen.findByRole('radio', { name: /Parroquia San José/ });
    expect(primero).toBeChecked();
    expect(screen.getByText(/Chapinero · abierto ahora/)).toBeInTheDocument();
    expect(screen.getByText('1,2 km')).toBeInTheDocument();
    expect(screen.getByText('Recibe 1 de 1 producto')).toBeInTheDocument();
    expect(screen.getByText(/Usaquén · cerrado ahora/)).toBeInTheDocument();
    expect(screen.getByText('No está recibiendo Agua potable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver todos en el mapa/ })).toHaveAttribute(
      'href',
      '/mapa',
    );
    expect(await cuerpoDe('POST /api/donaciones/sugerencias')).toEqual({
      lineas: [{ categoriaId: 'c2' }],
    });
  });

  it('«Usar mi ubicación» pide la ubicación y repite la consulta con lat y lng', async () => {
    const pedir = vi.fn((ok: (p: unknown) => void) =>
      ok({ coords: { latitude: 4.6, longitude: -74.1 } }),
    );
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: pedir },
    });
    responderSegun(base());
    await alPasoDos();
    await screen.findByRole('radio', { name: /Parroquia San José/ });
    expect(pedir).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await waitFor(async () =>
      expect(await cuerpoDe('POST /api/donaciones/sugerencias')).toEqual({
        lineas: [{ categoriaId: 'c2' }],
        lat: 4.6,
        lng: -74.1,
      }),
    );
    expect(screen.queryByRole('status', { name: /Buscando/ })).not.toBeInTheDocument();
  });

  it('la elección del usuario se mantiene cuando la lista se reordena', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: 4.6, longitude: -74.1 } }),
      },
    });
    responderSegun(base());
    await alPasoDos();
    await userEvent.click(await screen.findByRole('radio', { name: /Acopio Norte/ }));
    responderSegun(base({ 'POST /api/donaciones/sugerencias': [...SUGERENCIAS].reverse() }));
    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await waitFor(() =>
      expect(screen.getAllByRole('radio')[0]).toHaveAccessibleName(/Acopio Norte/),
    );
    expect(screen.getByRole('radio', { name: /Acopio Norte/ })).toBeChecked();
  });

  it('con la ubicación denegada avisa y deja elegir de la lista', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: unknown, no: () => void) => no() },
    });
    responderSegun(base());
    await alPasoDos();
    await screen.findByRole('radio', { name: /Parroquia San José/ });
    await userEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(await screen.findByText(/No pudimos usar tu ubicación/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Parroquia San José/ })).toBeChecked();
  });

  it('«Volver» regresa al paso 1 y conserva las líneas', async () => {
    responderSegun(base());
    await alPasoDos();
    await screen.findByRole('radio', { name: /Parroquia San José/ });
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('listitem', { name: 'Arroz' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();
  });

  it('elegir otro acopio y preparar manda el cuerpo esperado y abre el folio con QR', async () => {
    responderSegun(base({ 'POST /api/donaciones': CREADA }));
    await alPasoDos();
    await userEvent.click(await screen.findByRole('radio', { name: /Acopio Norte/ }));
    await userEvent.click(await preparar());
    expect(await screen.findByText('ACO-2026-7KQ4M')).toBeInTheDocument();
    expect(await cuerpoDe('POST /api/donaciones')).toEqual({
      acopioId: A2,
      lineas: [{ categoriaId: 'c2', cantidad: 1, venceEn: '2026-11-20' }],
    });
    const qr = await screen.findByRole('img', { name: 'Código QR del folio' });
    expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(peticiones().filter((p) => p.includes('/factura'))).toHaveLength(0);
    expect(screen.getByText(/Vence en 7 días/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver ficha y cómo llegar/ })).toHaveAttribute(
      'href',
      `/acopios/${A1}`,
    );
    expect(screen.getByRole('link', { name: 'Ver mis donaciones' })).toHaveAttribute(
      'href',
      '/donador',
    );
    expect(screen.getByRole('link', { name: 'Seguir esta donación' })).toHaveAttribute(
      'href',
      '/seguimiento/ACO-2026-7KQ4M',
    );
    expect(screen.getByText('Arroz 2 kg')).toBeInTheDocument();
  });

  it('un 409 LIMITE_PREPARADAS muestra el mensaje con el enlace a /donador', async () => {
    responderSegun(
      base({
        'POST /api/donaciones': conEstado(409, {
          estado: 409,
          codigo: 'LIMITE_PREPARADAS',
          mensaje: 'Ya tienes 5 donaciones preparadas',
        }),
      }),
    );
    await alPasoDos();
    await userEvent.click(await preparar());
    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('Ya tienes 5 donaciones preparadas');
    expect(within(aviso).getByRole('link', { name: /Mis donaciones/ })).toHaveAttribute(
      'href',
      '/donador',
    );
  });

  it('otro error muestra el mensaje de la API', async () => {
    responderSegun(
      base({
        'POST /api/donaciones': conEstado(500, {
          estado: 500,
          codigo: 'INTERNO',
          mensaje: 'Algo falló al preparar',
        }),
      }),
    );
    await alPasoDos();
    await userEvent.click(await preparar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Algo falló al preparar');
  });

  it('la factura elegida se muestra en miniatura y se sube tras crear la donación', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mini');
    URL.revokeObjectURL = vi.fn();
    responderSegun(
      base({
        'POST /api/donaciones': CREADA,
        'POST /api/donaciones/*/factura': { ...CREADA, tieneFactura: true },
      }),
    );
    await alPasoDos();
    const entrada = await screen.findByLabelText('Tomar o subir foto');
    expect(entrada).toHaveAttribute('capture', 'environment');
    expect(entrada).toHaveAttribute('accept', 'image/*');
    expect(screen.getByRole('link', { name: 'Cómo usamos tus datos' })).toHaveAttribute(
      'href',
      '/privacidad',
    );
    await userEvent.upload(entrada, new File(['x'], 'f.jpg', { type: 'image/jpeg' }));
    expect(screen.getByRole('img', { name: 'Factura elegida' })).toHaveAttribute(
      'src',
      'blob:mini',
    );
    expect(peticiones().filter((p) => p.includes('/factura'))).toHaveLength(0);
    await userEvent.click(await preparar());
    expect(await screen.findByText('Factura adjunta')).toBeInTheDocument();
    expect(peticiones()).toContain('POST /api/donaciones/ACO-2026-7KQ4M/factura');
  });

  it('si la API rechaza la factura (413), el folio se muestra y se elige otra foto', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mini');
    URL.revokeObjectURL = vi.fn();
    responderSegun(
      base({
        'POST /api/donaciones': CREADA,
        'POST /api/donaciones/*/factura': conEstado(413, {
          estado: 413,
          codigo: 'ARCHIVO_GRANDE',
          mensaje: 'La foto pesa demasiado',
        }),
      }),
    );
    await alPasoDos();
    await userEvent.upload(
      await screen.findByLabelText('Tomar o subir foto'),
      new File(['x'], 'f.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.click(await preparar());
    expect(await screen.findByText('ACO-2026-7KQ4M')).toBeInTheDocument();
    expect(
      await screen.findByText(/No pudimos subir la factura: La foto pesa demasiado/),
    ).toBeInTheDocument();
    responderSegun(
      base({
        'POST /api/donaciones/*/factura': { ...CREADA, tieneFactura: true },
      }),
    );
    // Repetir la foto rechazada no sirve: solo se ofrece elegir otra
    expect(screen.queryByRole('button', { name: 'Intentar otra vez' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir otra foto' })).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText('Foto de la factura'),
      new File(['y'], 'otra.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByText('Factura adjunta')).toBeInTheDocument();
  });

  it('si la factura es de un tipo no admitido (415), el folio se muestra y se elige otra foto', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mini');
    URL.revokeObjectURL = vi.fn();
    responderSegun(
      base({
        'POST /api/donaciones': CREADA,
        'POST /api/donaciones/*/factura': conEstado(415, {
          estado: 415,
          codigo: 'TIPO_NO_ADMITIDO',
          mensaje: 'Solo se admiten fotos',
        }),
      }),
    );
    await alPasoDos();
    await userEvent.upload(
      await screen.findByLabelText('Tomar o subir foto'),
      new File(['x'], 'f.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.click(await preparar());
    expect(await screen.findByText('ACO-2026-7KQ4M')).toBeInTheDocument();
    expect(
      await screen.findByText(/No pudimos subir la factura: Solo se admiten fotos/),
    ).toBeInTheDocument();
    responderSegun(
      base({
        'POST /api/donaciones/*/factura': { ...CREADA, tieneFactura: true },
      }),
    );
    // Repetir la foto rechazada no sirve: solo se ofrece elegir otra
    expect(screen.queryByRole('button', { name: 'Intentar otra vez' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elegir otra foto' })).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText('Foto de la factura'),
      new File(['y'], 'otra.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByText('Factura adjunta')).toBeInTheDocument();
  });

  it('si la subida falla por algo que no es la foto, se puede repetir la misma', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:mini');
    URL.revokeObjectURL = vi.fn();
    responderSegun(base({ 'POST /api/donaciones': CREADA }));
    await alPasoDos();
    await userEvent.upload(
      await screen.findByLabelText('Tomar o subir foto'),
      new File(['x'], 'f.jpg', { type: 'image/jpeg' }),
    );
    await userEvent.click(await preparar());
    expect(await screen.findByText(/No pudimos subir la factura/)).toBeInTheDocument();
    responderSegun(
      base({
        'POST /api/donaciones/*/factura': { ...CREADA, tieneFactura: true },
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Intentar otra vez' }));
    expect(await screen.findByText('Factura adjunta')).toBeInTheDocument();
  });

  it('al cambiar de paso el foco va al paso nuevo y se anuncia', async () => {
    responderSegun(base({ 'POST /api/donaciones': CREADA }));
    await alPasoDos();

    const region = await screen.findByRole('region', { name: 'Paso 2 de 3: Dónde entregar' });
    expect(region).toHaveFocus();

    await userEvent.click(await preparar());

    const folio = await screen.findByRole('region', { name: 'Paso 3 de 3: Tu folio' });
    expect(folio).toHaveFocus();
  });

  it('axe: pasos 2 y 3 sin violaciones graves', async () => {
    responderSegun(base({ 'POST /api/donaciones': CREADA }));
    const { container } = render(envolver(<Preparar />, '/donar', clienteFalso(DONADOR)));
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await screen.findByRole('button', { name: /Arroz/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente: dónde entregar' }));
    await screen.findByRole('radio', { name: /Parroquia San José/ });
    expect(await violacionesGraves(container)).toEqual([]);
    await userEvent.click(await preparar());
    await screen.findByText('ACO-2026-7KQ4M');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('P9, paso 3 por folio', () => {
  it('/donar?folio= abre el paso 3 de una donación preparada', async () => {
    responderSegun({ 'GET /api/donaciones': [CREADA] });
    render(envolver(<Preparar />, '/donar?folio=ACO-2026-7KQ4M', clienteFalso(DONADOR)));
    expect(await screen.findByText('ACO-2026-7KQ4M')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Código QR del folio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar foto de la factura' })).toBeInTheDocument();
  });

  it('un folio que no está entre las preparadas lo dice', async () => {
    responderSegun({ 'GET /api/donaciones': [] });
    render(envolver(<Preparar />, '/donar?folio=ACO-2026-XXXXX', clienteFalso(DONADOR)));
    expect(await screen.findByText(/No encontramos esa donación/)).toBeInTheDocument();
  });
});
