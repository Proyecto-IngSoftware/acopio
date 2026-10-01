import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { ACOPIO, SALDOS } from './datos-prueba';
import { Inventario } from './Inventario';

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'u',
  username: 'u',
  nombre: 'Daniela Méndez',
  rol,
});

const pantalla = (rol: UsuarioSesion['rol'] = 'OPERADOR', saldos = SALDOS) => {
  responderSegun({ 'GET /api/acopios/x1/saldos': saldos, 'GET /api/acopios/x1': ACOPIO });
  return render(
    envolver(
      <Routes>
        <Route path="/consola/acopios/:id/inventario" element={<Inventario />} />
      </Routes>,
      '/consola/acopios/x1/inventario',
      clienteFalso(persona(rol)),
    ),
  );
};

const nombres = () =>
  within(screen.getByRole('list', { name: 'Categorías' }))
    .getAllByRole('link')
    .map((l) => l.querySelector('[data-categoria]')?.textContent);

describe('C3 Inventario', () => {
  it('ordena por lo más urgente y resume por estado', async () => {
    pantalla();
    expect(await screen.findByRole('heading', { name: 'Inventario' })).toBeInTheDocument();
    expect(await screen.findByText('Coliseo El Salitre · 5 categorías')).toBeInTheDocument();
    expect(nombres()).toEqual([
      'Agua potable',
      'Arroz',
      'Ropa de abrigo',
      'Pañal adulto',
      'Jabón de baño',
    ]);
    const resumen = screen.getByRole('list', { name: 'Resumen' });
    expect(resumen).toHaveTextContent('1 bajo el mínimo');
    expect(resumen).toHaveTextContent('1 cerca del mínimo');
    expect(resumen).toHaveTextContent('1 sobre el máximo');
  });

  it('ordena por nombre y por lo que lleva más tiempo sin movimiento', async () => {
    pantalla();
    await screen.findByText('Agua potable');
    await userEvent.click(screen.getByRole('radio', { name: 'Nombre' }));
    expect(nombres()).toEqual([
      'Agua potable',
      'Arroz',
      'Jabón de baño',
      'Pañal adulto',
      'Ropa de abrigo',
    ]);
    await userEvent.click(screen.getByRole('radio', { name: 'Sin movimiento' }));
    expect(nombres()).toEqual([
      'Jabón de baño',
      'Ropa de abrigo',
      'Pañal adulto',
      'Agua potable',
      'Arroz',
    ]);
  });

  it('cada fila muestra saldo, estado y vencimiento estimado, y abre su historial', async () => {
    pantalla();
    const arroz = (await screen.findByText('Arroz')).closest('a')!;
    expect(arroz).toHaveAttribute('href', '/consola/acopios/x1/inventario/c2');
    expect(arroz).toHaveTextContent('120 kg');
    expect(arroz).toHaveTextContent('Cerca del mínimo');
    expect(arroz).toHaveTextContent('Vence primero: 40 kg el 12 de octubre');
  });

  it('el Operador tiene el botón a la entrada rápida; el Auditor no', async () => {
    const { unmount } = pantalla('OPERADOR');
    expect(await screen.findByRole('link', { name: /Entrada rápida/ })).toHaveAttribute(
      'href',
      '/consola/acopios/x1/entrada',
    );
    unmount();
    pantalla('AUDITOR');
    await screen.findByText('Agua potable');
    expect(screen.queryByRole('link', { name: /Entrada rápida/ })).not.toBeInTheDocument();
  });

  it('sin inventario dice qué aparecerá y cómo empezar', async () => {
    pantalla('OPERADOR', []);
    expect(await screen.findByText('Todavía no hay inventario')).toBeInTheDocument();
  });

  it('no tiene violaciones graves', async () => {
    const { container } = pantalla();
    await screen.findByText('Agua potable');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
