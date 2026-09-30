import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import type { UsuarioSesion } from '../sesion/cliente-auth';
import { Mas } from './Mas';

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'u1',
  username: 'j.quintero',
  nombre: 'Joseph Quintero',
  rol,
});

const pantalla = (usuario: UsuarioSesion | null = null) =>
  render(envolver(<Mas />, '/mas', clienteFalso(usuario)));

it('sin sesión muestra las secciones públicas y nada de la consola', async () => {
  pantalla();
  expect(await screen.findByRole('region', { name: 'Tu donación' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Información y transparencia' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Administración' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
});

it('el Administrador ve su cuenta y las tres herramientas', async () => {
  pantalla(persona('ADMIN'));
  const cuenta = await screen.findByRole('region', { name: 'Tu cuenta' });
  expect(cuenta).toHaveTextContent('Joseph Quintero');
  expect(cuenta).toHaveTextContent('Administrador · todas las ubicaciones');
  const admin = screen.getByRole('region', { name: 'Administración' });
  expect(within(admin).getByRole('link', { name: /Usuarios y accesos/ })).toHaveAttribute(
    'href',
    '/consola/usuarios',
  );
  expect(within(admin).getByRole('link', { name: /Bitácora/ })).toHaveAttribute(
    'href',
    '/consola/bitacora',
  );
  expect(within(admin).getByRole('link', { name: /Catálogo maestro/ })).toHaveAttribute(
    'href',
    '/consola/catalogo',
  );
});

it('el Auditor solo ve la bitácora', async () => {
  pantalla(persona('AUDITOR'));
  const admin = await screen.findByRole('region', { name: 'Administración' });
  expect(within(admin).getAllByRole('link')).toHaveLength(1);
  expect(within(admin).getByRole('link', { name: /Bitácora/ })).toBeInTheDocument();
});

it('un Operador no tiene herramientas de administración todavía', async () => {
  pantalla(persona('OPERADOR'));
  await screen.findByRole('region', { name: 'Tu cuenta' });
  expect(screen.queryByRole('region', { name: 'Administración' })).not.toBeInTheDocument();
});

it('Cerrar sesión cierra la sesión', async () => {
  const cliente = clienteFalso(persona('ADMIN'));
  render(envolver(<Mas />, '/mas', cliente));
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
  expect(cliente.cerrarSesion).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('region', { name: 'Tu donación' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Tu cuenta' })).not.toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  const { container } = pantalla(persona('ADMIN'));
  await screen.findByRole('region', { name: 'Administración' });
  expect(await violacionesGraves(container)).toEqual([]);
});
