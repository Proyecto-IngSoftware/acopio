import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Emergencia } from '../api/emergencias';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { envolver, responderError, responderJson } from '../pruebas/utilidades';
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
  motivoCierre: [],
  ...datos,
});
const DOS = [
  emergencia({ id: 'a', nombre: 'Sismo en Caldas' }),
  emergencia({ id: 'b', nombre: 'Inundación en La Mojana', estado: 'EN_SEGUIMIENTO' }),
];
const FIJOS = ['¿Cómo apoyar?', 'Canal Oficial Sin Intermediación Financiera'];
const TITULO = 'Revisa qué hace falta antes de donar.';

describe('con emergencias', () => {
  it('muestra el título y la primera emergencia en el selector', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(TITULO);
    expect(screen.getByRole('button', { name: /Sismo en Caldas/ })).toBeInTheDocument();
  });

  it('el selector cambia la emergencia mostrada', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await userEvent.click(await screen.findByRole('button', { name: /Sismo en Caldas/ }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Inundación en La Mojana/ }));
    expect(screen.getByRole('button', { name: /Inundación en La Mojana/ })).toHaveTextContent(
      'En seguimiento',
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('respeta la emergencia que viene en la URL', async () => {
    responderJson(DOS);
    render(envolver(<Portada />, '/?emergencia=b'));
    expect(
      await screen.findByRole('button', { name: /Inundación en La Mojana/ }),
    ).toBeInTheDocument();
  });

  it('con un identificador que no existe muestra la primera y no falla', async () => {
    responderJson(DOS);
    render(envolver(<Portada />, '/?emergencia=no-existe'));
    expect(await screen.findByRole('button', { name: /Sismo en Caldas/ })).toBeInTheDocument();
  });

  it('con una sola emergencia el selector no despliega nada', async () => {
    responderJson([DOS[0]]);
    render(envolver(<Portada />));
    const boton = await screen.findByRole('button', { name: /Sismo en Caldas/ });
    expect(boton).not.toHaveAttribute('aria-haspopup');
    await userEvent.click(boton);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('los bloques sin backend explican por qué están vacíos y no inventan datos', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    for (const titulo of [
      /Balance de recepción/i,
      /Jornadas de voluntariado/i,
      /Reporte en terreno/i,
    ]) {
      const bloque = screen.getByRole('region', { name: titulo });
      expect(within(bloque).getByText(/Todavía no/)).toBeInTheDocument();
    }
  });

  it('la pestaña «No traigan» cambia el texto del estado vacío', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/qué insumos escasean/);
    await userEvent.click(screen.getByRole('tab', { name: 'No traigan' }));
    expect(screen.getByRole('tab', { name: 'No traigan' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent(/qué ya sobra/);
  });

  it('el formulario de folio avisa que aún no está disponible y no consulta la API', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    const llamadas = vi.mocked(globalThis.fetch).mock.calls.length;
    await userEvent.type(screen.getByLabelText('Número de folio'), 'ACO-F-0142');
    await userEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(
      screen.getByText('El rastreo por folio todavía no está disponible.'),
    ).toBeInTheDocument();
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(llamadas);
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderJson(DOS);
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

    responderJson(DOS);
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
    responderJson(lista);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'No hay emergencias activas',
    );
    expect(screen.queryByRole('region', { name: /Balance de recepción/i })).not.toBeInTheDocument();
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});
