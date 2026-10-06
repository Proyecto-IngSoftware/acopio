import { render, screen } from '@testing-library/react';
import { clienteFalso, envolver, responderSegun } from '../pruebas/utilidades';
import { useUbicacionActiva } from './ubicacion-activa';

const operadora = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const chapinero = { id: 'a1', tipo: 'ACOPIO', nombre: 'Acopio Chapinero', municipio: 'Bogotá' };

function Activa() {
  const { activa } = useUbicacionActiva();
  return <p>{activa ? `Operando en ${activa.nombre}` : 'Sin ubicación'}</p>;
}

describe('ubicación activa sin red (O-05)', () => {
  it('sin red usa las asignaciones que llegaron la última vez con red', async () => {
    responderSegun({ 'GET /api/ubicaciones/mias': [chapinero] });
    const { unmount } = render(envolver(<Activa />, '/', clienteFalso(operadora)));
    await screen.findByText('Operando en Acopio Chapinero');
    unmount();

    // Sin red: cualquier petición falla (src/pruebas/preparar.ts)
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    render(envolver(<Activa />, '/', clienteFalso(operadora)));

    expect(await screen.findByText('Operando en Acopio Chapinero')).toBeInTheDocument();
  });

  it('las asignaciones recordadas son de cada usuario', async () => {
    responderSegun({ 'GET /api/ubicaciones/mias': [chapinero] });
    const { unmount } = render(envolver(<Activa />, '/', clienteFalso(operadora)));
    await screen.findByText('Operando en Acopio Chapinero');
    unmount();

    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    render(envolver(<Activa />, '/', clienteFalso({ ...operadora, id: 'u2' })));

    expect(await screen.findByText('Sin ubicación')).toBeInTheDocument();
  });
});
