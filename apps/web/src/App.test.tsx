import { render, screen } from '@testing-library/react';
import { App } from './App';

it('la aplicación arranca y muestra el nombre del producto', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Acopio' })).toBeInTheDocument();
});
