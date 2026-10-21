import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { envolver } from '../pruebas/utilidades';
import { MarcoPortal } from './MarcoPortal';

it('al tocar Mapa en la barra, la página entra desde la derecha', async () => {
  render(
    envolver(
      <Routes>
        <Route element={<MarcoPortal />}>
          <Route path="/" element={<p>inicio</p>} />
          <Route path="/mapa" element={<p>mapa</p>} />
        </Route>
      </Routes>,
      '/',
    ),
  );
  expect(await screen.findByText('inicio')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Mapa' }));
  expect(await screen.findByText('mapa')).toBeInTheDocument();
  expect(screen.getByText('mapa').closest('.entra-adelante')).not.toBeNull();
});
