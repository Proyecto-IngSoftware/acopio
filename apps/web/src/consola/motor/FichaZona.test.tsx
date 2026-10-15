import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import {
  clienteFalso,
  conEstado,
  cuerpoDe,
  envolver,
  peticiones,
  responderSegun,
} from '../../pruebas/utilidades';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { FichaZona } from './FichaZona';

const ADMIN = { id: 'a', username: 'admin', nombre: 'Joseph Quintero', rol: 'ADMIN' as const };
const RECEPTOR = { id: 'r', username: 'rec', nombre: 'Laura Gómez', rol: 'RECEPTOR' as const };

const categoria = (datos: Record<string, unknown>) => ({
  categoriaId: 'c-agua',
  categoria: 'Agua potable',
  unidad: 'LITRO',
  origen: 'CANASTA',
  cantidadPersonaDia: 1,
  fuenteCanasta: 'Esfera',
  manual: null,
  necesidad: 8400,
  recibido: 0,
  enCamino: 1550,
  deficit: 6850,
  cobertura: 0,
  ...datos,
});

const ficha = (estado = 'ACTIVA', extra: Record<string, unknown> = {}) => ({
  zona: {
    id: 'z1',
    nombre: 'Barrio San Agustín',
    municipio: 'Mocoa',
    poblacionEstimada: 1200,
    poblacionFuente: 'Censo de la alcaldía',
    poblacionFecha: '2026-10-02T00:00:00.000Z',
    emergencia: { id: 'e1', nombre: 'Inundaciones Putumayo', estado, horizonteDias: 7 },
  },
  categorias: [
    categoria({
      categoriaId: 'c-linternas',
      categoria: 'Linternas',
      unidad: 'UNIDAD',
      cantidadPersonaDia: null,
      fuenteCanasta: null,
      necesidad: 0,
      enCamino: 0,
      deficit: 0,
      cobertura: null,
    }),
    // 126 / 4200 = 0,03
    categoria({
      categoriaId: 'c-arroz',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      cantidadPersonaDia: 0.5,
      necesidad: 4200,
      recibido: 126,
      enCamino: 440,
      deficit: 3634,
      cobertura: 0.03,
    }),
    categoria({}),
    categoria({
      categoriaId: 'c-panales',
      categoria: 'Pañales',
      unidad: 'UNIDAD',
      origen: 'MANUAL',
      cantidadPersonaDia: null,
      fuenteCanasta: null,
      manual: {
        cantidad: 600,
        motivo: 'Hay 40 bebés en el coliseo',
        puestaPor: 'Joseph Quintero',
        puestaEn: '2026-10-13T15:00:00.000Z',
      },
      necesidad: 600,
      recibido: 150,
      enCamino: 0,
      deficit: 450,
      cobertura: 0.25,
    }),
  ],
  coberturaGlobal: 0.18,
  categoriaMasBaja: { categoriaId: 'c-agua', categoria: 'Agua potable', cobertura: 0 },
  reportes: [
    {
      categoriaId: 'c-panales',
      categoria: 'Pañales',
      nota: 'Las familias del coliseo no tienen pañales',
      reportadoEn: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
  ],
  ...extra,
});

const pantalla = (usuario: UsuarioSesion = ADMIN) =>
  render(
    envolver(
      <Routes>
        <Route path="/consola/zonas/:id" element={<FichaZona />} />
      </Routes>,
      '/consola/zonas/z1',
      clienteFalso(usuario),
    ),
  );

it('muestra la zona, su población con fuente y la cobertura global', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha() });
  pantalla();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Barrio San Agustín' }),
  ).toBeVisible();
  expect(screen.getByText('1.200 personas')).toBeInTheDocument();
  expect(screen.getByText(/Censo de la alcaldía · estimado el 2 de octubre/)).toBeInTheDocument();
  expect(screen.getByText('Horizonte: 7 días')).toBeInTheDocument();
  expect(screen.getByText('18 %')).toBeInTheDocument();
  expect(screen.getByText(/Lo más bajo:/)).toHaveTextContent('Agua potable · 0 %');
  expect(peticiones()).toContain('GET /api/zonas/z1/necesidad');
});

it('ordena las categorías por cobertura y deja al final las que no tienen necesidad', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha() });
  pantalla();
  const lista = await screen.findByRole('list', { name: 'Por categoría' });
  const filas = within(lista).getAllByRole('button');
  expect(filas.map((f) => f.firstElementChild?.firstElementChild?.textContent)).toEqual([
    'Agua potable',
    'Arroz',
    'Pañales',
    'Linternas',
  ]);
  expect(filas[0]).toHaveTextContent('Necesita 8.400 L');
  expect(filas[0]).toHaveTextContent('Faltan 6.850');
  expect(filas[1]).toHaveTextContent('3 %');
  expect(filas[2]).toHaveTextContent('Manual · «Hay 40 bebés en el coliseo» · Joseph Quintero');
  expect(filas[3]).toHaveTextContent('Sin necesidad calculada');
});

it('la hoja de una categoría muestra el cálculo y corrige la necesidad con motivo', async () => {
  responderSegun({
    'GET /api/zonas/*/necesidad': ficha(),
    'PUT /api/zonas/*/necesidad-manual/*': { cantidad: 10000 },
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /^Agua potable/ }));
  const hoja = screen.getByRole('dialog', { name: 'Agua potable' });
  expect(hoja).toHaveTextContent('8.400 L');
  expect(hoja).toHaveTextContent('Esfera');
  await userEvent.type(within(hoja).getByLabelText(/Necesidad para 7 días/), '10000');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar corrección' }));
  expect(within(hoja).getByText('Escribe el motivo')).toBeInTheDocument();
  expect(peticiones()).not.toContain('PUT /api/zonas/z1/necesidad-manual/c-agua');
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'Llegaron 300 familias desplazadas');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar corrección' }));
  expect(await cuerpoDe('PUT /api/zonas/z1/necesidad-manual/c-agua')).toEqual({
    cantidad: 10000,
    motivo: 'Llegaron 300 familias desplazadas',
  });
});

it('una categoría manual puede volver a la canasta, también con motivo', async () => {
  responderSegun({
    'GET /api/zonas/*/necesidad': ficha(),
    'PUT /api/zonas/*/necesidad-manual/*': { cantidad: null },
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /^Pañales/ }));
  const hoja = screen.getByRole('dialog', { name: 'Pañales' });
  await userEvent.type(within(hoja).getByLabelText('Motivo'), 'Ya hay datos del censo');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Volver a la canasta' }));
  expect(await cuerpoDe('PUT /api/zonas/z1/necesidad-manual/c-panales')).toEqual({
    cantidad: null,
    motivo: 'Ya hay datos del censo',
  });
});

it('ajustar la población manda los tres campos y explica la fecha repetida', async () => {
  responderSegun({
    'GET /api/zonas/*/necesidad': ficha(),
    'PATCH /api/zonas/*': conEstado(422, {
      estado: 422,
      codigo: 'POBLACION_SIN_FUENTE_NUEVA',
      mensaje: 'Un número nuevo necesita una fecha de estimación nueva',
    }),
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustar población' }));
  const hoja = screen.getByRole('dialog', { name: 'Ajustar población' });
  await userEvent.clear(within(hoja).getByLabelText('Personas'));
  await userEvent.type(within(hoja).getByLabelText('Personas'), '1500');
  await userEvent.type(within(hoja).getByLabelText('Fecha de la estimación'), '2026-10-02');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar población' }));
  expect(await cuerpoDe('PATCH /api/zonas/z1')).toEqual({
    poblacionEstimada: 1500,
    poblacionFuente: 'Censo de la alcaldía',
    poblacionFecha: '2026-10-02',
  });
  expect(
    await within(hoja).findByText('Un número nuevo necesita una fecha de estimación nueva'),
  ).toBeInTheDocument();
});

it('ajustar la población no manda un número vacío y acepta el punto de miles', async () => {
  responderSegun({
    'GET /api/zonas/*/necesidad': ficha(),
    'PATCH /api/zonas/*': { id: 'z1' },
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustar población' }));
  const hoja = screen.getByRole('dialog', { name: 'Ajustar población' });
  await userEvent.clear(within(hoja).getByLabelText('Personas'));
  await userEvent.type(within(hoja).getByLabelText('Fecha de la estimación'), '2026-10-14');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar población' }));
  expect(within(hoja).getByText('Escribe un número entero de personas')).toBeInTheDocument();
  expect(peticiones()).not.toContain('PATCH /api/zonas/z1');
  await userEvent.type(within(hoja).getByLabelText('Personas'), '1.500');
  await userEvent.click(within(hoja).getByRole('button', { name: 'Guardar población' }));
  expect(await cuerpoDe('PATCH /api/zonas/z1')).toMatchObject({ poblacionEstimada: 1500 });
});

it('con la emergencia cerrada la ficha queda en solo lectura', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha('CERRADA') });
  pantalla();
  expect(await screen.findByText(/La ficha queda en solo lectura/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ajustar población' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Agua potable/ }));
  expect(screen.queryByRole('button', { name: 'Guardar corrección' })).not.toBeInTheDocument();
});

it('el Receptor ve la ficha sin acciones', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha() });
  pantalla(RECEPTOR);
  expect(await screen.findByText('18 %')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ajustar población' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^Agua potable/ }));
  expect(screen.queryByRole('button', { name: 'Guardar corrección' })).not.toBeInTheDocument();
});

it('muestra lo que reporta el Receptor con su antigüedad', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha() });
  pantalla();
  const reportes = await screen.findByRole('region', { name: 'Lo que reporta el Receptor' });
  expect(reportes).toHaveTextContent('«Las familias del coliseo no tienen pañales»');
  expect(reportes).toHaveTextContent('hace 2 h');
});

it('sin red explica que necesita conexión', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  pantalla();
  expect(
    await screen.findByRole('heading', { name: 'La ficha de zona necesita conexión' }),
  ).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/zonas/*/necesidad': ficha() });
  const { container } = pantalla();
  await screen.findByText('18 %');
  expect(await violacionesGraves(container)).toEqual([]);
});
