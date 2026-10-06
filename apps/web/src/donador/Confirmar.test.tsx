import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { Confirmar } from './Confirmar';

const ANA = { id: 'u1', username: 'ana@correo.co', nombre: 'Ana Pérez', rol: 'DONADOR' as const };
const DATOS = { nombre: 'Ana Rodríguez', correo: 'ana@correo.co' };

function Ruta() {
  return <p>ruta: {useLocation().pathname}</p>;
}

function pantalla(cliente = clienteFalso()) {
  return render(
    envolver(
      <Routes>
        <Route path="/donador/confirmar/:token" element={<Confirmar />} />
        <Route path="/donador" element={<Ruta />} />
      </Routes>,
      '/donador/confirmar/tok-1',
      cliente,
    ),
  );
}

function conEnlace() {
  const cliente = clienteFalso();
  cliente.validarEnlace.mockResolvedValue(DATOS);
  return cliente;
}

async function escribir(contrasena: string, repeticion: string) {
  await userEvent.type(await screen.findByLabelText('Contraseña'), contrasena);
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), repeticion);
}

it('muestra el esqueleto mientras valida el enlace', () => {
  const cliente = clienteFalso();
  cliente.validarEnlace.mockReturnValue(new Promise(() => {}));
  pantalla(cliente);
  expect(screen.getByRole('status', { name: 'Validando el enlace' })).toBeInTheDocument();
});

it('con el enlace vencido avisa y lleva a crear la cuenta', async () => {
  const cliente = clienteFalso();
  pantalla(cliente);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Este enlace ya no sirve: venció o ya se usó. Crea la cuenta otra vez para recibir uno nuevo.',
  );
  expect(cliente.validarEnlace).toHaveBeenCalledWith('tok-1');
  expect(screen.getByRole('link', { name: 'Ir a crear cuenta' })).toHaveAttribute(
    'href',
    '/donador',
  );
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
});

it('con el enlace vigente muestra el correo y el nombre editable', async () => {
  pantalla(conEnlace());
  expect(await screen.findByLabelText('Nombre')).toHaveValue('Ana Rodríguez');
  expect(screen.getByText('ana@correo.co')).toBeInTheDocument();
});

it('confirma con el nombre editado, deja la sesión y va a /donador', async () => {
  const cliente = conEnlace();
  cliente.confirmarCorreo.mockResolvedValue(ANA);
  pantalla(cliente);
  const nombre = await screen.findByLabelText('Nombre');
  await userEvent.clear(nombre);
  await userEvent.type(nombre, 'Ana R.');
  await escribir('una frase larga', 'una frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
  expect(cliente.confirmarCorreo).toHaveBeenCalledWith('tok-1', 'una frase larga', 'Ana R.');
  expect(await screen.findByText('ruta: /donador')).toBeInTheDocument();
});

it('con contraseñas distintas avisa y no llama a la API', async () => {
  const cliente = conEnlace();
  pantalla(cliente);
  await escribir('una frase larga', 'otra frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
  expect(cliente.confirmarCorreo).not.toHaveBeenCalled();
});

it('un 422 CONTRASENA_DEBIL muestra el mensaje de la API', async () => {
  const cliente = conEnlace();
  cliente.confirmarCorreo.mockRejectedValue(
    new ErrorApi(422, 'CONTRASENA_DEBIL', 'La contraseña es demasiado común.'),
  );
  pantalla(cliente);
  await escribir('una frase larga', 'una frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña es demasiado común.');
  expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
});

it('un 404 al confirmar pasa al aviso de enlace vencido', async () => {
  const cliente = conEnlace();
  cliente.confirmarCorreo.mockRejectedValue(new ErrorApi(404, 'NO_ENCONTRADO', 'No existe.'));
  pantalla(cliente);
  await escribir('una frase larga', 'una frase larga');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Este enlace ya no sirve');
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  const { container } = pantalla(conEnlace());
  await screen.findByLabelText('Contraseña');
  expect(await violacionesGraves(container)).toEqual([]);
});

it('el enlace vencido tampoco tiene violaciones graves', async () => {
  const { container } = pantalla();
  await screen.findByRole('alert');
  expect(await violacionesGraves(container)).toEqual([]);
});

it('sin red al validar no dice que el enlace venció y deja reintentar', async () => {
  const cliente = clienteFalso();
  cliente.validarEnlace
    .mockRejectedValueOnce(new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Acopio.'))
    .mockResolvedValueOnce(DATOS);
  pantalla(cliente);

  expect(await screen.findByText('No pudimos conectar con Acopio.')).toBeInTheDocument();
  expect(screen.queryByText(/ya no sirve/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Ir a crear cuenta' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

  expect(await screen.findByRole('heading', { name: 'Elige tu contraseña' })).toBeInTheDocument();
  expect(cliente.validarEnlace).toHaveBeenCalledTimes(2);
});

it('el enlace vencido tiene su título', async () => {
  pantalla();
  expect(await screen.findByRole('heading', { name: 'El enlace ya no sirve' })).toBeInTheDocument();
});
