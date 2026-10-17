import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import { GENERAL, HACIA_ZONA, RECEPTORA } from './datos-prueba';
import { Recepciones } from './Recepciones';

type Abrir = (video: unknown, alLeer: (codigo: string) => void) => Promise<() => void>;
const camara = vi.hoisted(() => ({ abrir: (async () => () => {}) as Abrir }));
vi.mock('../inventario/camara', () => ({
  abrirCamara: (...a: Parameters<Abrir>) => camara.abrir(...a),
}));

function Ubicacion() {
  return <p data-testid="ruta">{useLocation().pathname}</p>;
}

function pantalla() {
  return render(
    envolver(
      <>
        <Recepciones />
        <Ubicacion />
      </>,
      '/consola/recepciones',
      clienteFalso(RECEPTORA),
    ),
  );
}

it('muestra cada remisión en camino con su origen, su destino y lo que trae', async () => {
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA, GENERAL] });
  pantalla();
  const zona = await screen.findByRole('link', { name: /R-2026-DEMA2/ });
  expect(zona).toHaveAttribute('href', '/consola/recepciones/R-2026-DEMA2');
  expect(zona).toHaveTextContent('Desde Acopio Kennedy (prueba)');
  expect(zona).toHaveTextContent('Para Barrio San Agustín (prueba)');
  expect(zona).toHaveTextContent('Agua potable 400 L');
  const general = screen.getByRole('link', { name: /R-2026-DEMA3/ });
  expect(general).toHaveTextContent('Despacho general: eliges la zona al recibir');
  expect(general).toHaveTextContent('Arroz 60 kg');
});

it('sin remisiones en camino lo dice', async () => {
  responderSegun({ 'GET /api/recepciones': [] });
  pantalla();
  expect(
    await screen.findByText(
      'No hay remisiones en camino a tus zonas. Cuando un acopio despache una, aparece aquí.',
    ),
  ).toBeInTheDocument();
});

it('al leer el QR del documento abre esa remisión', async () => {
  camara.abrir = async (_v, alLeer) => {
    setTimeout(() => alLeer('https://acopio.josephqaz.dev/consola/recepciones/qr/tok1'), 0);
    return () => {};
  };
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Escanear el QR/ }));
  await waitFor(() =>
    expect(screen.getByTestId('ruta')).toHaveTextContent('/consola/recepciones/qr/tok1'),
  );
});

it('un código que no es de una remisión se avisa y no navega', async () => {
  camara.abrir = async (_v, alLeer) => {
    setTimeout(() => alLeer('https://otra.com/x'), 0);
    return () => {};
  };
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Escanear el QR/ }));
  expect(await screen.findByText('Ese código no es el QR de una remisión.')).toBeInTheDocument();
  expect(screen.getByTestId('ruta')).toHaveTextContent(/^\/consola\/recepciones$/);
});

it('sin cámara cierra el escáner y deja la lista', async () => {
  camara.abrir = () => Promise.reject(new Error('NotAllowedError'));
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Escanear el QR/ }));
  expect(
    await screen.findByText('No pudimos abrir la cámara. Toca la remisión en la lista.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('dialog', { name: 'Escáner' })).not.toBeInTheDocument();
});

it('«Ver la lista» cierra el escáner', async () => {
  camara.abrir = async () => () => {};
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA] });
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: /Escanear el QR/ }));
  const escaner = await screen.findByRole('dialog', { name: 'Escáner' });
  await userEvent.click(within(escaner).getByRole('button', { name: 'Ver la lista' }));
  expect(screen.queryByRole('dialog', { name: 'Escáner' })).not.toBeInTheDocument();
});

it('sin red pide conexión', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  responderSegun({});
  pantalla();
  expect(await screen.findByText(/necesita conexión/)).toBeInTheDocument();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/recepciones': [HACIA_ZONA, GENERAL] });
  const { container } = pantalla();
  await screen.findByRole('link', { name: /R-2026-DEMA2/ });
  expect(await violacionesGraves(container)).toEqual([]);
});
