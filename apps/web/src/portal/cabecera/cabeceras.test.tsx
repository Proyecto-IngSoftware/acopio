import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { api } from '../../api/cliente';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderJson } from '../../pruebas/utilidades';
import { Rutas } from '../../rutas';
import { encolar } from '../../sin-conexion/cola';
import { iniciales } from '../../sesion/roles';

const DANIELA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};

beforeEach(() => responderJson([]));

it('iniciales toma las dos primeras palabras', () => {
  expect(iniciales('Daniela Méndez')).toBe('DM');
  expect(iniciales('  ana  ')).toBe('A');
  expect(iniciales('Juan Carlos Rodríguez')).toBe('JC');
});

it('sin sesión la cabecera ofrece Entrar', async () => {
  render(envolver(<Rutas />, '/'));
  expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
  expect(screen.queryByRole('button', { name: /Cuenta de/ })).not.toBeInTheDocument();
});

it('con sesión muestra las iniciales y no Entrar', async () => {
  render(envolver(<Rutas />, '/', clienteFalso(DANIELA)));
  const boton = await screen.findByRole('button', { name: 'Cuenta de Daniela Méndez' });
  expect(boton).toHaveTextContent('DM');
  expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument();
});

it('el menú de la cuenta muestra nombre y rol, y cierra la sesión', async () => {
  const cliente = clienteFalso(DANIELA);
  render(envolver(<Rutas />, '/', cliente));
  await userEvent.click(await screen.findByRole('button', { name: 'Cuenta de Daniela Méndez' }));
  const menu = screen.getByRole('menu');
  expect(menu).toHaveTextContent('Daniela Méndez');
  expect(menu).toHaveTextContent('Operador');
  await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));
  await waitFor(() => expect(cliente.cerrarSesion).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('link', { name: 'Entrar' })).toBeInTheDocument();
});

it('con entradas sin enviar, el menú de la cuenta pide confirmar antes de cerrar', async () => {
  await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
  const cliente = clienteFalso(DANIELA);
  render(envolver(<Rutas />, '/', cliente));
  await userEvent.click(await screen.findByRole('button', { name: 'Cuenta de Daniela Méndez' }));

  await userEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

  expect(
    await screen.findByRole('dialog', { name: 'Tienes 1 entrada sin enviar' }),
  ).toBeInTheDocument();
  expect(cliente.cerrarSesion).not.toHaveBeenCalled();
});

it('con entradas en la cola la marca queda solo con el logo, para que quepa la pastilla', async () => {
  await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 12 });
  render(envolver(<Rutas />, '/', clienteFalso(DANIELA)));

  await screen.findByRole('link', { name: '1 sin sincronizar' });
  const marca = screen.getByText('Acopio', { selector: 'span' }).parentElement;
  expect(marca).toHaveClass('hidden');
});

it('Escape cierra el menú', async () => {
  render(envolver(<Rutas />, '/', clienteFalso(DANIELA)));
  await userEvent.click(await screen.findByRole('button', { name: 'Cuenta de Daniela Méndez' }));
  expect(screen.getByRole('menu')).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

const Destinos = () => (
  <Routes>
    <Route path="/" element={<p>inicio</p>} />
    <Route path="/entrar" element={<p>pantalla de entrar</p>} />
  </Routes>
);

it('un 401 con sesión cierra la sesión en la web y lleva a Entrar', async () => {
  render(envolver(<Destinos />, '/', clienteFalso(DANIELA)));
  await screen.findByText('inicio');
  await waitFor(() => expect(screen.getByText('inicio')).toBeInTheDocument());
  responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'x' }, 401);
  await api.GET('/api/auth/yo');
  expect(await screen.findByText('pantalla de entrar')).toBeInTheDocument();
});

it('un 401 sin sesión no mueve a nadie del portal', async () => {
  render(envolver(<Destinos />, '/'));
  await screen.findByText('inicio');
  responderJson({ estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'x' }, 401);
  await api.GET('/api/auth/yo');
  expect(screen.getByText('inicio')).toBeInTheDocument();
});

it('la cabecera con el menú abierto no tiene violaciones graves', async () => {
  const { container } = render(envolver(<Rutas />, '/mapa', clienteFalso(DANIELA)));
  await userEvent.click(await screen.findByRole('button', { name: 'Cuenta de Daniela Méndez' }));
  expect(await violacionesGraves(container)).toEqual([]);
});
