import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import { Rutas } from '../../rutas';
import type { UsuarioSesion } from '../../sesion/cliente-auth';

const SALITRE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SAN_JOSE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CARMEN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const UBICACIONES = [
  {
    tipo: 'ACOPIO',
    id: SAN_JOSE,
    nombre: 'Parroquia San José',
    municipio: 'Bogotá',
    estado: 'ACTIVO',
  },
  {
    tipo: 'ACOPIO',
    id: SALITRE,
    nombre: 'Coliseo El Salitre',
    municipio: 'Bogotá',
    estado: 'ACTIVO',
  },
  {
    tipo: 'ZONA',
    id: CARMEN,
    nombre: 'Vereda El Carmen',
    municipio: 'Mocoa',
    estado: 'SIN_ATENDER',
  },
];

const asignacion = (tipo: string, ubicacionId: string) => ({
  tipo,
  ubicacionId,
  asignadoPor: '99999999-9999-4999-8999-999999999999',
  asignadoEn: '2026-09-30T12:00:00.000Z',
});

const usuario = (datos: Record<string, unknown>) => ({
  id: 'u1',
  username: 'persona',
  nombre: 'Persona',
  correo: null,
  sinCorreoReal: true,
  rol: 'OPERADOR',
  estado: 'ACTIVO',
  creadoEn: '2026-09-28T10:00:00.000Z',
  asignaciones: [],
  invitacionPendiente: null,
  restablecimientoPendiente: null,
  ...datos,
});

const USUARIOS = [
  usuario({
    id: 'u1',
    nombre: 'Daniela Méndez',
    username: 'dmendez',
    asignaciones: [asignacion('ACOPIO', SALITRE), asignacion('ACOPIO', SAN_JOSE)],
  }),
  usuario({
    id: 'u2',
    nombre: 'Jorge Rincón',
    username: 'jrincon',
    asignaciones: [asignacion('ACOPIO', SALITRE)],
    restablecimientoPendiente: { venceEn: '2026-10-02T12:00:00.000Z' },
  }),
  usuario({
    id: 'u3',
    nombre: 'Luisa Cárdenas',
    rol: 'RECEPTOR',
    estado: 'INVITADO',
    asignaciones: [asignacion('ZONA', CARMEN)],
  }),
  usuario({ id: 'u4', nombre: 'Ana Admin', rol: 'ADMIN' }),
  usuario({ id: 'u5', nombre: 'Beto Admin', rol: 'ADMIN' }),
  usuario({ id: 'u6', nombre: 'Carla Donadora', rol: 'DONADOR' }),
];

const persona = (rol: UsuarioSesion['rol']): UsuarioSesion => ({
  id: 'yo',
  username: 'yo',
  nombre: 'Joseph Quintero',
  rol,
});

const pantalla = (rol: UsuarioSesion['rol'] = 'ADMIN') => {
  responderSegun({
    'GET /api/usuarios': USUARIOS,
    'GET /api/ubicaciones': UBICACIONES,
    'GET /api/ubicaciones/mias': [],
  });
  return render(envolver(<Rutas />, '/consola/accesos', clienteFalso(persona(rol))));
};

const porUbicacion = () => screen.findByRole('region', { name: 'Por ubicación' });

describe('Matriz de acceso', () => {
  it('por ubicación: elige la primera y dice quién puede tocarla', async () => {
    pantalla();
    const vista = await porUbicacion();
    const selector = within(vista).getByRole('combobox', { name: 'Ubicación' });
    expect(await within(vista).findByText('Daniela Méndez')).toBeInTheDocument();
    expect(selector).toHaveDisplayValue('Coliseo El Salitre · Bogotá');
    expect(within(vista).getByText('Jorge Rincón')).toBeInTheDocument();
    expect(within(vista).queryByText('Luisa Cárdenas')).not.toBeInTheDocument();
    expect(within(vista).getByRole('status')).toHaveTextContent(
      '2 personas pueden tocar este acopio. Además, los 2 administradores pueden tocar todas las ubicaciones.',
    );
  });

  it('cambiar la ubicación cambia la lista', async () => {
    pantalla();
    const vista = await porUbicacion();
    await within(vista).findByText('Daniela Méndez');
    await userEvent.selectOptions(
      within(vista).getByRole('combobox', { name: 'Ubicación' }),
      CARMEN,
    );
    expect(within(vista).getByText('Luisa Cárdenas')).toBeInTheDocument();
    expect(within(vista).queryByText('Daniela Méndez')).not.toBeInTheDocument();
    expect(within(vista).getByRole('status')).toHaveTextContent('1 persona puede tocar esta zona.');
  });

  it('marca el restablecimiento pendiente', async () => {
    pantalla();
    const vista = await porUbicacion();
    const jorge = (await within(vista).findByText('Jorge Rincón')).closest('li')!;
    expect(jorge).toHaveTextContent('Restablecimiento pendiente');
  });

  it('los filtros de rol y estado se aplican a las dos vistas', async () => {
    pantalla();
    const vista = await porUbicacion();
    await within(vista).findByText('Daniela Méndez');
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Estado' })).getByRole('button', {
        name: 'Invitados',
      }),
    );
    expect(within(vista).queryByText('Daniela Méndez')).not.toBeInTheDocument();
    const tabla = screen.getByRole('table', { name: 'Personas por ubicación' });
    expect(within(tabla).getAllByRole('row')).toHaveLength(2);
    expect(tabla).toHaveTextContent('Luisa Cárdenas');
  });

  it('la tabla cruza personas con ubicaciones, sin Administradores ni Donadores', async () => {
    pantalla();
    const tabla = await screen.findByRole('table', { name: 'Personas por ubicación' });
    await within(tabla).findByText('Daniela Méndez');
    const encabezados = within(tabla)
      .getAllByRole('columnheader')
      .map((c) => c.textContent);
    expect(encabezados[1]).toContain('Coliseo El Salitre');
    expect(encabezados[3]).toContain('Vereda El Carmen');
    expect(tabla).not.toHaveTextContent('Ana Admin');
    expect(tabla).not.toHaveTextContent('Carla Donadora');
    const daniela = within(tabla)
      .getByRole('rowheader', { name: /Daniela Méndez/ })
      .closest('tr')!;
    expect(
      within(daniela)
        .getAllByRole('cell')
        .slice(0, 3)
        .map((c) => c.querySelector('.sr-only')?.textContent),
    ).toEqual(['Sí', 'Sí', 'No']);
  });

  it('exporta el CSV con los filtros aplicados', async () => {
    const crear = vi.fn((_: Blob) => 'blob:matriz');
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    pantalla();
    await within(await porUbicacion()).findByText('Daniela Méndez');
    await userEvent.click(
      within(screen.getByRole('group', { name: 'Rol' })).getByRole('button', { name: 'Receptor' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
    expect(clic).toHaveBeenCalledTimes(1);
    const texto = await crear.mock.calls[0]![0].text();
    expect(texto).toContain('Luisa Cárdenas');
    expect(texto).not.toContain('Daniela Méndez');
  });

  it('el Auditor también entra, y vuelve a «Más»', async () => {
    pantalla('AUDITOR');
    await within(await porUbicacion()).findByText('Daniela Méndez');
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/mas');
  });

  it('un Operador no entra', async () => {
    pantalla('OPERADOR');
    expect(await screen.findByText(/no tienes permiso|No tienes acceso/i)).toBeInTheDocument();
  });

  it('no tiene violaciones graves', async () => {
    const { container } = pantalla();
    await within(await porUbicacion()).findByText('Daniela Méndez');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
