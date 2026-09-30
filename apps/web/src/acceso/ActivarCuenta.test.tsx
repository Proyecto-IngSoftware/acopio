import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { envolver, responderJson } from '../pruebas/utilidades';
import { ActivarCuenta } from './ActivarCuenta';

const INVITACION = {
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR',
  esRestablecimiento: false,
  venceEn: '2026-10-07T00:00:00.000Z',
  asignaciones: [
    { tipo: 'ACOPIO', ubicacionId: '11111111-1111-4111-8111-111111111111' },
    { tipo: 'ACOPIO', ubicacionId: '22222222-2222-4222-8222-222222222222' },
  ],
};

function Ubicacion() {
  const l = useLocation();
  return <p>ruta: {l.pathname + l.search}</p>;
}

const pantalla = () =>
  render(
    envolver(
      <Routes>
        <Route path="/invitacion/:token" element={<ActivarCuenta />} />
        <Route path="/entrar" element={<Ubicacion />} />
      </Routes>,
      '/invitacion/tok123',
    ),
  );

const llamadas = (metodo: string) =>
  vi.mocked(globalThis.fetch).mock.calls.filter(([p]) => (p as Request).method === metodo);

const escribir = async (uno: string, dos: string) => {
  await userEvent.type(await screen.findByLabelText('Contraseña'), uno);
  await userEvent.type(screen.getByLabelText('Repite la contraseña'), dos);
};

it('muestra los datos de la invitación', async () => {
  responderJson(INVITACION);
  pantalla();
  expect(await screen.findByText('d.mendez')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Activa tu cuenta');
  expect(screen.getByText('Daniela Méndez')).toBeInTheDocument();
  expect(screen.getByText('Operador')).toBeInTheDocument();
  expect(screen.getByText('2 ubicaciones asignadas')).toBeInTheDocument();
  expect((llamadas('GET')[0]![0] as Request).url).toMatch(/\/api\/invitaciones\/tok123$/);
});

it('con un enlace que no sirve muestra el mensaje de la API y ningún formulario', async () => {
  responderJson(
    { estado: 404, codigo: 'INVITACION_INVALIDA', mensaje: 'El enlace no es válido o ya venció.' },
    404,
  );
  pantalla();
  expect(await screen.findByRole('alert')).toHaveTextContent('El enlace no es válido o ya venció.');
  expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Volver a la portada/ })).toHaveAttribute('href', '/');
});

it('si las contraseñas no coinciden lo dice y no llama a la API', async () => {
  responderJson(INVITACION);
  pantalla();
  await escribir('una frase larga uno', 'una frase larga dos');
  await userEvent.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.');
  expect(llamadas('POST')).toHaveLength(0);
});

it('una contraseña rechazada muestra el motivo de la API', async () => {
  responderJson(INVITACION);
  pantalla();
  await escribir('password1234', 'password1234');
  responderJson(
    { estado: 422, codigo: 'CONTRASENA_DEBIL', mensaje: 'La contraseña es muy común.' },
    422,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña es muy común.');
});

it('un restablecimiento cambia el título y el botón', async () => {
  responderJson({ ...INVITACION, esRestablecimiento: true });
  pantalla();
  await screen.findByText('d.mendez');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Restablece tu contraseña');
  expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeInTheDocument();
});

it('al activar lleva a Entrar con el usuario escrito', async () => {
  responderJson(INVITACION);
  pantalla();
  await escribir('una frase larga', 'una frase larga');
  responderJson({ username: 'd.mendez' });
  await userEvent.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(await screen.findByText('ruta: /entrar?usuario=d.mendez')).toBeInTheDocument();
});

it('doble clic en Activar hace una sola llamada', async () => {
  responderJson(INVITACION);
  pantalla();
  await escribir('una frase larga', 'una frase larga');
  vi.mocked(globalThis.fetch).mockReturnValue(new Promise(() => {}));
  await userEvent.dblClick(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(llamadas('POST')).toHaveLength(1);
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderJson(INVITACION);
  const { container } = pantalla();
  await screen.findByLabelText('Contraseña');
  expect(await violacionesGraves(container)).toEqual([]);
});
