import { render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { clienteFalso, envolver, responderJson } from '../pruebas/utilidades';
import { Rutas } from '../rutas';
import type { UsuarioSesion } from '../sesion/cliente-auth';
import { RequiereRol } from './RequiereRol';

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'u1',
  username: 'x',
  nombre: 'Ana Pérez',
  rol,
});

const pantalla = (usuario: UsuarioSesion | null) =>
  render(
    envolver(
      <Routes>
        <Route
          path="/consola/x"
          element={
            <RequiereRol roles={['ADMIN']}>
              <p>herramienta</p>
            </RequiereRol>
          }
        />
        <Route path="/entrar" element={<p>pantalla de entrar</p>} />
      </Routes>,
      '/consola/x',
      clienteFalso(usuario),
    ),
  );

it('sin sesión lleva a Entrar', async () => {
  pantalla(null);
  expect(await screen.findByText('pantalla de entrar')).toBeInTheDocument();
});

it('con un rol sin permiso dice que no tiene acceso', async () => {
  pantalla(persona('OPERADOR'));
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('No tienes acceso');
  expect(screen.queryByText('herramienta')).not.toBeInTheDocument();
});

it('con el rol permitido muestra la herramienta', async () => {
  pantalla(persona('ADMIN'));
  expect(await screen.findByText('herramienta')).toBeInTheDocument();
});

it('en la consola la barra inferior marca «Más»', async () => {
  responderJson({ total: 0, pagina: 1, porPagina: 20, registros: [] });
  render(envolver(<Rutas />, '/consola/bitacora', clienteFalso(persona('ADMIN'))));
  expect(await screen.findByRole('link', { name: 'Más' })).toHaveAttribute('aria-current', 'page');
});
