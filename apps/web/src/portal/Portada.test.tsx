import { Route, Routes } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Emergencia } from '../api/emergencias';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { jornadaDe } from '../pruebas/datos-turnos';
import { envolver, responderError, responderSegun } from '../pruebas/utilidades';
import { Portada } from './Portada';

const emergencia = (datos: Partial<Emergencia>): Emergencia => ({
  id: 'a',
  nombre: 'Sismo en Caldas',
  tipo: 'sismo',
  inicio: '2026-09-01T00:00:00.000Z',
  horizonteDias: 7,
  estado: 'ACTIVA',
  destacadaHasta: '2026-12-31T00:00:00.000Z',
  cerradaEn: null,
  motivoCierre: null,
  ...datos,
});
const DOS = [
  emergencia({ id: 'a', nombre: 'Sismo en Caldas' }),
  emergencia({ id: 'b', nombre: 'Inundación en La Mojana', estado: 'EN_SEGUIMIENTO' }),
];
const FIJOS = ['¿Cómo apoyar?', 'Canal oficial sin intermediación financiera'];
const TITULO = 'Revisa qué hace falta antes de donar.';
const BALANCE_VACIO = { faltan: [], noTraigan: [] };
/** La portada pide las emergencias y el balance; cada uno con su respuesta. */
const responder = (emergencias: unknown) =>
  responderSegun({
    'GET /api/emergencias': emergencias,
    'GET /api/publico/balance': BALANCE_VACIO,
    'GET /api/turnos/jornadas': [],
  });

describe('con emergencias', () => {
  it('muestra el título y la primera emergencia en el selector', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(TITULO);
    expect(screen.getByRole('button', { name: /Sismo en Caldas/ })).toBeInTheDocument();
  });

  it('el selector cambia la emergencia mostrada', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    await userEvent.click(await screen.findByRole('button', { name: /Sismo en Caldas/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Inundación en La Mojana/ }));
    expect(screen.getByRole('button', { name: /Inundación en La Mojana/ })).toHaveTextContent(
      'En seguimiento',
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('respeta la emergencia que viene en la URL', async () => {
    responder(DOS);
    render(envolver(<Portada />, '/?emergencia=b'));
    expect(
      await screen.findByRole('button', { name: /Inundación en La Mojana/ }),
    ).toBeInTheDocument();
  });

  it('con un identificador que no existe muestra la primera y no falla', async () => {
    responder(DOS);
    render(envolver(<Portada />, '/?emergencia=no-existe'));
    expect(await screen.findByRole('button', { name: /Sismo en Caldas/ })).toBeInTheDocument();
  });

  it('con una sola emergencia el selector no despliega nada', async () => {
    responder([DOS[0]]);
    render(envolver(<Portada />));
    const boton = await screen.findByRole('button', { name: /Sismo en Caldas/ });
    expect(boton).not.toHaveAttribute('aria-haspopup');
    await userEvent.click(boton);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('título con la necesidad del día', () => {
    const agua = { categoriaId: 'c1', categoria: 'Agua potable', acopios: 1 };
    const aseo = { categoriaId: 'c2', categoria: 'Kit de aseo', acopios: 1 };
    const necesidad = (acopioId: string, faltan: { categoriaId: string; categoria: string }[]) => ({
      acopioId,
      faltan,
      sobran: [],
      alDia: [],
      noRecibe: [],
    });
    const con = (balance: unknown, necesidades: unknown) =>
      responderSegun({
        'GET /api/emergencias': DOS,
        'GET /api/publico/balance': balance,
        'GET /api/publico/necesidades': necesidades,
        'GET /api/turnos/jornadas': [],
      });

    it('dice cuántas categorías faltan y en cuántos acopios', async () => {
      con({ faltan: [agua, aseo], noTraigan: [] }, [
        necesidad('x', [agua, aseo]),
        necesidad('y', []),
      ]);
      render(envolver(<Portada />));
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Hoy faltan 2 categorías en 1 acopio.',
        }),
      ).toBeInTheDocument();
    });

    it('con una sola categoría, la frase completa no se corta en la cifra repetida', async () => {
      con({ faltan: [agua], noTraigan: [] }, [necesidad('x', [agua])]);
      const { container } = render(envolver(<Portada />));
      await screen.findByRole('heading', { level: 1, name: 'Hoy falta 1 categoría en 1 acopio.' });
      expect(container.querySelector('h1 [aria-hidden]')).toHaveTextContent(
        'Hoy falta 1 categoría en 1 acopio.',
      );
    });

    it('una categoría baja que el acopio marcó «no recibir» no deja «en 0 acopios»', async () => {
      // El balance la cuenta en faltan; necesidades la pasa a noRecibe
      con({ faltan: [agua], noTraigan: [agua] }, [{ ...necesidad('x', []), noRecibe: [agua] }]);
      render(envolver(<Portada />));
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Hoy ningún acopio reporta faltantes.',
        }),
      ).toBeInTheDocument();
    });

    it('sin faltantes, el título lo dice', async () => {
      con(BALANCE_VACIO, []);
      render(envolver(<Portada />));
      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Hoy ningún acopio reporta faltantes.',
        }),
      ).toBeInTheDocument();
    });

    it('muestra el punto en vivo con el origen de los datos', async () => {
      con(BALANCE_VACIO, []);
      render(envolver(<Portada />));
      expect(await screen.findByText('Datos de los acopios')).toBeInTheDocument();
    });
  });

  it('cada faltante lleva su barra medida contra el mayor', async () => {
    responderSegun({
      'GET /api/emergencias': DOS,
      'GET /api/publico/balance': {
        faltan: [
          { categoriaId: 'c1', categoria: 'Agua potable', acopios: 4 },
          { categoriaId: 'c2', categoria: 'Kit de aseo', acopios: 2 },
        ],
        noTraigan: [],
      },
      'GET /api/turnos/jornadas': [],
    });
    render(envolver(<Portada />));
    const barras = await screen.findAllByRole('meter', { name: /falta en/ });
    expect(barras.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['4', '2']);
    expect(barras.every((b) => b.getAttribute('aria-valuemax') === '4')).toBe(true);
    expect(screen.getByText('Falta en 4 acopios')).toBeInTheDocument();
    // Al cargar solo crecen las barras: las filas no entran escalonadas (nadie filtró nada)
    expect(barras[0]!.closest('li')).not.toHaveClass('entra-lista');
  });

  it('«¿Cómo apoyar?» trae la línea de cada canal', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    expect(
      await screen.findByRole('link', { name: /Donar productos.*Busca el acopio más cercano/ }),
    ).toHaveAttribute('href', '/mapa');
    expect(
      screen.getByRole('link', { name: /Ser voluntario.*Reserva un cupo en una jornada/ }),
    ).toBeInTheDocument();
  });

  it('los vacíos de jornadas y del reporte llevan su ilustración', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    expect(
      await screen.findByRole('img', { name: 'Calendario con una planta que brota' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Mapa de curvas de nivel con un punto marcado' }),
    ).toBeInTheDocument();
  });

  it('sin jornadas ni reportes, sus bloques lo dicen y no inventan datos', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    for (const titulo of [/Jornadas de voluntariado/i, /Reporte en terreno/i]) {
      const bloque = screen.getByRole('region', { name: titulo });
      expect(await within(bloque).findByText(/Todavía no/)).toBeInTheDocument();
    }
  });

  it('las jornadas de voluntariado salen de la API, con el enlace a todas', async () => {
    responderSegun({
      'GET /api/emergencias': DOS,
      'GET /api/publico/balance': BALANCE_VACIO,
      'GET /api/turnos/jornadas': [jornadaDe({ titulo: 'Armar mercados' })],
    });
    render(envolver(<Portada />));
    const bloque = await screen.findByRole('region', { name: /Jornadas de voluntariado/i });
    expect(await within(bloque).findByText('Armar mercados')).toBeInTheDocument();
    expect(within(bloque).getByRole('link', { name: /Ver todas las jornadas/ })).toHaveAttribute(
      'href',
      '/voluntariado',
    );
  });

  it('el balance sin datos lo dice en cada pestaña', async () => {
    responder(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    expect(
      await screen.findByText(/Ningún acopio está por debajo de lo mínimo/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'No traigan' }));
    expect(screen.getByRole('tab', { name: 'No traigan' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/Ningún acopio pide que no le lleven nada/)).toBeInTheDocument();
  });

  it('el formulario de folio lleva al seguimiento de ese folio', async () => {
    responder(DOS);
    render(
      envolver(
        <Routes>
          <Route path="/" element={<Portada />} />
          <Route path="/seguimiento/:folio" element={<p>seguimiento de un folio</p>} />
        </Routes>,
      ),
    );
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByLabelText('Número de folio')).toHaveAttribute(
      'placeholder',
      'ACO-2026-7KQ4M',
    );
    await userEvent.type(screen.getByLabelText('Número de folio'), 'ACO-2026-7KQ4M');
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByText('seguimiento de un folio')).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responder(DOS);
    const { container } = render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('mientras carga', () => {
  it('muestra un esqueleto y el contenido fijo ya está visible', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    render(envolver(<Portada />));
    expect(screen.getByRole('status', { name: 'Cargando emergencias' })).toBeInTheDocument();
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});

describe('si la API falla', () => {
  it('dice qué pasó, deja reintentar y conserva el contenido fijo', async () => {
    responderError();
    render(envolver(<Portada />));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Acopio');
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();

    responder(DOS);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(TITULO);
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderError();
    const { container } = render(envolver(<Portada />));
    await screen.findByRole('alert');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('sin emergencias vigentes', () => {
  it.each([
    ['la lista está vacía', []],
    ['todas están cerradas', [emergencia({ estado: 'CERRADA' })]],
  ])('cuando %s lo dice y no dibuja los bloques que dependen de una', async (_caso, lista) => {
    responder(lista);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'No hay emergencias activas',
    );
    expect(screen.queryByRole('region', { name: /Balance de recepción/i })).not.toBeInTheDocument();
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Cajas de ayuda ordenadas en una bodega' }),
    ).toBeInTheDocument();
  });
});

it('la portada ya no enlaza las otras plataformas en su pie', async () => {
  responder(DOS);
  render(envolver(<Portada />));
  await screen.findByText(TITULO);
  expect(screen.queryByRole('link', { name: /Otras plataformas/ })).not.toBeInTheDocument();
});
