import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import { Rutas } from '../../rutas';
import type { UsuarioSesion } from '../../sesion/cliente-auth';

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol,
});

const SALITRE = {
  tipo: 'ACOPIO',
  id: 'a1',
  nombre: 'Coliseo El Salitre',
  municipio: 'Bogotá',
  estado: 'ACTIVO',
};
const SAN_JOSE = {
  tipo: 'ACOPIO',
  id: 'a2',
  nombre: 'Parroquia San José',
  municipio: 'Bogotá',
  estado: 'PAUSADO',
};
const CARMEN = {
  tipo: 'ZONA',
  id: 'z1',
  nombre: 'Vereda El Carmen',
  municipio: 'Mocoa',
  estado: 'SIN_ATENDER',
};

const conUbicaciones = (lista: unknown[]) =>
  responderSegun({ 'GET /api/ubicaciones/mias': lista, 'GET /api/emergencias': [] });

const pantalla = (rol: UsuarioSesion['rol'] = 'OPERADOR', ruta = '/mas') =>
  render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));

const conmutador = () => screen.findByRole('button', { name: /^Ubicación activa/ });

it('con una sola ubicación no muestra el conmutador y la toma sola', async () => {
  conUbicaciones([SALITRE]);
  pantalla();
  const mio = await screen.findByRole('region', { name: 'Mi acopio' });
  expect(await within(mio).findByRole('link', { name: /Coliseo El Salitre/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Ubicación activa/ })).not.toBeInTheDocument();
});

it('con varias, el conmutador muestra la primera y «Más» solo esa', async () => {
  conUbicaciones([SALITRE, SAN_JOSE, CARMEN]);
  pantalla();
  expect(await conmutador()).toHaveTextContent('Coliseo El Salitre');
  const mio = await screen.findByRole('region', { name: 'Mi acopio' });
  expect(within(mio).getAllByRole('link')).toHaveLength(1);
  expect(within(mio).getByRole('link', { name: /Coliseo El Salitre/ })).toHaveAttribute(
    'href',
    '/consola/acopios/a1/operacion',
  );
  expect(screen.getByRole('region', { name: 'Tu cuenta' })).toHaveTextContent(
    'Operador · 3 ubicaciones',
  );
});

it('la hoja agrupa acopios y zonas, y elegir cambia la ubicación activa', async () => {
  conUbicaciones([SALITRE, SAN_JOSE, CARMEN]);
  pantalla();
  await userEvent.click(await conmutador());
  const hoja = screen.getByRole('dialog', { name: '¿Dónde estás operando?' });
  expect(within(hoja).getByRole('group', { name: 'Acopios' })).toHaveTextContent(
    'Parroquia San José',
  );
  expect(within(hoja).getByRole('group', { name: 'Zonas' })).toHaveTextContent('Vereda El Carmen');
  expect(within(hoja).getByRole('button', { name: /Coliseo El Salitre/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await userEvent.click(within(hoja).getByRole('button', { name: /Parroquia San José/ }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(await conmutador()).toHaveTextContent('Parroquia San José');
  const mio = screen.getByRole('region', { name: 'Mi acopio' });
  expect(within(mio).getByRole('link', { name: /Parroquia San José/ })).toHaveAttribute(
    'href',
    '/consola/acopios/a2/operacion',
  );
});

it('la elección se recuerda en el dispositivo, aparte para cada usuario', async () => {
  conUbicaciones([SALITRE, SAN_JOSE]);
  localStorage.setItem('acopio.ubicacion.u1', 'a2');
  localStorage.setItem('acopio.ubicacion.otra', 'a1');
  pantalla();
  expect(await conmutador()).toHaveTextContent('Parroquia San José');
  await userEvent.click(await conmutador());
  await userEvent.click(screen.getByRole('button', { name: /Coliseo El Salitre/ }));
  expect(localStorage.getItem('acopio.ubicacion.u1')).toBe('a1');
});

it('si lo guardado ya no está asignado, toma la primera', async () => {
  conUbicaciones([SALITRE, SAN_JOSE]);
  localStorage.setItem('acopio.ubicacion.u1', 'ya-no-existe');
  pantalla();
  expect(await conmutador()).toHaveTextContent('Coliseo El Salitre');
});

it('con una zona activa, «Más» no muestra «Mi acopio»', async () => {
  conUbicaciones([CARMEN, SALITRE]);
  pantalla('RECEPTOR');
  expect(await conmutador()).toHaveTextContent('Vereda El Carmen');
  expect(screen.queryByRole('region', { name: 'Mi acopio' })).not.toBeInTheDocument();
});

it('el Administrador y el Auditor no tienen conmutador', async () => {
  conUbicaciones([SALITRE, SAN_JOSE]);
  pantalla('ADMIN');
  await screen.findByRole('region', { name: 'Tu cuenta' });
  expect(screen.queryByRole('button', { name: /^Ubicación activa/ })).not.toBeInTheDocument();
});

it('la hoja abierta no tiene violaciones graves', async () => {
  conUbicaciones([SALITRE, SAN_JOSE, CARMEN]);
  const { container } = pantalla('OPERADOR', '/');
  await userEvent.click(await conmutador());
  expect(await violacionesGraves(container)).toEqual([]);
});
