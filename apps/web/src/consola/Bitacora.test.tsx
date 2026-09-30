import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { clienteFalso, envolver, responderJson } from '../pruebas/utilidades';
import { Bitacora } from './Bitacora';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const hoy = new Date();
hoy.setHours(14, 32, 0, 0);
const ayer = new Date(hoy.getTime() - 86_400_000);

const registro = (datos: Record<string, unknown>) => ({
  id: String(Math.random()),
  usuario_id: 'a',
  entidad_id: 'x',
  ubicacion_id: null,
  destacado: false,
  datos_antes: null,
  datos_despues: null,
  usuario: { id: 'a', username: 'admin', nombre: 'Joseph Quintero' },
  ...datos,
});

const PAGINA = {
  total: 3,
  pagina: 1,
  porPagina: 30,
  registros: [
    registro({
      accion: 'usuario.creado',
      entidad: 'usuario',
      ocurrido_en: hoy.toISOString(),
      datos_despues: { username: 'd.mendez', rol: 'OPERADOR' },
    }),
    registro({
      accion: 'acceso.restablecido',
      entidad: 'usuario',
      destacado: true,
      ocurrido_en: ayer.toISOString(),
    }),
    registro({
      accion: 'categoria.actualizada',
      entidad: 'categoria',
      ocurrido_en: ayer.toISOString(),
      datos_antes: { nombre: 'Juguetes', archivada: false },
      datos_despues: { nombre: 'Juguetes', archivada: true },
    }),
  ],
};

const urls = () => vi.mocked(globalThis.fetch).mock.calls.map(([p]) => (p as Request).url);
const pantalla = () => render(envolver(<Bitacora />, '/consola/bitacora', clienteFalso(ADMIN)));

it('muestra cada registro en lenguaje llano, agrupado por día', async () => {
  responderJson(PAGINA);
  pantalla();
  expect(await screen.findByText('Invitó a @d.mendez como Operador')).toBeInTheDocument();
  expect(screen.getByText('Archivó la categoría Juguetes')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Hoy' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Ayer' })).toBeInTheDocument();
  // Los tres registros son a las 14:32 (hoy y ayer)
  expect(screen.getAllByText(/Joseph Quintero · 14:32/)).toHaveLength(3);
  expect(screen.getByText('Mostrando 3 de 3')).toBeInTheDocument();
});

it('las píldoras filtran por tipo y por destacados', async () => {
  responderJson(PAGINA);
  pantalla();
  await screen.findByText('Invitó a @d.mendez como Operador');
  await userEvent.click(screen.getByRole('button', { name: 'Usuarios' }));
  expect(urls().at(-1)).toMatch(/entidad=usuario/);
  await userEvent.click(screen.getByRole('button', { name: 'Destacados' }));
  expect(urls().at(-1)).toMatch(/destacado=true/);
  expect(urls().at(-1)).not.toMatch(/entidad=/);
  expect(screen.getByRole('button', { name: 'Destacados' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('Filtrar aplica el rango de fechas', async () => {
  responderJson(PAGINA);
  pantalla();
  await screen.findByText('Invitó a @d.mendez como Operador');
  await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
  const hoja = screen.getByRole('dialog', { name: 'Filtrar la bitácora' });
  await userEvent.type(within(hoja).getByLabelText('Desde'), '2026-09-01');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Aplicar' }));
  expect(urls().at(-1)).toMatch(/desde=2026-09-01/);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('tocar un registro abre el detalle con el antes y el después', async () => {
  responderJson(PAGINA);
  pantalla();
  await userEvent.click(
    await screen.findByRole('button', { name: /Archivó la categoría Juguetes/ }),
  );
  const hoja = screen.getByRole('dialog', { name: 'Archivó la categoría Juguetes' });
  const fila = within(hoja).getByRole('row', { name: /archivada/ });
  expect(fila).toHaveTextContent('No');
  expect(fila).toHaveTextContent('Sí');
  expect(within(hoja).queryByRole('row', { name: /^nombre/ })).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('Cargar más pide la página siguiente y suma los registros', async () => {
  responderJson({ ...PAGINA, total: 4 });
  pantalla();
  await screen.findByText('Mostrando 3 de 4');
  responderJson({
    total: 4,
    pagina: 2,
    porPagina: 30,
    registros: [
      registro({
        accion: 'emergencia.creada',
        entidad: 'emergencia',
        ocurrido_en: ayer.toISOString(),
        datos_despues: { nombre: 'Sismo en Caldas' },
      }),
    ],
  });
  await userEvent.click(screen.getByRole('button', { name: 'Cargar más' }));
  expect(await screen.findByText('Creó la emergencia Sismo en Caldas')).toBeInTheDocument();
  expect(urls().at(-1)).toMatch(/pagina=2/);
  expect(screen.getByText('Mostrando 4 de 4')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cargar más' })).not.toBeInTheDocument();
});

it('sin registros lo dice', async () => {
  responderJson({ total: 0, pagina: 1, porPagina: 30, registros: [] });
  pantalla();
  expect(await screen.findByText('No hay registros con estos filtros.')).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad, tampoco con el detalle abierto', async () => {
  responderJson(PAGINA);
  const { container } = pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Archivó la categoría/ }));
  expect(await violacionesGraves(container)).toEqual([]);
});
