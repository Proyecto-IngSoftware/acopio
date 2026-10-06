import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { MiCuenta } from './MiCuenta';

it('sin sesión muestra el acceso del Donador', async () => {
  render(envolver(<MiCuenta />, '/donador'));
  expect(await screen.findByRole('heading', { name: 'Tu cuenta de Donador' })).toBeInTheDocument();
});

it('con sesión de Donador no muestra el acceso', async () => {
  const ana = { id: 'u1', username: 'ana@correo.co', nombre: 'Ana Pérez', rol: 'DONADOR' as const };
  render(envolver(<MiCuenta />, '/donador', clienteFalso(ana)));
  expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
  expect(screen.queryByRole('radio', { name: 'Crear cuenta' })).not.toBeInTheDocument();
});

it('al entrar, la sesión queda abierta y reemplaza el acceso', async () => {
  const ana = { id: 'u1', username: 'ana@correo.co', nombre: 'Ana Pérez', rol: 'DONADOR' as const };
  const cliente = clienteFalso();
  cliente.iniciarSesionDonador.mockResolvedValue(ana);
  render(envolver(<MiCuenta />, '/donador?entrar', cliente));
  await userEvent.type(await screen.findByLabelText('Correo'), 'ana@correo.co');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'una frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('heading', { name: 'Mi cuenta' })).toBeInTheDocument();
});
