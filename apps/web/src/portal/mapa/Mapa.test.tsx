import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { acopioDePrueba } from '../../pruebas/datos-red';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Mapa } from './Mapa';

vi.mock('./MapaAcopios', () => ({ default: () => <div>mapa de acopios</div> }));

const ACOPIOS = [
  acopioDePrueba({ id: 'x1', nombre: 'Acopio Chapinero' }),
  acopioDePrueba({
    id: 'x2',
    nombre: 'Acopio Suba',
    estado: 'PAUSADO',
    abiertoAhora: false,
    entidad: { id: 'e2', nombre: 'Parroquia San José' },
  }),
];
const RESPUESTAS = {
  'GET /api/acopios': ACOPIOS,
  'GET /api/categorias/vigentes': [
    {
      id: 'c2',
      nombre: 'Ropa usada',
      grupo: 'ROPA_Y_ABRIGO',
      unidadBase: 'UNIDAD',
      perecedero: false,
      sinonimos: [],
      archivada: false,
    },
  ],
  'GET /api/no-recibir': [{ acopioId: 'x2', hasta: null }],
  'GET /api/geocodificar': [{ etiqueta: 'Calle 72, Bogotá', lat: 4.658, lng: -74.06 }],
};
const pantalla = (ruta = '/mapa?vista=lista') => render(envolver(<Mapa />, ruta));

it('la lista muestra cada acopio con su entidad, estado y enlace a la ficha', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  const chapinero = await screen.findByRole('link', { name: /Acopio Chapinero/ });
  expect(chapinero).toHaveAttribute('href', '/acopios/x1');
  expect(chapinero).toHaveTextContent('Fundación Manos Unidas');
  expect(screen.getByRole('link', { name: /Acopio Suba/ })).toHaveTextContent('Pausado');
});

it('«Abierto ahora» filtra en la API y queda en la URL', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('link', { name: /Acopio Chapinero/ });
  await userEvent.click(screen.getByRole('button', { name: 'Abierto ahora' }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?abiertoAhora=true'));
});

it('lo que vas a llevar oculta los acopios que no lo reciben y lo dice', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await screen.findByRole('option', { name: 'Ropa usada' });
  await userEvent.selectOptions(screen.getByLabelText('¿Qué vas a llevar?'), 'Ropa usada');
  expect(
    await screen.findByText('Ocultamos 1 acopio que hoy no recibe ropa usada.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Acopio Suba/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
});

it('«Cerca de mí» ordena por distancia y la ficha recibe el punto', async () => {
  responderSegun(RESPUESTAS);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (ok: (p: unknown) => void) =>
        ok({ coords: { latitude: 4.65, longitude: -74.06 } }),
    },
  });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Cerca de mí' }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?cerca=4.65%2C-74.06'));
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toHaveAttribute(
    'href',
    '/acopios/x1?cerca=4.65%2C-74.06',
  );
});

it('buscar una dirección usa la geocodificación y centra la búsqueda ahí', async () => {
  responderSegun(RESPUESTAS);
  pantalla();
  await userEvent.type(await screen.findByLabelText('Buscar una dirección'), 'Calle 72');
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  await userEvent.click(await screen.findByRole('button', { name: /Calle 72, Bogotá/ }));
  await waitFor(() => expect(peticiones()).toContain('GET /api/acopios?cerca=4.658%2C-74.06'));
});

it('la vista de mapa carga el mapa y deja pasar a la lista', async () => {
  responderSegun(RESPUESTAS);
  pantalla('/mapa');
  expect(await screen.findByText('mapa de acopios')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: 'Lista' }));
  expect(await screen.findByRole('link', { name: /Acopio Chapinero/ })).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun(RESPUESTAS);
  const { container } = pantalla();
  await screen.findByRole('link', { name: /Acopio Chapinero/ });
  expect(await violacionesGraves(container)).toEqual([]);
  expect(within(container).getByRole('heading', { level: 1 })).toHaveTextContent('Mapa de acopios');
});
