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
  });
});

it('el pie lleva a las otras plataformas que ayudan', async () => {
  responder(DOS);
  render(envolver(<Portada />));
  expect(await screen.findByRole('link', { name: /Otras plataformas que ayudan/ })).toHaveAttribute(
    'href',
    '/plataformas',
  );
});
