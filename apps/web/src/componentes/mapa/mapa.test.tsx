import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { envolver, peticiones, responderSegun } from '../../pruebas/utilidades';
import { BuscadorDireccion } from './BuscadorDireccion';
import { MapaConPin } from './MapaConPin';

// Leaflet no funciona en jsdom: el mapa se revisa en Chromium
vi.mock('./MapaLeaflet', () => ({ default: () => <div>mapa</div> }));

describe('BuscadorDireccion', () => {
  it('busca la dirección y entrega el resultado elegido', async () => {
    const alElegir = vi.fn();
    responderSegun({
      'GET /api/geocodificar': [
        { etiqueta: 'Carrera 7 # 40-62, Bogotá', lat: 4.628, lng: -74.064 },
      ],
    });
    render(envolver(<BuscadorDireccion q="Carrera 7 # 40-62" alElegir={alElegir} />));
    await userEvent.click(screen.getByRole('button', { name: 'Buscar en el mapa' }));
    await userEvent.click(await screen.findByRole('button', { name: /Carrera 7 # 40-62, Bogotá/ }));
    expect(alElegir).toHaveBeenCalledWith({ lat: 4.628, lng: -74.064 });
    expect(peticiones()[0]).toMatch(/^GET \/api\/geocodificar\?q=Carrera/);
  });

  it('sin resultados lo dice y sugiere mover el pin', async () => {
    responderSegun({ 'GET /api/geocodificar': [] });
    render(envolver(<BuscadorDireccion q="calle que no existe" alElegir={vi.fn()} />));
    await userEvent.click(screen.getByRole('button', { name: 'Buscar en el mapa' }));
    expect(await screen.findByText(/No encontramos esa dirección/)).toBeInTheDocument();
  });

  it('con menos de 3 letras no busca', () => {
    render(envolver(<BuscadorDireccion q="ab" alElegir={vi.fn()} />));
    expect(screen.getByRole('button', { name: 'Buscar en el mapa' })).toBeDisabled();
  });
});

function ConPin() {
  const [p, fijar] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <>
      <MapaConPin valor={p} alCambiar={fijar} />
      <output aria-label="punto">{p ? `${p.lat},${p.lng}` : 'sin punto'}</output>
    </>
  );
}

describe('MapaConPin', () => {
  it('las coordenadas se pueden escribir a mano (alternativa al pin para teclado)', async () => {
    render(envolver(<ConPin />));
    expect(await screen.findByText('mapa')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Ajustar coordenadas a mano'));
    await userEvent.type(screen.getByLabelText('Latitud'), '4.6');
    await userEvent.type(screen.getByLabelText('Longitud'), '-74.08');
    expect(screen.getByLabelText('punto')).toHaveTextContent('4.6,-74.08');
  });
});
