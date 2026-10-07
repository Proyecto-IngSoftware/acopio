import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, cuerpoDe, envolver, responderSegun } from '../../pruebas/utilidades';
import { leerCategorias, leerNoRecibir, leerSaldos } from '../../sin-conexion/datos-locales';
import { ACOPIO, SALDOS } from './datos-prueba';
import { EntradaRapida } from './EntradaRapida';

// La cámara «lee» este código apenas se abre (ver Escaner.test.tsx)
vi.mock('./camara', () => ({
  abrirCamara: async (_video: unknown, alLeer: (codigo: string) => void) => {
    setTimeout(() => alLeer('7702001045231'), 0);
    return () => {};
  },
}));
const BOTELLA = {
  ean: '7702001045231',
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

const OPERADOR = {
  id: 'o',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const busqueda = [
  {
    id: 'c2',
    nombre: 'Arroz',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: true,
    puntaje: 0.9,
  },
  {
    id: 'c3',
    nombre: 'Pañal adulto',
    grupo: 'ADULTO_MAYOR',
    unidadBase: 'UNIDAD',
    perecedero: false,
    puntaje: 0.8,
  },
];
const resultado = (cantidad: number, saldo: number) => ({
  movimiento: {
    id: 'm1',
    tipo: 'ENTRADA',
    categoriaId: 'c3',
    cantidad,
    signo: 1,
    motivoSalida: null,
    nota: null,
    motivo: null,
    venceEn: null,
    ocurridoEn: '2026-10-01T15:00:00.000Z',
    registradoEn: '2026-10-01T15:00:00.000Z',
    origenOffline: false,
  },
  saldo,
  noRecibe: false,
});

const pantalla = (extra: Record<string, unknown> = {}) => {
  const mapa: Record<string, unknown> = {
    'GET /api/categorias/buscar': busqueda,
    'GET /api/acopios/x1/saldos': SALDOS,
    'GET /api/acopios/x1/no-recibir': [],
    'GET /api/acopios/x1': ACOPIO,
    'POST /api/acopios/x1/entradas': resultado(24, 336),
    ...extra,
  };
  // Una clave en undefined se quita: esa ruta responde 404
  responderSegun(Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== undefined)));
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/entrada" element={<EntradaRapida />} />
      </Routes>,
      '/consola/acopios/x1/entrada',
      clienteFalso(OPERADOR),
    ),
  );
};

const elegir = async (texto: string, nombre: RegExp) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), texto);
  await userEvent.click(await screen.findByRole('button', { name: nombre }));
};
const teclear = async (...teclas: string[]) => {
  const teclado = screen.getByRole('group', { name: 'Teclado numérico' });
  for (const t of teclas) await userEvent.click(within(teclado).getByRole('button', { name: t }));
};

describe('C4 Entrada rápida', () => {
  it('elegir otra categoría limpia la fecha de vencimiento (P-038)', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await userEvent.type(screen.getByLabelText('Vence el'), '2026-12-01');

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await elegir('arroz', /Arroz/);

    expect(screen.getByLabelText('Vence el')).toHaveValue('');
  });

  it('pide el teclado numérico en unidades y el decimal en kilos (P-038)', async () => {
    pantalla();
    await elegir('pañal', /Pañal adulto/);
    expect(screen.getByLabelText('Cantidad')).toHaveAttribute('inputmode', 'numeric');

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await elegir('arroz', /Arroz/);
    expect(screen.getByLabelText('Cantidad')).toHaveAttribute('inputmode', 'decimal');
  });

  it('al abrir con red guarda la copia local para capturar sin conexión', async () => {
    const vigentes = [{ id: 'c2', nombre: 'Arroz' }];
    const noRecibe = [{ categoriaId: 'c9', hasta: null }];
    pantalla({
      'GET /api/categorias/vigentes': vigentes,
      'GET /api/acopios/x1/no-recibir': noRecibe,
    });

    await waitFor(async () => expect((await leerSaldos('x1'))?.saldos).toEqual(SALDOS));
    await waitFor(async () => expect(await leerNoRecibir('x1')).toEqual(noRecibe));
    await waitFor(async () => expect(await leerCategorias()).toEqual(vigentes));
  });

  it('arriba ofrece «Recibir por folio», que lleva a recibir en este acopio', async () => {
    pantalla();
    const folio = await screen.findByRole('link', { name: /Recibir por folio/ });
    expect(folio).toHaveAttribute('href', '/consola/acopios/x1/recibir');
    expect(folio).toHaveTextContent('Escanea o escribe el folio');
  });

  it('busca la categoría y muestra su saldo actual y su unidad', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    const elegida = screen.getByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Pañal adulto');
    expect(elegida).toHaveTextContent('Saldo actual: 312 und.');
  });

  it('en una categoría por unidades no ofrece la coma y una cantidad con decimales no se registra', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    const teclado = screen.getByRole('group', { name: 'Teclado numérico' });
    expect(within(teclado).queryByRole('button', { name: ',' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Cantidad'), '2,5');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('2,5');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'En unidades, la cantidad va sin decimales.',
    );
    expect(screen.getByRole('button', { name: /Registrar/ })).toBeDisabled();
  });

  it('el punto escrito con el teclado del equipo cuenta como coma', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await userEvent.type(screen.getByLabelText('Cantidad'), '2.5');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('2,5');
    expect(screen.getByRole('button', { name: /Registrar 2,5 kg/ })).toBeInTheDocument();
  });

  it('con un código que trae contenido cuenta presentaciones y registra el total', async () => {
    pantalla({
      'GET /api/codigos-barras/7702001045231': BOTELLA,
      'POST /api/acopios/x1/entradas': resultado(7.2, 47.2),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Agua potable');
    expect(elegida).toHaveTextContent('Leído: 7702001045231 · cada una trae 0,6 L');
    await teclear('1', '2');
    expect(screen.getByText('12 × 0,6 L = 7,2 L')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 7,2 L' }));
    await screen.findByText(/Agua potable: 47,2 L/);
    expect(await cuerpoDe('POST /api/acopios/x1/entradas')).toMatchObject({
      categoriaId: 'c1',
      cantidad: 7.2,
    });
  });

  it('«Escribir en litros» vuelve a la cantidad en la unidad base', async () => {
    pantalla({ 'GET /api/codigos-barras/7702001045231': BOTELLA });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    await screen.findByRole('region', { name: 'Categoría elegida' });
    await teclear('3');
    await userEvent.click(screen.getByRole('button', { name: 'Escribir en litros' }));
    expect(screen.queryByText(/× 0,6 L/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad')).toHaveValue('');
    await teclear('5');
    expect(screen.getByRole('button', { name: 'Registrar 5 L' })).toBeEnabled();
  });

  it('registra con el teclado de la pantalla, muestra el saldo resultante y queda lista para otra', async () => {
    pantalla();
    await elegir('panal', /Pañal adulto/);
    await teclear('2', '4');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('24');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 24 und.' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Pañal adulto: 336 und.');
    const cuerpo = (await cuerpoDe('POST /api/acopios/x1/entradas')) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ categoriaId: 'c3', cantidad: 24 });
    expect(cuerpo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.queryByRole('region', { name: 'Categoría elegida' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toHaveValue('');
  });

  it('la coma es el separador decimal y borrar quita la última cifra', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await teclear('1', '2', ',', '5', '7', 'Borrar');
    expect(screen.getByLabelText('Cantidad')).toHaveValue('12,5');
  });

  it('un perecedero pide la fecha de vencimiento antes de registrar y la envía', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await teclear('2', '5');
    expect(screen.getByRole('button', { name: 'Registrar 25 kg' })).toBeDisabled();
    expect(screen.getByText('Indica la fecha de vencimiento')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Vence el'), '2026-10-30');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 25 kg' }));
    await screen.findByRole('status');
    expect(await cuerpoDe('POST /api/acopios/x1/entradas')).toMatchObject({
      cantidad: 25,
      venceEn: '2026-10-30',
    });
  });

  it('si la categoría no se recibe, avisa y deja registrar igual', async () => {
    pantalla({
      'GET /api/acopios/x1/no-recibir': [
        {
          categoriaId: 'c3',
          categoria: 'Pañal adulto',
          hasta: null,
          marcadoEn: '2026-10-01T10:00:00.000Z',
        },
      ],
    });
    await elegir('panal', /Pañal adulto/);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este acopio marcó «no recibir» para Pañal adulto',
    );
    await teclear('3');
    expect(screen.getByRole('button', { name: 'Registrar 3 und.' })).toBeEnabled();
  });

  it('un error de la API se muestra y conserva lo escrito', async () => {
    pantalla({
      'POST /api/acopios/x1/entradas': undefined,
    });
    await elegir('panal', /Pañal adulto/);
    await teclear('5');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 5 und.' }));
    expect(await screen.findByText('No existe')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad')).toHaveValue('5');
  });

  it('no tiene violaciones graves', async () => {
    const { container } = pantalla();
    await elegir('panal', /Pañal adulto/);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
