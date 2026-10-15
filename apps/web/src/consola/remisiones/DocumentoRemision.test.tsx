import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../../pruebas/accesibilidad';
import { clienteFalso, envolver, responderSegun } from '../../pruebas/utilidades';
import { remision } from './datos-prueba';
import { DocumentoRemision } from './DocumentoRemision';

const OPERADOR = {
  id: 'u1',
  username: 'b.operador',
  nombre: 'Brayan Operador',
  rol: 'OPERADOR' as const,
};

const EN_TRANSITO = remision({
  estado: 'EN_TRANSITO',
  zona: null,
  responsable: 'Pedro Gómez',
  despachadaEn: '2026-10-15T15:00:00.000Z',
  folios: ['ACO-2026-DEMB2'],
  lineas: [
    {
      categoriaId: 'c-arroz',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      cantidadPlaneada: 440,
      cantidadRecibida: null,
    },
  ],
});

function pantalla() {
  return render(
    envolver(
      <Routes>
        <Route path="/consola/remisiones/:codigo/documento" element={<DocumentoRemision />} />
      </Routes>,
      '/consola/remisiones/R-2026-K4P7Q/documento',
      clienteFalso(OPERADOR),
    ),
  );
}

it('muestra lo que se imprime: código, origen, destino, líneas, folios y QR', async () => {
  responderSegun({ 'GET /api/remisiones/*': EN_TRANSITO });
  pantalla();
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Remisión R-2026-K4P7Q' }),
  ).toBeInTheDocument();
  expect(await screen.findByText('Acopio Kennedy')).toBeInTheDocument();
  expect(screen.getByText('Despacho general')).toBeInTheDocument();
  expect(screen.getByText('Pedro Gómez')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Arroz' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '440 kg' })).toBeInTheDocument();
  expect(screen.getByText('ACO-2026-DEMB2')).toBeInTheDocument();
  expect(
    await screen.findByRole('img', { name: 'Código QR para recibir la remisión R-2026-K4P7Q' }),
  ).toBeInTheDocument();
});

it('un borrador no tiene documento', async () => {
  responderSegun({ 'GET /api/remisiones/*': remision({}) });
  pantalla();
  expect(
    await screen.findByText('Esta remisión no tiene documento: se imprime al despacharla.'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
});

it('«Imprimir» abre la impresión del navegador', async () => {
  responderSegun({ 'GET /api/remisiones/*': EN_TRANSITO });
  const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
  pantalla();
  await userEvent.click(await screen.findByRole('button', { name: 'Imprimir' }));
  expect(imprimir).toHaveBeenCalled();
});

it('no tiene violaciones graves de accesibilidad', async () => {
  responderSegun({ 'GET /api/remisiones/*': EN_TRANSITO });
  const { container } = pantalla();
  await screen.findByRole('img', { name: /Código QR/ });
  expect(await violacionesGraves(container)).toEqual([]);
});
