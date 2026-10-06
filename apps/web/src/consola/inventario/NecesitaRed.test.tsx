import { render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { clienteFalso, envolver } from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { NoRecibir } from '../red/NoRecibir';
import { Conteo } from './Conteo';
import { Salida } from './Salida';

const OPERADORA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const ADMIN = { id: 'u9', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };

/** Sin red: el navegador lo dice y cualquier petición falla (src/pruebas/preparar.ts). */
const sinRed = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

const pantalla = (ruta: string, elemento: React.ReactNode, usuario: UsuarioSesion = OPERADORA) =>
  render(
    envolver(
      <Routes>
        <Route path={ruta.replace('x1', ':id')} element={elemento} />
      </Routes>,
      ruta,
      clienteFalso(usuario),
    ),
  );

describe('salida, conteo y umbrales piden red (O-09)', () => {
  it.each([
    ['C5', '/consola/acopios/x1/salida', <Salida />, 'La salida necesita conexión'],
    ['C6', '/consola/acopios/x1/conteo', <Conteo />, 'El conteo necesita conexión'],
    ['C7', '/consola/acopios/x1/no-recibir', <NoRecibir />, 'Los umbrales necesitan conexión'],
  ])('%s sin red lo explica y lleva a Entrada rápida', async (_c, ruta, elemento, titulo) => {
    sinRed();
    pantalla(ruta, elemento);

    expect(await screen.findByRole('heading', { name: titulo })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Entrada rápida' })).toHaveAttribute(
      'href',
      '/consola/acopios/x1/entrada',
    );
    expect(screen.queryByRole('group', { name: 'Teclado numérico' })).not.toBeInTheDocument();
  });

  it('al Administrador, que no captura entradas, no le ofrece Entrada rápida', async () => {
    sinRed();
    pantalla('/consola/acopios/x1/no-recibir', <NoRecibir />, ADMIN);

    expect(
      await screen.findByRole('heading', { name: 'Los umbrales necesitan conexión' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir a Entrada rápida' })).not.toBeInTheDocument();
  });
});
