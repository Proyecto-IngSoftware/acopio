import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
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

it('la entrada no se corta si la página se vuelve a dibujar en la misma ruta', async () => {
  render(
    envolver(
      <Routes>
        <Route element={<MarcoPortal />}>
          <Route path="/" element={<p>inicio</p>} />
          <Route
            path="/mapa"
            element={
              <Link to="/mapa?vista=lista" replace>
                Ver lista
              </Link>
            }
          />
        </Route>
      </Routes>,
      '/',
    ),
  );
  await userEvent.click(await screen.findByRole('link', { name: 'Mapa' }));
  // Cambiar la consulta vuelve a dibujar el marco sin cambiar de ruta
  await userEvent.click(await screen.findByRole('link', { name: 'Ver lista' }));
  expect(screen.getByRole('link', { name: 'Ver lista' }).closest('.entra-adelante')).not.toBeNull();
});
