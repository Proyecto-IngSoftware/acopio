import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { conEstado, envolver, responderSegun } from '../pruebas/utilidades';
import { Seguimiento } from './Seguimiento';

const seguimiento = {
  folio: 'ACO-2026-7KQ4M',
  estado: 'Recibida en el acopio',
  pasos: [
    { paso: 'PREPARADA', en: '2026-10-03T14:12:00.000Z' },
    { paso: 'RECIBIDA', en: '2026-10-04T15:40:00.000Z', acopio: 'Parroquia San José' },
    { paso: 'CONCILIADA', en: null },
  ],
  lineas: [
    { categoria: 'Arroz', unidad: 'KILOGRAMO', cantidad: 10, confirmada: true },
    { categoria: 'Agua potable', unidad: 'LITRO', cantidad: 7.2, confirmada: true },
  ],
};

function Ubicacion() {
  const navegar = useNavigate();
  return (
    <>
      <output data-testid="ruta">{useLocation().pathname}</output>
      <button onClick={() => navegar('/seguimiento/ACO-2026-ZZZZZ')}>Ir a otro folio</button>
    </>
  );
}

const pantalla = (ruta: string) =>
  render(
    envolver(
      <>
        <Routes>
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/seguimiento/:folio" element={<Seguimiento />} />
        </Routes>
        <Ubicacion />
      </>,
      ruta,
    ),
  );

describe('Seguimiento', () => {
  it('con resultado muestra folio, estado, línea de tiempo y lo que entró', async () => {
    responderSegun({ 'GET /api/seguimiento/*': seguimiento });
    pantalla('/seguimiento/ACO-2026-7KQ4M');
    expect(await screen.findByText('Recibida en el acopio')).toBeInTheDocument();
    expect(screen.getByText('ACO-2026-7KQ4M', { selector: 'span' })).toBeInTheDocument();
    const tiempo = screen.getByRole('list', { name: 'Avance de la donación' });
    const pasos = within(tiempo).getAllByRole('listitem');
    expect(pasos).toHaveLength(3);
    expect(pasos[0]).toHaveTextContent('Preparada');
    expect(pasos[0]).toHaveTextContent(/3 oct.*9:12\s*a\. m\./);
    expect(pasos[1]).toHaveTextContent('Recibida en Parroquia San José');
    expect(pasos[1]).toHaveTextContent(/4 oct.*10:40\s*a\. m\./);
    expect(screen.getByRole('heading', { name: 'Lo que entró al acopio' })).toBeInTheDocument();
    expect(screen.getByText('10 kg')).toBeInTheDocument();
    expect(screen.getByText('7,2 L')).toBeInTheDocument();
    expect(screen.getByText('No mostramos quién donó.')).toBeInTheDocument();
  });

  it('un paso pendiente sale sin fecha y con el círculo vacío', async () => {
    responderSegun({ 'GET /api/seguimiento/*': seguimiento });
    pantalla('/seguimiento/ACO-2026-7KQ4M');
    const pendiente = (await screen.findByText('Conciliada')).closest('li')!;
    expect(pendiente).toHaveTextContent('Pendiente');
    // Sin opacity: atenuar el texto lo dejaba bajo el contraste mínimo (axe)
    expect(pendiente).not.toHaveClass('opacity-60');
    // El círculo sin relleno (borde) en lugar del círculo lleno de los pasos hechos
    expect(pendiente.querySelector('span.border-outline-variant')).not.toBeNull();
    expect(pendiente.querySelector('span.bg-primary-container')).toBeNull();
    expect(pendiente.textContent).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('un folio que no existe da el mensaje con un ejemplo', async () => {
    responderSegun({});
    pantalla('/seguimiento/ACO-2026-ZZZZZ');
    expect(
      await screen.findByText(
        'No encontramos ese folio. Revisa que esté bien escrito: se ve como ACO-2026-7KQ4M.',
      ),
    ).toBeInTheDocument();
  });

  it('un 429 muestra el mensaje de la API', async () => {
    responderSegun({
      'GET /api/seguimiento/*': conEstado(429, {
        estado: 429,
        codigo: 'DEMASIADAS_SOLICITUDES',
        mensaje: 'Demasiadas consultas. Espera un minuto.',
      }),
    });
    pantalla('/seguimiento/ACO-2026-7KQ4M');
    expect(await screen.findByText('Demasiadas consultas. Espera un minuto.')).toBeInTheDocument();
  });

  it('sin folio solo muestra el buscador y no consulta', () => {
    const consulta = vi.spyOn(globalThis, 'fetch');
    pantalla('/seguimiento');
    expect(screen.getByLabelText('Folio')).toHaveValue('');
    expect(consulta).not.toHaveBeenCalled();
  });

  it('el buscador navega a la ruta con el folio escrito', async () => {
    responderSegun({ 'GET /api/seguimiento/*': seguimiento });
    pantalla('/seguimiento');
    await userEvent.type(screen.getByLabelText('Folio'), ' aco-2026-7kq4m ');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(screen.getByTestId('ruta')).toHaveTextContent('/seguimiento/aco-2026-7kq4m');
    expect(await screen.findByText('Recibida en el acopio')).toBeInTheDocument();
  });

  it('el campo sigue al folio de la URL cuando cambia sin salir de la pantalla', async () => {
    responderSegun({ 'GET /api/seguimiento/*': seguimiento });
    pantalla('/seguimiento/ACO-2026-7KQ4M');
    expect(await screen.findByLabelText('Folio')).toHaveValue('ACO-2026-7KQ4M');

    await userEvent.click(screen.getByRole('button', { name: 'Ir a otro folio' }));

    await waitFor(() => expect(screen.getByLabelText('Folio')).toHaveValue('ACO-2026-ZZZZZ'));
  });

  it('axe: sin violaciones graves con resultado y sin encontrar', async () => {
    responderSegun({ 'GET /api/seguimiento/ACO-2026-7KQ4M': seguimiento });
    const { container, unmount } = pantalla('/seguimiento/ACO-2026-7KQ4M');
    await screen.findByText('Recibida en el acopio');
    expect(await violacionesGraves(container)).toEqual([]);
    unmount();
    responderSegun({});
    const otra = pantalla('/seguimiento/NADA');
    await screen.findByText(/No encontramos ese folio/);
    expect(await violacionesGraves(otra.container)).toEqual([]);
  });
});
