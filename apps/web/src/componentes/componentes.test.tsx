import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { Boton, EnlaceBoton } from './Boton';
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
        <EnlaceBoton a="/x">Dos</EnlaceBoton>
        <EstadoVacio titulo="Vacío">Texto</EstadoVacio>
        <EstadoError mensaje="Falló" alReintentar={() => {}} />
        <Esqueleto etiqueta="Cargando" />
      </MemoryRouter>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
