import { render, screen, waitFor } from '@testing-library/react';
import { envolver, peticiones, responderSegun } from '../pruebas/utilidades';
import { causaDePrueba } from '../pruebas/datos-causas';
import { urlImagenCausa, useCausas, type CausaPublica } from './causas';

function Lista({ categoria }: { categoria?: CausaPublica['categoria'] }) {
  const { data } = useCausas(categoria);
  return <p>{data ? data.map((c) => c.titulo).join(', ') : '…'}</p>;
}

it('pide las causas activas', async () => {
  responderSegun({ 'GET /api/causas': [causaDePrueba()] });
  render(envolver(<Lista />));
  expect(
    await screen.findByText('Mercados para familias damnificadas en Mocoa'),
  ).toBeInTheDocument();
  expect(peticiones()[0]).toBe('GET /api/causas');
});

it('filtra por categoría', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Lista categoria="ANIMALES" />));
  await waitFor(() => expect(peticiones()).toHaveLength(1));
  expect(peticiones()[0]).toBe('GET /api/causas?categoria=ANIMALES');
});

it('la imagen lleva la versión para no salir de la caché', () => {
  expect(urlImagenCausa(causaDePrueba({ tieneImagen: true }))).toBe(
    '/api/causas/c1/imagen?v=2026-10-17T15%3A00%3A00.000Z',
  );
  expect(urlImagenCausa(causaDePrueba())).toBeNull();
});
