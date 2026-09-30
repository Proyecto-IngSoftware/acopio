import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { Entrar } from './Entrar';

const DANIELA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};

const pantalla = (ruta = '/entrar', cliente = clienteFalso()) =>
  render(
    envolver(
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/" element={<p>inicio</p>} />
      </Routes>,
      ruta,
      cliente,
    ),
  );

const llenar = async (usuario: string, contrasena: string) => {
  await userEvent.type(await screen.findByLabelText('Nombre de usuario'), usuario);
  await userEvent.type(screen.getByLabelText('Contraseña'), contrasena);
};

it('entra con usuario y contraseña y lleva al inicio', async () => {
  const cliente = clienteFalso();
  cliente.iniciarSesion.mockResolvedValue(DANIELA);
  pantalla('/entrar', cliente);
  await llenar('d.mendez', 'una frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(cliente.iniciarSesion).toHaveBeenCalledWith('d.mendez', 'una frase larga');
  expect(await screen.findByText('inicio')).toBeInTheDocument();
});

it('con ?usuario= el campo viene escrito', async () => {
  pantalla('/entrar?usuario=d.mendez');
  expect(await screen.findByLabelText('Nombre de usuario')).toHaveValue('d.mendez');
});

it('con credenciales malas muestra el mensaje único', async () => {
  const cliente = clienteFalso();
  cliente.iniciarSesion.mockRejectedValue(new ErrorApi(401, 'NO_AUTENTICADO', 'lo que sea'));
  pantalla('/entrar', cliente);
  await llenar('x', 'y');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.');
});

it('con demasiados intentos muestra el mensaje de la API', async () => {
  const cliente = clienteFalso();
  cliente.iniciarSesion.mockRejectedValue(
    new ErrorApi(429, 'DEMASIADOS_INTENTOS', 'Demasiados intentos. Espera un minuto.'),
  );
  pantalla('/entrar', cliente);
  await llenar('x', 'y');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Demasiados intentos. Espera un minuto.',
  );
});

it('doble clic en Entrar hace una sola llamada', async () => {
  const cliente = clienteFalso();
  cliente.iniciarSesion.mockReturnValue(new Promise(() => {}));
  pantalla('/entrar', cliente);
  await llenar('d.mendez', 'una frase larga');
  const boton = screen.getByRole('button', { name: 'Entrar' });
  await userEvent.dblClick(boton);
  expect(cliente.iniciarSesion).toHaveBeenCalledTimes(1);
});

it('el ojo muestra y oculta la contraseña', async () => {
  pantalla();
  const campo = await screen.findByLabelText('Contraseña');
  expect(campo).toHaveAttribute('type', 'password');
  await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
  expect(campo).toHaveAttribute('type', 'text');
  await userEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
  expect(campo).toHaveAttribute('type', 'password');
});

it('con sesión iniciada lleva al inicio', async () => {
  pantalla('/entrar', clienteFalso(DANIELA));
  expect(await screen.findByText('inicio')).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  const { container } = pantalla();
  await screen.findByLabelText('Nombre de usuario');
  expect(await violacionesGraves(container)).toEqual([]);
});
