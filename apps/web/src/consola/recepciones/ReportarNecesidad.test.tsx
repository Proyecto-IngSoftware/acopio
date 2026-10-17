import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, cuerpoDe, envolver, responderSegun } from '../../pruebas/utilidades';
import { RECEPTORA } from './datos-prueba';
import { ReportarNecesidad } from './ReportarNecesidad';

const cat = (categoriaId: string, categoria: string) => ({
  categoriaId,
  categoria,
  unidad: 'UNIDAD',
  origen: 'CANASTA',
  cantidadPersonaDia: 1,
  fuenteCanasta: null,
  manual: null,
  necesidad: 100,
  recibido: 0,
  enCamino: 0,
  deficit: 100,
  cobertura: 0,
});

const FICHA = {
  zona: {
    id: 'z1',
    nombre: 'Barrio San Agustín (prueba)',
    municipio: 'Mocoa',
    poblacionEstimada: 1200,
    poblacionFuente: 'Demo',
    poblacionFecha: '2026-10-02T00:00:00.000Z',
    emergencia: { id: 'e1', nombre: 'Inundaciones', estado: 'ACTIVA', horizonteDias: 7 },
  },
  categorias: [cat('c-agua', 'Agua potable'), cat('c-arroz', 'Arroz'), cat('c-panales', 'Pañales')],
  coberturaGlobal: 0,
  categoriaMasBaja: null,
  reportes: [],
};

const hace = (horas: number) => new Date(Date.now() - horas * 3600_000).toISOString();
const reporte = (categoriaId: string, categoria: string, resuelta: boolean, horas: number) => ({
  id: `${categoriaId}-${horas}`,
  categoriaId,
  categoria,
  nota: null,
  resuelta,
  reportadoPor: 'Alejandra',
  reportadoEn: hace(horas),
});

function Ubicacion() {
  const l = useLocation();
  return <p data-testid="ruta">{l.pathname + l.search}</p>;
}

function pantalla() {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/zonas/:id/reportar" element={<ReportarNecesidad />} />
        <Route path="/consola/zonas/:id" element={<Ubicacion />} />
      </Routes>,
      '/consola/zonas/z1/reportar',
      clienteFalso(RECEPTORA),
    ),
  );
}

const BASE = {
  'GET /api/zonas/*/necesidad': FICHA,
  'GET /api/zonas/*/reportes': [],
  'POST /api/zonas/*/reportes': { creados: ['x'] },
};

it('reporta lo que falta con las categorías de la zona y vuelve a la ficha', async () => {
  responderSegun(BASE);
  pantalla();
  const grupo = await screen.findByRole('group', { name: 'Categorías' });
  expect(screen.getByRole('radio', { name: 'Falta' })).toBeChecked();
  expect(within(grupo).getAllByRole('checkbox')).toHaveLength(3);
  const aviso = screen.getByText(
    'La nota se ve en el mapa público tal como la escribas. No pongas nombres, teléfonos ni datos de personas.',
  );
  const nota = screen.getByLabelText('Nota pública (opcional)');
  expect(aviso.compareDocumentPosition(nota) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const enviar = screen.getByRole('button', { name: /Reportar/ });
  expect(enviar).toBeDisabled();
  await userEvent.click(within(grupo).getByRole('checkbox', { name: 'Agua potable' }));
  await userEvent.click(within(grupo).getByRole('checkbox', { name: 'Pañales' }));
  expect(screen.getByRole('button', { name: 'Reportar 2 categorías' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button', { name: 'Reportar 2 categorías' }));
  expect(await screen.findByTestId('ruta')).toHaveTextContent('/consola/zonas/z1?reportado=2');
  expect(await cuerpoDe('POST /api/zonas/z1/reportes')).toEqual({
    categorias: ['c-agua', 'c-panales'],
    resuelta: false,
  });
});

it('el buscador filtra las categorías por nombre', async () => {
  responderSegun(BASE);
  pantalla();
  const grupo = await screen.findByRole('group', { name: 'Categorías' });
  await userEvent.type(screen.getByLabelText('Buscar categoría'), 'arr');
  expect(
    within(grupo)
      .getAllByRole('checkbox')
      .map((c) => c.getAttribute('aria-label') ?? ''),
  ).toHaveLength(1);
  expect(within(grupo).getByRole('checkbox', { name: 'Arroz' })).toBeInTheDocument();
});

it('manda la nota cuando se escribe', async () => {
  responderSegun(BASE);
  pantalla();
  const grupo = await screen.findByRole('group', { name: 'Categorías' });
  await userEvent.click(within(grupo).getByRole('checkbox', { name: 'Arroz' }));
  await userEvent.type(screen.getByLabelText('Nota pública (opcional)'), 'Falta en el coliseo');
  expect(screen.getByText('19 / 280')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reportar 1 categoría' }));
  await screen.findByTestId('ruta');
  expect(await cuerpoDe('POST /api/zonas/z1/reportes')).toEqual({
    categorias: ['c-arroz'],
    nota: 'Falta en el coliseo',
    resuelta: false,
  });
});

it('«Ya se resolvió» lista solo lo que sigue reportado y lo marca resuelto', async () => {
  responderSegun({
    ...BASE,
    'GET /api/zonas/*/reportes': [
      reporte('c-agua', 'Agua potable', false, 3),
      reporte('c-arroz', 'Arroz', false, 5),
      reporte('c-arroz', 'Arroz', true, 1),
    ],
  });
  pantalla();
  await screen.findByRole('group', { name: 'Categorías' });
  await userEvent.click(screen.getByRole('radio', { name: 'Ya se resolvió' }));
  const grupo = screen.getByRole('group', { name: 'Categorías' });
  expect(within(grupo).getAllByRole('checkbox')).toHaveLength(1);
  expect(grupo).toHaveTextContent('Reportada hace 3 h');
  expect(screen.queryByLabelText('Nota pública (opcional)')).not.toBeInTheDocument();
  await userEvent.click(within(grupo).getByRole('checkbox', { name: 'Agua potable' }));
  await userEvent.click(screen.getByRole('button', { name: 'Marcar 1 como resuelta' }));
  expect(await screen.findByTestId('ruta')).toHaveTextContent('/consola/zonas/z1?resuelto=1');
  expect(await cuerpoDe('POST /api/zonas/z1/reportes')).toEqual({
    categorias: ['c-agua'],
    resuelta: true,
  });
});

it('sin nada reportado, «Ya se resolvió» lo dice', async () => {
  responderSegun(BASE);
  pantalla();
  await screen.findByRole('group', { name: 'Categorías' });
  await userEvent.click(screen.getByRole('radio', { name: 'Ya se resolvió' }));
  expect(
    await screen.findByText('No hay necesidades reportadas en esta zona.'),
  ).toBeInTheDocument();
});

it('la nota se corta en 280 caracteres', async () => {
  responderSegun(BASE);
  pantalla();
  expect(await screen.findByLabelText('Nota pública (opcional)')).toHaveAttribute(
    'maxLength',
    '280',
  );
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(BASE);
  const { container } = pantalla();
  await screen.findByRole('group', { name: 'Categorías' });
  expect(await violacionesGraves(container)).toEqual([]);
});
