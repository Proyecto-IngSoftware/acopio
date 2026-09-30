import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import { DetalleUsuario } from './DetalleUsuario';
import { InvitarPersona } from './InvitarPersona';
import { Usuarios } from './Usuarios';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const usuario = (datos: Record<string, unknown>) => ({
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  correo: 'd.mendez@correo.co',
  sinCorreoReal: false,
  rol: 'OPERADOR',
  estado: 'ACTIVO',
  creadoEn: '2026-09-28T10:00:00.000Z',
  asignaciones: [{ tipo: 'ACOPIO', ubicacionId: '11111111-1111-4111-8111-111111111111' }],
  invitacionPendiente: null,
  restablecimientoPendiente: null,
  ...datos,
});
const LISTA = [
  usuario({}),
  usuario({
    id: 'u2',
    username: 'c.rojas',
    nombre: 'Carlos Rojas',
    rol: 'RECEPTOR',
    estado: 'INVITADO',
  }),
  usuario({
    id: 'u3',
    username: 'a.perez',
    nombre: 'Ana Pérez',
    rol: 'AUDITOR',
    estado: 'SUSPENDIDO',
  }),
];
const ENLACE = {
  enlace: 'http://localhost:5173/invitacion/tok',
  venceEn: '2026-10-07T00:00:00.000Z',
};

const rutas = (inicial: string) =>
  envolver(
    <Routes>
      <Route path="/consola/usuarios" element={<Usuarios />} />
      <Route path="/consola/usuarios/invitar" element={<InvitarPersona />} />
      <Route path="/consola/usuarios/:id" element={<DetalleUsuario />} />
    </Routes>,
    inicial,
    clienteFalso(ADMIN),
  );

describe('lista', () => {
  beforeEach(() => responderSegun({ 'GET /api/usuarios': LISTA }));

  it('muestra cada persona con su rol y su estado en texto', async () => {
    render(rutas('/consola/usuarios'));
    const fila = await screen.findByRole('link', { name: /Carlos Rojas/ });
    expect(fila).toHaveTextContent('@c.rojas');
    expect(fila).toHaveTextContent('Receptor');
    expect(fila).toHaveTextContent('Invitación pendiente');
    expect(fila).toHaveAttribute('href', '/consola/usuarios/u2');
    expect(screen.getByRole('link', { name: /Ana Pérez/ })).toHaveTextContent('Suspendido');
  });

  it('los filtros y la búsqueda van a la API', async () => {
    render(rutas('/consola/usuarios'));
    await screen.findByRole('link', { name: /Carlos Rojas/ });
    await userEvent.click(screen.getByRole('button', { name: 'Operador' }));
    expect(peticiones().at(-1)).toMatch(/rol=OPERADOR/);
    await userEvent.click(screen.getByRole('button', { name: 'Suspendidos' }));
    expect(peticiones().at(-1)).toMatch(/estado=SUSPENDIDO/);
    await userEvent.type(screen.getByLabelText('Buscar por nombre o usuario'), 'ana');
    expect(peticiones().at(-1)).toMatch(/q=ana/);
  });

  it('lleva a invitar persona', async () => {
    render(rutas('/consola/usuarios'));
    expect(await screen.findByRole('link', { name: /Invitar persona/ })).toHaveAttribute(
      'href',
      '/consola/usuarios/invitar',
    );
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = render(rutas('/consola/usuarios'));
    await screen.findByRole('link', { name: /Carlos Rojas/ });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('detalle', () => {
  const abrir = (datos: Record<string, unknown> = {}) => {
    responderSegun({
      'GET /api/usuarios/*': usuario(datos),
      'PATCH /api/usuarios/*': usuario({ ...datos, rol: 'AUDITOR' }),
      'POST /api/usuarios/*/suspender': usuario({ ...datos, estado: 'SUSPENDIDO' }),
      'POST /api/usuarios/*/reactivar': usuario({ ...datos, estado: 'ACTIVO' }),
      'POST /api/usuarios/*/restablecer': ENLACE,
      'POST /api/usuarios/*/invitacion': ENLACE,
    });
    return render(rutas('/consola/usuarios/u1'));
  };

  it('muestra los datos y la cantidad de ubicaciones', async () => {
    abrir();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Daniela Méndez');
    expect(screen.getByText('@d.mendez')).toBeInTheDocument();
    expect(screen.getByText('1 ubicación asignada')).toBeInTheDocument();
  });

  it('cambiar el rol manda solo el rol', async () => {
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText('Rol asignado'), 'AUDITOR');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar rol' }));
    expect(await cuerpoDe('PATCH /api/usuarios/u1')).toEqual({ rol: 'AUDITOR' });
  });

  it('suspender pide confirmación', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Suspender' }));
    const hoja = screen.getByRole('dialog', { name: 'Suspender a Daniela Méndez' });
    await userEvent.click(within(hoja).getByRole('button', { name: 'Suspender' }));
    expect(peticiones()).toContain('POST /api/usuarios/u1/suspender');
  });

  it('restablecer pide un motivo de 20 caracteres y entrega el enlace', async () => {
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Restablecer acceso' }));
    const hoja = screen.getByRole('dialog', { name: 'Restablecer acceso' });
    await userEvent.type(within(hoja).getByLabelText('Motivo'), 'olvidó');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Generar enlace' }));
    expect(within(hoja).getByRole('alert')).toHaveTextContent('al menos 20 caracteres');
    await userEvent.type(within(hoja).getByLabelText('Motivo'), ' la contraseña del turno');
    await userEvent.click(within(hoja).getByRole('button', { name: 'Generar enlace' }));
    expect(await within(hoja).findByDisplayValue(ENLACE.enlace)).toBeInTheDocument();
    expect(await cuerpoDe('POST /api/usuarios/u1/restablecer')).toEqual({
      motivo: 'olvidó la contraseña del turno',
    });
  });

  it('una persona suspendida se puede reactivar', async () => {
    abrir({ estado: 'SUSPENDIDO' });
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }));
    expect(peticiones()).toContain('POST /api/usuarios/u1/reactivar');
  });

  it('a una persona invitada se le puede reenviar la invitación', async () => {
    abrir({ estado: 'INVITADO', invitacionPendiente: { venceEn: '2026-10-07T00:00:00.000Z' } });
    await userEvent.click(await screen.findByRole('button', { name: 'Generar enlace nuevo' }));
    expect(await screen.findByDisplayValue(ENLACE.enlace)).toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = abrir();
    await screen.findByRole('heading', { level: 1 });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('invitar', () => {
  beforeEach(() =>
    responderSegun({
      'POST /api/usuarios': { usuario: usuario({ estado: 'INVITADO' }), invitacion: ENLACE },
    }),
  );

  const llenar = async (rol: string) => {
    render(rutas('/consola/usuarios/invitar'));
    await userEvent.type(await screen.findByLabelText('Nombre completo'), 'Daniela Méndez');
    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'd.mendez');
    await userEvent.click(screen.getByRole('radio', { name: new RegExp(rol) }));
  };

  it('un Administrador se invita sin ubicaciones', async () => {
    await llenar('Administrador');
    expect(screen.queryByLabelText('Identificador de la ubicación')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Crear e invitar' }));
    expect(await cuerpoDe('POST /api/usuarios')).toEqual({
      nombre: 'Daniela Méndez',
      username: 'd.mendez',
      rol: 'ADMIN',
      correo: null,
      asignaciones: [],
    });
  });

  it('un Operador necesita al menos una ubicación', async () => {
    await llenar('Operador');
    await userEvent.click(screen.getByRole('button', { name: 'Crear e invitar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Agrega al menos una ubicación');
    expect(peticiones()).toHaveLength(0);
    await userEvent.type(
      screen.getByLabelText('Identificador de la ubicación'),
      '11111111-1111-4111-8111-111111111111',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Agregar ubicación' }));
    await userEvent.type(screen.getByLabelText(/Correo/), 'd.mendez@correo.co');
    await userEvent.click(screen.getByRole('button', { name: 'Crear e invitar' }));
    expect(await cuerpoDe('POST /api/usuarios')).toMatchObject({
      rol: 'OPERADOR',
      correo: 'd.mendez@correo.co',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: '11111111-1111-4111-8111-111111111111' }],
    });
  });

  it('al crear muestra el enlace para copiar o mandar por WhatsApp', async () => {
    const copiar = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText: copiar } });
    await llenar('Administrador');
    await userEvent.click(screen.getByRole('button', { name: 'Crear e invitar' }));
    expect(await screen.findByText('Invitación creada para Daniela Méndez')).toBeInTheDocument();
    expect(screen.getByDisplayValue(ENLACE.enlace)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }));
    expect(copiar).toHaveBeenCalledWith(ENLACE.enlace);
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    );
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    render(rutas('/consola/usuarios/invitar'));
    await screen.findByLabelText('Nombre completo');
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});
