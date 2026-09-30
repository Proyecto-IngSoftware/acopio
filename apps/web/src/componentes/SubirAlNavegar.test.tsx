import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { SubirAlNavegar } from './SubirAlNavegar';

it('al cambiar de ruta vuelve al inicio de la página', async () => {
  const subir = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const { getByRole } = render(
    <MemoryRouter initialEntries={['/a']}>
      <SubirAlNavegar />
      <Routes>
        <Route path="/a" element={<Link to="/b">ir</Link>} />
        <Route path="/b" element={<p>b</p>} />
      </Routes>
    </MemoryRouter>,
  );
  subir.mockClear();
  await userEvent.click(getByRole('link', { name: 'ir' }));
  expect(subir).toHaveBeenCalledWith(0, 0);
});
