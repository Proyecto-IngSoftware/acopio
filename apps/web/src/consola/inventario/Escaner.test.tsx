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

  it('un código nuevo se asocia a una categoría con su contenido y la elige', async () => {
    leera('7702001234567');
    const { elegida } = pantalla({
      'GET /api/codigos-barras/7702001234567': conEstado(404, {
        estado: 404,
        codigo: 'EAN_DESCONOCIDO',
        mensaje: 'Este código no está asociado a ninguna categoría',
      }),
      'POST /api/codigos-barras': { ...AGUA, ean: '7702001234567', categoriaId: 'c2' },
    });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    expect(hoja).toHaveTextContent('7702001234567');
    expect(within(hoja).getByRole('button', { name: 'Asociar y seguir' })).toBeDisabled();
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Arroz/ }));
    await userEvent.type(within(hoja).getByLabelText(/Cada presentación trae/), '0,5');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Asociar y seguir' }));
    await waitFor(() =>
      expect(elegida).toHaveBeenCalledWith(ARROZ, { ean: '7702001234567', contenido: 0.5 }),
    );
    expect(await cuerpoDe('POST /api/codigos-barras')).toEqual({
      ean: '7702001234567',
      categoriaId: 'c2',
      contenido: 0.5,
    });
  });

  it('en una categoría por unidades el contenido va sin decimales', async () => {
    leera('7702001234567');
    pantalla({
      'GET /api/categorias/buscar': [
        { ...ARROZ, id: 'c4', nombre: 'Pañal adulto', unidadBase: 'UNIDAD', perecedero: false },
      ],
      'GET /api/codigos-barras/7702001234567': conEstado(404, {
        estado: 404,
        codigo: 'EAN_DESCONOCIDO',
        mensaje: 'Este código no está asociado a ninguna categoría',
      }),
    });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'panal');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Pañal adulto/ }));
    await userEvent.type(within(hoja).getByLabelText(/Cada presentación trae/), '2.5');
    expect(within(hoja).getByLabelText(/Cada presentación trae/)).toHaveValue('2,5');
    expect(within(hoja).getByRole('alert')).toHaveTextContent(
      'En unidades, el contenido va sin decimales.',
    );
    expect(within(hoja).getByRole('button', { name: 'Asociar y seguir' })).toBeDisabled();
  });

  it('«Ahora no» cierra la hoja sin asociar', async () => {
    leera('7702001234567');
    const { elegida } = pantalla({
      'GET /api/codigos-barras/7702001234567': conEstado(404, {
        estado: 404,
        codigo: 'EAN_DESCONOCIDO',
        mensaje: 'Este código no está asociado a ninguna categoría',
      }),
    });
    await escanear();
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(elegida).not.toHaveBeenCalled();
    expect(peticiones().some((p) => p.startsWith('POST'))).toBe(false);
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
