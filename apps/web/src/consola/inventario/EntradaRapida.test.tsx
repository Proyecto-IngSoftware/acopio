import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
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

  it('«500» en g registra 0,5 kg', async () => {
    pantalla({ 'POST /api/acopios/x1/entradas': resultado(0.5, 120.5) });
    await elegir('arroz', /Arroz/);
    await userEvent.click(screen.getByRole('radio', { name: 'g' }));
    await teclear('5', '0', '0');
    expect(screen.getByText('Se registran 0,5 kg')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Vence el'), '2026-10-30');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 0,5 kg' }));
    await screen.findByRole('status');
    expect(await cuerpoDe('POST /api/acopios/x1/entradas')).toMatchObject({ cantidad: 0.5 });
  });

  it('«0,5» en g avisa y no deja registrar', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await userEvent.click(screen.getByRole('radio', { name: 'g' }));
    await teclear('0', ',', '5');
    await userEvent.type(screen.getByLabelText('Vence el'), '2026-10-30');
    expect(screen.getByRole('alert')).toHaveTextContent('En g, la cantidad va sin decimales');
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
  });

  it('«10001» kg avisa el tope de la línea y no deja registrar', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await teclear('1', '0', '0', '0', '1');
    await userEvent.type(screen.getByLabelText('Vence el'), '2026-10-30');
    expect(screen.getByRole('alert')).toHaveTextContent('Una línea llega hasta 10.000 kg');
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDisabled();
  });

  it('2000 paquetes de 7,2 L pasan el tope de la línea: avisa y no deja registrar', async () => {
    pantalla({ 'GET /api/codigos-barras/7702001045231': { ...BOTELLA, contenido: 7.2 } });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    await screen.findByRole('region', { name: 'Categoría elegida' });
    await teclear('2', '0', '0', '0');
    expect(screen.getByRole('alert')).toHaveTextContent('Una línea llega hasta 10.000 L');
    expect(screen.getByRole('button', { name: /^Registrar/ })).toBeDisabled();
  });

  it('con un código que trae presentación no hay selector de unidad', async () => {
    pantalla({ 'GET /api/codigos-barras/7702001045231': BOTELLA });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(screen.queryByRole('radio', { name: 'ml' })).not.toBeInTheDocument();
  });

  it('elegir otra categoría vuelve la unidad a kg', async () => {
    pantalla();
    await elegir('arroz', /Arroz/);
    await userEvent.click(screen.getByRole('radio', { name: 'g' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    await elegir('arroz', /Arroz/);
    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked();
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

describe('C4 con códigos de presentaciones', () => {
  const EAN = '7702001045231';
  const desconocido = conEstado(404, {
    estado: 404,
    codigo: 'EAN_DESCONOCIDO',
    mensaje: 'Este código no está asociado a ninguna categoría',
  });
  const SUELTA = {
    id: 'pa',
    categoriaId: 'c2',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    nombre: 'Bolsa de arroz 500 g',
    clase: 'SUELTA',
    tamano: 0.5,
    contieneId: null,
    unidades: null,
    estado: 'VALIDADO',
    codigos: 0,
  };
  const PROPUESTO = {
    ...BOTELLA,
    estado: 'PROPUESTO',
    presentacion: { id: 'p1', nombre: 'Botella de agua 600 ml', tamano: 0.6 },
  };
  const elegirArrozEnHoja = async () => {
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Arroz/ }));
    await userEvent.click(await within(hoja).findByRole('radio', { name: 'Bolsa de arroz 500 g' }));
    return hoja;
  };

  it('«Solo guardar el código» asocia y vuelve a la búsqueda sin pedir cantidad', async () => {
    pantalla({
      [`GET /api/codigos-barras/${EAN}`]: desconocido,
      'GET /api/presentaciones': [SUELTA],
      'POST /api/codigos-barras': { ...BOTELLA, estado: 'VALIDADO' },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const hoja = await elegirArrozEnHoja();
    await userEvent.click(within(hoja).getByRole('button', { name: 'Solo guardar el código' }));
    expect(await cuerpoDe('POST /api/codigos-barras')).toEqual({ ean: EAN, presentacionId: 'pa' });
    expect(await screen.findByText(/Código guardado/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Categoría elegida' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Categoría' })).toBeInTheDocument();
  });

  it('sin red no ofrece «Solo guardar el código»', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    pantalla({ [`GET /api/codigos-barras/${EAN}`]: desconocido });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const hoja = await screen.findByRole('dialog', { name: 'Código nuevo' });
    expect(within(hoja).getByRole('button', { name: 'Asociar y seguir' })).toBeInTheDocument();
    expect(
      within(hoja).queryByRole('button', { name: 'Solo guardar el código' }),
    ).not.toBeInTheDocument();
  });

  it('un código propuesto se confirma antes de pedir la cantidad', async () => {
    pantalla({
      [`GET /api/codigos-barras/${EAN}`]: PROPUESTO,
      [`POST /api/codigos-barras/${EAN}/validar`]: { ...PROPUESTO, estado: 'VALIDADO' },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const hoja = await screen.findByRole('dialog', { name: 'Confirma el código' });
    expect(hoja).toHaveTextContent('Agua potable');
    expect(hoja).toHaveTextContent('Botella de agua 600 ml');
    expect(screen.queryByRole('region', { name: 'Categoría elegida' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cantidad')).toHaveValue('');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Es correcto' }));
    expect(await cuerpoDe(`POST /api/codigos-barras/${EAN}/validar`)).toEqual({
      presentacionId: 'p1',
    });
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Agua potable');
  });

  it('«Corregir» valida el código con la presentación que se elija', async () => {
    pantalla({
      [`GET /api/codigos-barras/${EAN}`]: PROPUESTO,
      'GET /api/presentaciones': [SUELTA],
      [`POST /api/codigos-barras/${EAN}/validar`]: { ...PROPUESTO, estado: 'VALIDADO' },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const confirma = await screen.findByRole('dialog', { name: 'Confirma el código' });
    await userEvent.click(within(confirma).getByRole('button', { name: 'Corregir' }));
    const hoja = await screen.findByRole('dialog', { name: 'Corregir el código' });
    expect(screen.queryByRole('region', { name: 'Categoría elegida' })).not.toBeInTheDocument();
    await userEvent.click(within(hoja).getByRole('button', { name: 'Cambiar' }));
    await userEvent.type(within(hoja).getByRole('searchbox', { name: 'Categoría' }), 'arroz');
    await userEvent.click(await within(hoja).findByRole('button', { name: /Arroz/ }));
    await userEvent.click(await within(hoja).findByRole('radio', { name: 'Bolsa de arroz 500 g' }));
    await userEvent.click(within(hoja).getByRole('button', { name: 'Confirmar y seguir' }));
    expect(await cuerpoDe(`POST /api/codigos-barras/${EAN}/validar`)).toEqual({
      presentacionId: 'pa',
    });
    expect(peticiones().filter((p) => p === 'POST /api/codigos-barras')).toEqual([]);
    expect(await screen.findByRole('region', { name: 'Categoría elegida' })).toHaveTextContent(
      'Arroz',
    );
  });

  /** El primer GET del código responde lo de la hoja; los siguientes, lo ya confirmado. */
  const luegoConfirmado = (refrescado: unknown) => {
    const base = vi.mocked(globalThis.fetch).getMockImplementation()!;
    let lecturas = 0;
    vi.mocked(globalThis.fetch).mockImplementation((entrada, init) => {
      const p = entrada as Request;
      if (p.method === 'GET' && p.url.endsWith(`/api/codigos-barras/${EAN}`) && ++lecturas > 1)
        return Promise.resolve(
          new Response(JSON.stringify(refrescado), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      return base(entrada, init);
    });
  };
  const YA_VALIDADO = conEstado(409, {
    estado: 409,
    codigo: 'CODIGO_YA_VALIDADO',
    mensaje: 'El código ya está validado',
  });
  const ARROZ_VALIDADO = {
    ...BOTELLA,
    categoriaId: 'c2',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    contenido: 0.5,
    estado: 'VALIDADO',
    presentacion: { id: 'pa', nombre: 'Bolsa de arroz 500 g', tamano: 0.5 },
  };

  it('«Es correcto» con el código ya confirmado por otro sigue con lo que quedó guardado', async () => {
    pantalla({
      [`GET /api/codigos-barras/${EAN}`]: PROPUESTO,
      [`POST /api/codigos-barras/${EAN}/validar`]: YA_VALIDADO,
    });
    luegoConfirmado(ARROZ_VALIDADO);
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const hoja = await screen.findByRole('dialog', { name: 'Confirma el código' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Es correcto' }));
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Arroz');
    expect(elegida).toHaveTextContent('cada una trae 0,5 kg');
    expect(elegida).toHaveTextContent('Otro operador ya lo había confirmado');
  });

  it('«Corregir» con el código ya confirmado por otro sigue con lo que quedó guardado', async () => {
    pantalla({
      [`GET /api/codigos-barras/${EAN}`]: PROPUESTO,
      'GET /api/presentaciones': [SUELTA],
      [`POST /api/codigos-barras/${EAN}/validar`]: YA_VALIDADO,
    });
    luegoConfirmado(ARROZ_VALIDADO);
    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));
    const confirma = await screen.findByRole('dialog', { name: 'Confirma el código' });
    await userEvent.click(within(confirma).getByRole('button', { name: 'Corregir' }));
    const hoja = await screen.findByRole('dialog', { name: 'Corregir el código' });
    await userEvent.click(await within(hoja).findByRole('radio', { name: 'Bolsa de arroz 500 g' }));
    await userEvent.click(within(hoja).getByRole('button', { name: 'Confirmar y seguir' }));
    const elegida = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(elegida).toHaveTextContent('Arroz');
    expect(elegida).toHaveTextContent('Otro operador ya lo había confirmado');
  });
});
