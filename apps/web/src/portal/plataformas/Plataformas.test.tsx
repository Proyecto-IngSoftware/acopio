import { render, screen, within } from '@testing-library/react';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import { Plataformas } from './Plataformas';

const PLATAFORMAS = [
  {
    id: 'p1',
    nombre: 'Reconstruyo Colombia',
    categoria: 'Donaciones',
    descripcion: 'Iniciativa nacional para canalizar donaciones económicas.',
    url: 'https://reconstruyo.co/',
  },
  {
    id: 'p2',
    nombre: 'Donando Talento',
    categoria: 'Voluntariado profesional',
    descripcion: 'Conecta profesionales con proyectos que necesitan sus habilidades.',
    url: 'https://donandotalento.co/',
  },
];
const pantalla = () => render(envolver(<Plataformas />, '/plataformas'));

it('lista cada plataforma con su categoría y un enlace que abre afuera', async () => {
  responderSegun({ 'GET /api/publico/plataformas': PLATAFORMAS });
  pantalla();
  expect(
    screen.getByRole('heading', { level: 1, name: 'Otras plataformas que ayudan' }),
  ).toBeInTheDocument();
  const tarjeta = (await screen.findByRole('heading', { name: 'Reconstruyo Colombia' })).closest(
    'li',
  )!;
  expect(tarjeta).toHaveTextContent('Donaciones');
  const ir = within(tarjeta).getByRole('link', { name: /Ir al sitio de Reconstruyo Colombia/ });
  expect(ir).toHaveAttribute('href', 'https://reconstruyo.co/');
  expect(ir).toHaveAttribute('target', '_blank');
  expect(screen.getByRole('heading', { name: 'Donando Talento' })).toBeInTheDocument();
});

it('avisa que Acopio no las verifica y de dónde sale la lista', async () => {
  responderSegun({ 'GET /api/publico/plataformas': PLATAFORMAS });
  pantalla();
  await screen.findByRole('heading', { name: 'Reconstruyo Colombia' });
  expect(screen.getByText(/Acopio no las verifica/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'RedAcopio Bogotá' })).toHaveAttribute(
    'href',
    'https://redacopiobogota.com/herramientas',
  );
});

it('sin plataformas lo dice', async () => {
  responderSegun({ 'GET /api/publico/plataformas': [] });
  pantalla();
  expect(await screen.findByText('Todavía no hay plataformas en la lista')).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/publico/plataformas': PLATAFORMAS });
  const { container } = pantalla();
  await screen.findByRole('heading', { name: 'Reconstruyo Colombia' });
  expect(await violacionesGraves(container)).toEqual([]);
});
