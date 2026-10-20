import { render, screen } from '@testing-library/react';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { MiCuenta } from './MiCuenta';

it('sin sesión muestra el acceso del Donador', async () => {
  render(envolver(<MiCuenta />, '/donador'));
  expect(
    await screen.findByRole('heading', { name: 'Crea tu cuenta de donador' }),
  ).toBeInTheDocument();
});

it('con sesión de Donador no muestra el acceso', async () => {
  const ana = { id: 'u1', username: 'ana@correo.co', nombre: 'Ana Pérez', rol: 'DONADOR' as const };
  render(envolver(<MiCuenta />, '/donador', clienteFalso(ana)));
  expect(await screen.findByRole('heading', { name: 'Mis donaciones' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Crear cuenta de donador' })).not.toBeInTheDocument();
});
