import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { Boton, EnlaceBoton } from './Boton';
import { ChipsEstado } from './ChipsEstado';
import { Esqueleto } from './Esqueleto';
import { EstadoError } from './EstadoError';
import { EstadoVacio } from './EstadoVacio';

describe('Boton', () => {
  it('responde al clic y a la tecla Enter', async () => {
    const alPulsar = vi.fn();
    render(<Boton onClick={alPulsar}>Reintentar</Boton>);
    const boton = screen.getByRole('button', { name: 'Reintentar' });
    await userEvent.click(boton);
    boton.focus();
    await userEvent.keyboard('{Enter}');
    expect(alPulsar).toHaveBeenCalledTimes(2);
  });

  it('por defecto es type="button", para no enviar formularios sin querer', () => {
    render(<Boton>Guardar</Boton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('ocupado: inhabilitado, anuncia que trabaja y no responde al clic', async () => {
    const alPulsar = vi.fn();
    render(
      <Boton ocupado onClick={alPulsar}>
        Guardar
      </Boton>,
    );
    const boton = screen.getByRole('button', { name: 'Guardar' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(boton);
    expect(alPulsar).not.toHaveBeenCalled();
  });

  it('inhabilitado usa relleno sólido y no transparencia', () => {
    render(<Boton disabled>Guardar</Boton>);
    const clases = screen.getByRole('button').className;
    expect(clases).toContain('disabled:bg-surface-container-high');
    expect(clases).not.toContain('opacity');
  });

  it('compacto mide 40 px de alto', () => {
    render(<Boton tamano="compacto">Reservar</Boton>);
    const clases = screen.getByRole('button').className;
    expect(clases).toContain('min-h-[40px]');
    expect(clases).not.toContain('min-h-[48px]');
  });

  it('EnlaceBoton navega a su ruta', () => {
    render(
      <MemoryRouter>
        <EnlaceBoton a="/mapa">Ver el mapa</EnlaceBoton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Ver el mapa' })).toHaveAttribute('href', '/mapa');
  });
});

describe('estados', () => {
  it('EstadoVacio muestra título y explicación', () => {
    render(<EstadoVacio titulo="Sin jornadas">Todavía no hay jornadas publicadas.</EstadoVacio>);
    expect(screen.getByText('Sin jornadas')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay jornadas publicadas.')).toBeInTheDocument();
  });

  it('EstadoError se anuncia como alerta y permite reintentar', async () => {
    const alReintentar = vi.fn();
    render(<EstadoError mensaje="No hay conexión" alReintentar={alReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(alReintentar).toHaveBeenCalledTimes(1);
  });

  it('Esqueleto avisa a los lectores de pantalla que está cargando', () => {
    render(<Esqueleto etiqueta="Cargando emergencias" />);
    expect(screen.getByRole('status', { name: 'Cargando emergencias' })).toBeInTheDocument();
  });

  it('ninguno tiene violaciones graves de accesibilidad', async () => {
    const { container } = render(
      <MemoryRouter>
        <Boton>Uno</Boton>
        <Boton ocupado>Tres</Boton>
        <EnlaceBoton a="/x">Dos</EnlaceBoton>
        <EstadoVacio titulo="Vacío">Texto</EstadoVacio>
        <EstadoError mensaje="Falló" alReintentar={() => {}} />
        <Esqueleto etiqueta="Cargando" />
      </MemoryRouter>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('ChipsEstado', () => {
  const opciones = [
    { valor: 'todos' as const, texto: 'Todos', cuenta: 3 },
    { valor: 'falta' as const, texto: 'Falta', cuenta: 1, punto: 'bg-secondary-container' },
    { valor: 'sobra' as const, texto: 'De sobra', cuenta: 0, punto: 'bg-tertiary-container' },
  ];

  it('no dibuja un chip con 0 y marca el elegido', async () => {
    const alCambiar = vi.fn();
    render(
      <ChipsEstado etiqueta="Filtrar" valor="todos" alCambiar={alCambiar} opciones={opciones} />,
    );
    expect(screen.getByRole('button', { name: 'Todos 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Falta 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByRole('button', { name: /De sobra/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Falta 1' }));
    expect(alCambiar).toHaveBeenCalledWith('falta');
  });

  it('el elegido se dibuja aunque cuente 0', () => {
    render(
      <ChipsEstado etiqueta="Filtrar" valor="sobra" alCambiar={vi.fn()} opciones={opciones} />,
    );
    expect(screen.getByRole('button', { name: 'De sobra 0' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('el primero, que quita el filtro, se dibuja aunque cuente 0', () => {
    const sinNada = opciones.map((o) => ({ ...o, cuenta: 0 }));
    render(<ChipsEstado etiqueta="Filtrar" valor="sobra" alCambiar={vi.fn()} opciones={sinNada} />);
    expect(screen.getByRole('button', { name: 'Todos 0' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.queryByRole('button', { name: /Falta/ })).not.toBeInTheDocument();
  });
});
