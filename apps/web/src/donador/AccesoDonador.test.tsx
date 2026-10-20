import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorApi } from '../api/cliente';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { AccesoDonador } from './AccesoDonador';

const pantalla = (ruta = '/donador', cliente = clienteFalso()) =>
  render(envolver(<AccesoDonador />, ruta, cliente));

describe('crear cuenta de donador', () => {
  it('abre sin pestañas, con el aviso del enlace, el de privacidad y el paso a «Entrar»', async () => {
    pantalla();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Crea tu cuenta de donador' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText(/Te enviamos un enlace para confirmar el correo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cómo usamos tus datos/ })).toHaveAttribute(
      'href',
      '/privacidad',
    );
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('manda nombre y correo y deja el aviso con el paso a «Entrar»', async () => {
    const cliente = clienteFalso();
    pantalla('/donador', cliente);
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana Pérez');
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de donador' }));
    expect(cliente.registrarDonador).toHaveBeenCalledWith('Ana Pérez', 'ana@correo.co');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.',
    );
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
  });

  it('no manda un correo con formato inválido', async () => {
    const cliente = clienteFalso();
    pantalla('/donador', cliente);
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo'), 'no-es-correo');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de donador' }));
    expect(cliente.registrarDonador).not.toHaveBeenCalled();
  });

  it('muestra el error de la API', async () => {
    const cliente = clienteFalso();
    cliente.registrarDonador.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto.'),
    );
    pantalla('/donador', cliente);
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de donador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
  });

  it('sin red deja el botón inactivo con el aviso', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    pantalla();
    expect(await screen.findByRole('button', { name: 'Crear cuenta de donador' })).toBeDisabled();
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });
});

it('no tiene violaciones graves de accesibilidad, antes y después de crear la cuenta', async () => {
  const { container } = pantalla();
  await screen.findByLabelText('Nombre');
  expect(await violacionesGraves(container)).toEqual([]);
  await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
  await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
  await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de donador' }));
  await screen.findByRole('status');
  expect(await violacionesGraves(container)).toEqual([]);
});
