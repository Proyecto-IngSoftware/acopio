import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { causaDePrueba } from '../../pruebas/datos-causas';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { Directorio } from './Directorio';
import { ImagenCausa } from './piezas';

const DOS = [
  causaDePrueba(),
  causaDePrueba({
    id: 'c2',
    categoria: 'ANIMALES',
    titulo: 'Alimento para animales rescatados',
    entidad: {
      id: 'e2',
      nombre: 'Huellas del Putumayo',
      tieneLogo: false,
      verificadaEn: '2026-08-10T15:00:00.000Z',
    },
  }),
];

it('muestra las causas con su sello y el aviso de que Acopio no recibe dinero', async () => {
  responderSegun({ 'GET /api/causas': DOS });
  const { container } = render(envolver(<Directorio />, '/causas'));
  expect(
    await screen.findByText('Mercados para familias damnificadas en Mocoa'),
  ).toBeInTheDocument();
  expect(screen.getByText('Verificada el 12 de agosto de 2026')).toBeInTheDocument();
  expect(screen.getByText(/Acopio no recibe dinero/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Mercados para familias/ })).toHaveAttribute(
    'href',
    '/causas/c1',
  );
  // Personas desaparecidas siempre está en «Todas», al final
  expect(screen.getByRole('heading', { name: 'Personas desaparecidas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Causas atendidas/ })).toHaveAttribute(
    'href',
    '/causas/atendidas',
  );
  expect(await violacionesGraves(container)).toEqual([]);
});

it('el chip de personas desaparecidas muestra solo los tres enlaces oficiales', async () => {
  responderSegun({ 'GET /api/causas': DOS });
  render(envolver(<Directorio />, '/causas'));
  await screen.findByText('Mercados para familias damnificadas en Mocoa');
  await userEvent.click(screen.getByRole('button', { name: 'Personas desaparecidas' }));
  expect(
    screen.queryByText('Mercados para familias damnificadas en Mocoa'),
  ).not.toBeInTheDocument();
  const tarjeta = screen.getByRole('region', { name: 'Personas desaparecidas' });
  const enlaces = within(tarjeta).getAllByRole('link');
  expect(enlaces.map((e) => e.getAttribute('href'))).toEqual([
    'https://ubpdbusquedadesaparecidos.co',
    'https://www.cruzrojacolombiana.org',
    'https://www.medicinalegal.gov.co',
  ]);
  for (const e of enlaces) expect(e).toHaveAttribute('rel', 'noopener noreferrer');
});

it('un chip de categoría pide solo esa categoría', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Directorio />, '/causas'));
  await userEvent.click(await screen.findByRole('button', { name: 'Animales' }));
  expect(await screen.findByText('Aún no hay causas de animales')).toBeInTheDocument();
  expect(peticiones()).toContain('GET /api/causas?categoria=ANIMALES');
});

it('sin causas publicadas lo dice, y deja personas desaparecidas', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Directorio />, '/causas'));
  expect(await screen.findByText('Aún no hay causas')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Personas desaparecidas' })).toBeInTheDocument();
});

describe('otras plataformas que ayudan (al final de Causas)', () => {
  const PLATAFORMAS = [
    {
      id: 'p1',
      nombre: 'Reconstruyo Colombia',
      categoria: 'Donaciones',
      descripcion: 'Iniciativa nacional para canalizar donaciones económicas.',
      url: 'https://reconstruyocolombia.com/',
      tieneImagen: true,
      actualizadoEn: '2026-10-19T12:00:00.000Z',
    },
    {
      id: 'p2',
      nombre: 'Donando Talento',
      categoria: 'Voluntariado profesional',
      descripcion: 'Conecta profesionales con proyectos que necesitan sus habilidades.',
      url: 'https://donandotalento.com/',
      tieneImagen: false,
      actualizadoEn: '2026-10-19T12:00:00.000Z',
    },
  ];
  const conPlataformas = () =>
    responderSegun({ 'GET /api/causas': DOS, 'GET /api/publico/plataformas': PLATAFORMAS });

  it('lista cada plataforma con su foto o el ícono de su categoría y un enlace que abre afuera', async () => {
    conPlataformas();
    render(envolver(<Directorio />, '/causas'));
    const seccion = await screen.findByRole('region', { name: 'Otras plataformas que ayudan' });
    const reconstruyo = within(seccion)
      .getByRole('heading', { name: 'Reconstruyo Colombia' })
      .closest('li')!;
    expect(reconstruyo.querySelector('img')).toHaveAttribute(
      'src',
      '/api/publico/plataformas/p1/imagen?v=2026-10-19T12%3A00%3A00.000Z',
    );
    const ir = within(reconstruyo).getByRole('link', {
      name: /Ir al sitio de Reconstruyo Colombia/,
    });
    expect(ir).toHaveAttribute('href', 'https://reconstruyocolombia.com/');
    expect(ir).toHaveAttribute('target', '_blank');
    const talento = within(seccion)
      .getByRole('heading', { name: 'Donando Talento' })
      .closest('li')!;
    expect(talento.querySelector('img')).toBeNull();
    expect(talento).toHaveTextContent('Voluntariado profesional');
    expect(within(seccion).getByText(/Acopio no los verifica/)).toBeInTheDocument();
  });

  it('va después de las causas y antes de «Causas atendidas», sin sello de verificación', async () => {
    conPlataformas();
    render(envolver(<Directorio />, '/causas'));
    const seccion = await screen.findByRole('region', { name: 'Otras plataformas que ayudan' });
    const causa = screen.getByRole('link', { name: /Mercados para familias/ });
    const atendidas = screen.getByRole('link', { name: /Causas atendidas/ });
    expect(causa.compareDocumentPosition(seccion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      seccion.compareDocumentPosition(atendidas) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(seccion).queryByText(/Verificada el/)).not.toBeInTheDocument();
  });

  it('con un filtro de categoría no se muestra', async () => {
    conPlataformas();
    render(envolver(<Directorio />, '/causas'));
    await screen.findByRole('region', { name: 'Otras plataformas que ayudan' });
    await userEvent.click(screen.getByRole('button', { name: 'Animales' }));
    expect(
      screen.queryByRole('region', { name: 'Otras plataformas que ayudan' }),
    ).not.toBeInTheDocument();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    conPlataformas();
    const { container } = render(envolver(<Directorio />, '/causas'));
    await screen.findByRole('region', { name: 'Otras plataformas que ayudan' });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

it('sin causas, el vacío lleva las cajas', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Directorio />, '/causas'));
  expect(
    await screen.findByRole('img', { name: 'Cajas de ayuda ordenadas en una bodega' }),
  ).toBeInTheDocument();
});

it('una causa sin foto lleva el mapa si es de rescatistas y las cajas si no', () => {
  const { container, rerender } = render(
    <ImagenCausa causa={causaDePrueba({ categoria: 'RESCATISTAS' })} />,
  );
  expect(
    container.querySelector('svg[aria-label="Mapa de curvas de nivel con un punto marcado"]'),
  ).not.toBeNull();
  rerender(<ImagenCausa causa={causaDePrueba({ categoria: 'ANIMALES' })} />);
  expect(
    container.querySelector('svg[aria-label="Cajas de ayuda ordenadas en una bodega"]'),
  ).not.toBeNull();
  // La imagen es decorativa: el lector de pantalla no la anuncia
  expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
});
