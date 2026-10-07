import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../pruebas/utilidades';
import type { UsuarioSesion } from '../sesion/cliente-auth';
import { encolar, listarCola } from '../sin-conexion/cola';
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

it('un Donador ve sus tres filas de «Tu donación» y ninguna herramienta de la consola', async () => {
  pantalla({ id: 'd1', username: 'ana@correo.co', nombre: 'Ana Ruiz', rol: 'DONADOR' });
  const donacion = await screen.findByRole('region', { name: 'Tu donación' });
  expect(within(donacion).getByRole('link', { name: /Preparar donación/ })).toHaveAttribute(
    'href',
    '/donar',
  );
  expect(
    within(donacion).getByRole('link', { name: /Rastrear donación por folio/ }),
  ).toHaveAttribute('href', '/seguimiento');
  expect(within(donacion).getByRole('link', { name: /Mi cuenta de Donador/ })).toHaveAttribute(
    'href',
    '/donador',
  );
  expect(screen.queryByRole('region', { name: 'Administración' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Mi acopio' })).not.toBeInTheDocument();
});

it('el Administrador ve su cuenta y sus herramientas, también las de la red', async () => {
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
  expect(within(admin).getByRole('link', { name: /Comprobantes/ })).toHaveAttribute(
    'href',
    '/consola/comprobantes',
  );
  for (const [nombre, a] of [
    ['Acopios', '/consola/acopios'],
    ['Entidades', '/consola/entidades'],
    ['Zonas afectadas', '/consola/zonas'],
  ]) {
    expect(within(admin).getByRole('link', { name: new RegExp(nombre!) })).toHaveAttribute(
      'href',
      a,
    );
  }
  expect(screen.queryByRole('region', { name: 'Mi acopio' })).not.toBeInTheDocument();
});

it('el Auditor ve la bitácora, los comprobantes y la matriz de acceso', async () => {
  responderSegun({ 'GET /api/ubicaciones/mias': [] });
  pantalla(persona('AUDITOR'));
  const admin = await screen.findByRole('region', { name: 'Administración' });
  expect(within(admin).getAllByRole('link')).toHaveLength(3);
  expect(within(admin).getByRole('link', { name: /Bitácora/ })).toBeInTheDocument();
  expect(within(admin).getByRole('link', { name: /Comprobantes/ })).toHaveAttribute(
    'href',
    '/consola/comprobantes',
  );
  expect(within(admin).getByRole('link', { name: /Matriz de acceso/ })).toHaveAttribute(
    'href',
    '/consola/accesos',
  );
});

it('un Operador ve «Mi acopio» solo para la ubicación activa', async () => {
  responderSegun({
    'GET /api/ubicaciones/mias': [
      {
        tipo: 'ACOPIO',
        id: 'x1',
        nombre: 'Acopio Chapinero',
        municipio: 'Bogotá',
        estado: 'ACTIVO',
      },
      { tipo: 'ACOPIO', id: 'x2', nombre: 'Acopio Suba', municipio: 'Bogotá', estado: 'PAUSADO' },
    ],
  });
  pantalla(persona('OPERADOR'));
  const mio = await screen.findByRole('region', { name: 'Mi acopio' });
  expect(await within(mio).findByRole('link', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'href',
    '/consola/acopios/x1/operacion',
  );
  expect(within(mio).getByRole('link', { name: /Entrada rápida/ })).toHaveAttribute(
    'href',
    '/consola/acopios/x1/entrada',
  );
  expect(within(mio).getByRole('link', { name: /Inventario/ })).toHaveAttribute(
    'href',
    '/consola/acopios/x1/inventario',
  );
  expect(within(mio).getByRole('link', { name: /Salida/ })).toHaveAttribute(
    'href',
    '/consola/acopios/x1/salida',
  );
  expect(within(mio).getByRole('link', { name: /Conteo físico/ })).toHaveAttribute(
    'href',
    '/consola/acopios/x1/conteo',
  );
  expect(within(mio).getAllByRole('link')).toHaveLength(5);
  expect(screen.queryByRole('region', { name: 'Administración' })).not.toBeInTheDocument();
});

it('el Auditor ve solo el inventario de su ubicación activa', async () => {
  responderSegun({
    'GET /api/ubicaciones/mias': [
      {
        tipo: 'ACOPIO',
        id: 'x1',
        nombre: 'Acopio Chapinero',
        municipio: 'Bogotá',
        estado: 'ACTIVO',
      },
    ],
  });
  pantalla(persona('AUDITOR'));
  const mio = await screen.findByRole('region', { name: 'Mi acopio' });
  const enlaces = await within(mio).findAllByRole('link');
  expect(enlaces).toHaveLength(1);
  expect(enlaces[0]).toHaveAttribute('href', '/consola/acopios/x1/inventario');
});

it('Cerrar sesión cierra la sesión', async () => {
  const cliente = clienteFalso(persona('ADMIN'));
  render(envolver(<Mas />, '/mas', cliente));
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
  // Antes de cerrar mira si hay entradas sin enviar en el teléfono (O-12)
  await waitFor(() => expect(cliente.cerrarSesion).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('region', { name: 'Tu donación' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Tu cuenta' })).not.toBeInTheDocument();
});

describe('Cerrar sesión con entradas sin enviar (O-12)', () => {
  const tres = async () => {
    for (const [i, cantidad] of [12, 24, 5].entries()) {
      await encolar('u1', 'x1', { id: `e${i}`, categoriaId: 'c1', cantidad });
    }
  };

  it('avisa cuántas son antes de cerrar y deja seguir en la consola', async () => {
    await tres();
    const cliente = clienteFalso(persona('OPERADOR'));
    render(envolver(<Mas />, '/mas', cliente));

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    const hoja = await screen.findByRole('dialog', { name: 'Tienes 3 entradas sin enviar' });
    expect(hoja).toHaveTextContent('quedan guardadas en este teléfono');
    expect(cliente.cerrarSesion).not.toHaveBeenCalled();

    await userEvent.click(within(hoja).getByRole('button', { name: 'Seguir en la consola' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tu cuenta' })).toBeInTheDocument();
  });

  it('«Salir de todas formas» cierra la sesión y la cola se queda en el teléfono', async () => {
    await tres();
    const cliente = clienteFalso(persona('OPERADOR'));
    render(envolver(<Mas />, '/mas', cliente));

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Salir de todas formas' }));

    expect(cliente.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await listarCola('u1')).toHaveLength(3);
  });

  it('las entradas de otra persona del teléfono no cuentan', async () => {
    await encolar('otra', 'x1', { id: 'e9', categoriaId: 'c1', cantidad: 1 });
    const cliente = clienteFalso(persona('OPERADOR'));
    render(envolver(<Mas />, '/mas', cliente));

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(cliente.cerrarSesion).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

it('no tiene violaciones graves de accesibilidad', async () => {
  const { container } = pantalla(persona('ADMIN'));
  await screen.findByRole('region', { name: 'Administración' });
  expect(await violacionesGraves(container)).toEqual([]);
});
