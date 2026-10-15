import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { remision } from './datos-prueba';
import { Remisiones } from './Remisiones';

const persona = (rol: 'ADMIN' | 'OPERADOR') => ({
  id: 'u1',
  username: 'b.operador',
  nombre: 'Brayan Operador',
  rol,
});

function Ubicacion() {
  return <p data-testid="busqueda">{useLocation().search}</p>;
}

const GENERAL = remision({ id: 'r2', codigo: 'R-2026-M2X9D', zona: null });

function pantalla(rol: 'ADMIN' | 'OPERADOR' = 'OPERADOR', ruta = '/consola/remisiones') {
  return render(
    envolver(
      <>
        <Remisiones />
        <Ubicacion />
      </>,
      ruta,
      clienteFalso(persona(rol)),
    ),
  );
}

it('por defecto pide los borradores', async () => {
  responderSegun({ 'GET /api/remisiones': [remision({})], 'GET /api/ubicaciones/mias': [] });
  pantalla();
  await screen.findByRole('link', { name: /R-2026-K4P7Q/ });
  expect(peticiones()).toContain('GET /api/remisiones?estado=BORRADOR');
});

it('cambiar de estado pide ese estado y lo deja en la URL', async () => {
  responderSegun({ 'GET /api/remisiones': [], 'GET /api/ubicaciones/mias': [] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'En tránsito' }));
  await screen.findByText('No hay remisiones en tránsito');
  expect(peticiones()).toContain('GET /api/remisiones?estado=EN_TRANSITO');
  expect(screen.getByTestId('busqueda')).toHaveTextContent('estado=EN_TRANSITO');
});

it('cada fila lleva al detalle y un despacho general lo dice', async () => {
  responderSegun({
    'GET /api/remisiones': [remision({}), GENERAL],
    'GET /api/ubicaciones/mias': [],
  });
  pantalla();
  const fila = await screen.findByRole('link', { name: /R-2026-K4P7Q/ });
  expect(fila).toHaveAttribute('href', '/consola/remisiones/R-2026-K4P7Q');
  expect(fila).toHaveTextContent('Acopio Kennedy → Barrio San Agustín');
  expect(fila).toHaveTextContent('1 categoría');
  expect(screen.getByRole('link', { name: /R-2026-M2X9D/ })).toHaveTextContent('Despacho general');
});

it('el filtro «Despacho general» deja solo las que no tienen zona', async () => {
  responderSegun({
    'GET /api/remisiones': [remision({}), GENERAL],
    'GET /api/ubicaciones/mias': [],
  });
  pantalla();
  await userEvent.selectOptions(await screen.findByLabelText('Zona'), 'general');
  expect(screen.queryByRole('link', { name: /R-2026-K4P7Q/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /R-2026-M2X9D/ })).toBeInTheDocument();
});

it('el Operador ve los traslados de su acopio y el botón para crear', async () => {
  responderSegun({ 'GET /api/remisiones': [], 'GET /api/ubicaciones/mias': [] });
  pantalla('OPERADOR');
  expect(await screen.findByText('Traslados de tu acopio')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Nueva remisión' })).toHaveAttribute(
    'href',
    '/consola/remisiones/nueva',
  );
});

it('sin borradores explica de dónde salen', async () => {
  responderSegun({ 'GET /api/remisiones': [], 'GET /api/ubicaciones/mias': [] });
  pantalla('ADMIN');
  const vacio = await screen.findByText('No hay remisiones en borrador');
  expect(vacio.parentElement!).toHaveTextContent(
    'Aprueba sugerencias en el motor o crea una remisión a mano',
  );
  expect(screen.getByText('Todos los acopios')).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/remisiones': [remision({})], 'GET /api/ubicaciones/mias': [] });
  const { container } = pantalla();
  await screen.findByRole('link', { name: /R-2026-K4P7Q/ });
  expect(await violacionesGraves(container)).toEqual([]);
  expect(within(container).getAllByRole('button').length).toBeGreaterThan(0);
});
