import { render, screen } from '@testing-library/react';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { envolver } from '../pruebas/utilidades';
import * as contacto from './contacto';
import { Privacidad } from './Privacidad';

vi.mock('./contacto', () => ({ CORREO_PRIVACIDAD: null as string | null }));
const fijarCorreo = (correo: string | null) =>
  Object.defineProperty(contacto, 'CORREO_PRIVACIDAD', { value: correo, configurable: true });

const pantalla = () => render(envolver(<Privacidad />, '/privacidad'));

describe('Privacidad', () => {
  it('muestra las cinco secciones', () => {
    pantalla();
    expect(screen.getByRole('heading', { level: 1, name: 'Cómo usamos tus datos' })).toBeVisible();
    for (const t of [
      'Qué guardamos',
      'Para qué',
      'La foto de la factura',
      'Tus derechos',
      'Quién responde',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: t })).toBeInTheDocument();
    }
    expect(screen.getByText(/12 meses después de cerrar la donación/)).toBeInTheDocument();
    expect(screen.getByText(/Acopio no recibe dinero/)).toBeInTheDocument();
  });

  it('sin correo configurado no muestra dirección', () => {
    fijarCorreo(null);
    pantalla();
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument();
    expect(screen.queryByText(/Escríbenos a/)).not.toBeInTheDocument();
  });

  it('con correo configurado lo muestra como enlace', () => {
    fijarCorreo('datos@acopio.example');
    pantalla();
    expect(screen.getByRole('link', { name: 'datos@acopio.example' })).toHaveAttribute(
      'href',
      'mailto:datos@acopio.example',
    );
  });

  it('axe: sin violaciones graves', async () => {
    fijarCorreo('datos@acopio.example');
    const { container } = pantalla();
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
