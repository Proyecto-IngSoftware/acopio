import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorApi } from '../api/cliente';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { AccesoDonador } from './AccesoDonador';

const ANA = { id: 'u1', username: 'ana@correo.co', nombre: 'Ana Pérez', rol: 'DONADOR' as const };

const pantalla = (ruta = '/donador', cliente = clienteFalso()) =>
  render(envolver(<AccesoDonador />, ruta, cliente));

describe('crear cuenta', () => {
  it('abre en «Crear cuenta», con el aviso del enlace y el de privacidad', async () => {
    pantalla();
    expect(await screen.findByRole('radio', { name: 'Crear cuenta' })).toBeChecked();
    expect(screen.getByText(/Te enviamos un enlace para confirmar el correo/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Cómo usamos tus datos/ })).toHaveAttribute(
      'href',
      '/privacidad',
    );
  });

  it('manda nombre y correo y pasa a «Entrar» con el aviso', async () => {
    const cliente = clienteFalso();
    pantalla('/donador', cliente);
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana Pérez');
    await userEvent.type(screen.getByLabelText('Correo'), 'ana@correo.co');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(cliente.registrarDonador).toHaveBeenCalledWith('Ana Pérez', 'ana@correo.co');
    expect(await screen.findByRole('radio', { name: 'Entrar' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.',
    );
  });

  it('no manda un correo con formato inválido', async () => {
    const cliente = clienteFalso();
    pantalla('/donador', cliente);
    await userEvent.type(await screen.findByLabelText('Nombre'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo'), 'no-es-correo');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
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
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
  });

  it('sin red deja el botón inactivo con el aviso', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    pantalla();
    expect(await screen.findByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });
});

describe('entrar', () => {
  it('con ?entrar abre la pestaña «Entrar»', async () => {
    pantalla('/donador?entrar');
    expect(await screen.findByRole('radio', { name: 'Entrar' })).toBeChecked();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('entra con correo y contraseña y deja la sesión', async () => {
    const cliente = clienteFalso();
    cliente.iniciarSesionDonador.mockResolvedValue(ANA);
    pantalla('/donador?entrar', cliente);
    await userEvent.type(await screen.findByLabelText('Correo'), 'ana@correo.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'una frase larga');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(cliente.iniciarSesionDonador).toHaveBeenCalledWith('ana@correo.co', 'una frase larga');
  });

  it('con un 401 muestra el error y la ayuda', async () => {
    const cliente = clienteFalso();
    cliente.iniciarSesionDonador.mockRejectedValue(new ErrorApi(401, 'NO_AUTENTICADO', 'x'));
    pantalla('/donador?entrar', cliente);
    await userEvent.type(await screen.findByLabelText('Correo'), 'ana@correo.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
    expect(
      screen.getByText(
        'Si acabas de crear la cuenta, primero abre el enlace del correo y elige tu contraseña.',
      ),
    ).toBeInTheDocument();
  });

  it('con un 429 muestra el mensaje de la API', async () => {
    const cliente = clienteFalso();
    cliente.iniciarSesionDonador.mockRejectedValue(
      new ErrorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto.'),
    );
    pantalla('/donador?entrar', cliente);
    await userEvent.type(await screen.findByLabelText('Correo'), 'ana@correo.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos. Espera');
  });

  it('con un 500 muestra el mensaje de la API, no el de credenciales', async () => {
    const cliente = clienteFalso();
    cliente.iniciarSesionDonador.mockRejectedValue(
      new ErrorApi(500, 'ERROR_INTERNO', 'Algo falló de nuestro lado.'),
    );
    pantalla('/donador?entrar', cliente);
    await userEvent.type(await screen.findByLabelText('Correo'), 'ana@correo.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Algo falló de nuestro lado.');
    expect(alerta).not.toHaveTextContent('incorrectos');
  });

  it('sin red deja «Entrar» inactivo con el aviso', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    pantalla('/donador?entrar');
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeDisabled();
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
  });
});

it('no tiene violaciones graves de accesibilidad en ninguna pestaña', async () => {
  const { container } = pantalla();
  await userEvent.click(await screen.findByRole('radio', { name: 'Entrar' }));
  expect(await violacionesGraves(container)).toEqual([]);
  await userEvent.click(screen.getByRole('radio', { name: 'Crear cuenta' }));
  expect(await violacionesGraves(container)).toEqual([]);
});
