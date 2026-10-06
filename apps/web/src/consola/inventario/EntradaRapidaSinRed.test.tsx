import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import type { Categoria, CodigoBarras } from '../../api/catalogo';
import { clienteFalso, envolver } from '../../pruebas/utilidades';
import { encolar, listarCola } from '../../sin-conexion/cola';
import {
  guardarCategorias,
  guardarCodigoVisto,
  guardarNoRecibir,
  guardarSaldos,
} from '../../sin-conexion/datos-locales';
import { SALDOS } from './datos-prueba';
import { EntradaRapida } from './EntradaRapida';

// La cámara «lee» este código apenas se abre (ver Escaner.test.tsx)
const leida = vi.hoisted(() => ({ ean: '7702001045231' }));
vi.mock('./camara', () => ({
  abrirCamara: async (_video: unknown, alLeer: (codigo: string) => void) => {
    setTimeout(() => alLeer(leida.ean), 0);
    return () => {};
  },
}));

const OPERADORA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const categoria = (c: Partial<Categoria>): Categoria => ({
  id: 'c0',
  nombre: 'Categoría',
  grupo: 'ALIMENTOS',
  unidadBase: 'UNIDAD',
  perecedero: false,
  sinonimos: [],
  archivada: false,
  ...c,
});
const VIGENTES = [
  categoria({ id: 'c3', nombre: 'Pañal adulto', grupo: 'ADULTO_MAYOR' }),
  categoria({ id: 'c1', nombre: 'Agua potable', grupo: 'AGUA_Y_BEBIDAS', unidadBase: 'LITRO' }),
];
const BOTELLA = {
  ean: '7702001045231',
  categoriaId: 'c1',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  contenido: 0.6,
  grupo: 'AGUA_Y_BEBIDAS',
  perecedero: false,
} as unknown as CodigoBarras;

/** Sin red: el navegador lo dice y cualquier petición falla (src/pruebas/preparar.ts). */
const sinRed = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

async function copiaLocal() {
  await guardarCategorias(VIGENTES);
  await guardarSaldos('x1', SALDOS, new Date('2026-10-05T14:58:00Z'));
  await guardarNoRecibir('x1', []);
}

const pantalla = () =>
  render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/entrada" element={<EntradaRapida />} />
      </Routes>,
      '/consola/acopios/x1/entrada',
      clienteFalso(OPERADORA),
    ),
  );

const elegir = async (texto: string, nombre: RegExp) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Categoría' }), texto);
  await userEvent.click(await screen.findByRole('button', { name: nombre }));
};

const teclear = async (...teclas: string[]) => {
  const teclado = screen.getByRole('group', { name: 'Teclado numérico' });
  for (const t of teclas) await userEvent.click(within(teclado).getByRole('button', { name: t }));
};

describe('C4 sin conexión', () => {
  it('avisa que las entradas se guardan en el teléfono', async () => {
    sinRed();
    await copiaLocal();
    pantalla();

    expect(
      await screen.findByText(/Las entradas se guardan en este teléfono y se envían solas/),
    ).toBeInTheDocument();
  });

  it('busca en la copia del teléfono sin tildes ni mayúsculas', async () => {
    sinRed();
    await copiaLocal();
    pantalla();

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Categoría' }), 'PANAL');

    expect(await screen.findByRole('button', { name: /Pañal adulto/ })).toBeInTheDocument();
    expect(screen.getByText('Busca en la copia guardada en el teléfono')).toBeInTheDocument();
  });

  it('muestra el saldo estimado: el último conocido más lo que espera en la cola', async () => {
    sinRed();
    await copiaLocal();
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c3', cantidad: 8 });
    await encolar('u1', 'otro', { id: 'e2', categoriaId: 'c3', cantidad: 50 });
    pantalla();

    await elegir('pañal', /Pañal adulto/);

    const tarjeta = screen.getByRole('region', { name: 'Categoría elegida' });
    await waitFor(() => expect(tarjeta).toHaveTextContent('Saldo estimado: 320 und.'));
    expect(tarjeta).toHaveTextContent(/Último saldo conocido, de las .+, más 1 entrada sin enviar/);
  });

  it('guarda la entrada en la cola del teléfono y no llama a la API', async () => {
    sinRed();
    await copiaLocal();
    pantalla();

    await elegir('pañal', /Pañal adulto/);
    await teclear('2', '4');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar 24 und. en el teléfono' }));

    expect(
      await screen.findByText('Pañal adulto: 24 und. guardadas en el teléfono'),
    ).toBeInTheDocument();
    const cola = await listarCola('u1');
    expect(cola).toHaveLength(1);
    expect(cola[0]).toMatchObject({ acopioId: 'x1', cuerpo: { categoriaId: 'c3', cantidad: 24 } });
    expect(globalThis.fetch).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' }));
  });

  it('con «no recibir» guardado avisa igual que con red', async () => {
    sinRed();
    await copiaLocal();
    await guardarNoRecibir('x1', [{ categoriaId: 'c3', hasta: null } as never]);
    pantalla();

    await elegir('pañal', /Pañal adulto/);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'marcó «no recibir» para Pañal adulto',
    );
  });

  it('si el navegador cree tener red pero la API no responde, se porta como sin red', async () => {
    await copiaLocal();
    pantalla();

    await elegir('pañal', /Pañal adulto/);
    await teclear('5');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar 5 und. en el teléfono' }));

    await waitFor(async () => expect(await listarCola('u1')).toHaveLength(1));
  });

  it('si la red se cae justo al registrar, la entrada va a la cola', async () => {
    await copiaLocal();
    // Las consultas responden; el POST de la entrada no llega
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada) => {
      const p = entrada as Request;
      const ruta = new URL(p.url).pathname;
      if (p.method === 'POST') throw new TypeError('Failed to fetch');
      if (ruta.endsWith('/saldos')) return Response.json(SALDOS);
      if (ruta.endsWith('/buscar'))
        return Response.json([
          {
            id: 'c3',
            nombre: 'Pañal adulto',
            grupo: 'ADULTO_MAYOR',
            unidadBase: 'UNIDAD',
            perecedero: false,
            puntaje: 1,
          },
        ]);
      return Response.json([]);
    });
    pantalla();

    await elegir('pañal', /Pañal adulto/);
    await teclear('5');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar 5 und.' }));

    expect(
      await screen.findByText('Pañal adulto: 5 und. guardadas en el teléfono'),
    ).toBeInTheDocument();
    expect(await listarCola('u1')).toHaveLength(1);
    expect(screen.queryByText(/No pudimos conectar/)).not.toBeInTheDocument();
  });

  it('el escáner reconoce sin red un código que este teléfono ya vio', async () => {
    sinRed();
    await copiaLocal();
    await guardarCodigoVisto(BOTELLA);
    pantalla();

    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));

    const tarjeta = await screen.findByRole('region', { name: 'Categoría elegida' });
    expect(tarjeta).toHaveTextContent('Agua potable');
    expect(tarjeta).toHaveTextContent('Leído: 7702001045231');
  });

  it('sin red, un código que el teléfono no conoce no se aprende', async () => {
    sinRed();
    await copiaLocal();
    pantalla();

    await userEvent.click(await screen.findByRole('button', { name: 'Escanear' }));

    expect(
      await screen.findByText(/Sin conexión, Acopio no aprende códigos nuevos/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Código nuevo' })).not.toBeInTheDocument();
  });
});
