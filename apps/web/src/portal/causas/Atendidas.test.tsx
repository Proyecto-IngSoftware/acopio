import { render, screen } from '@testing-library/react';
import { causaDePrueba } from '../../pruebas/datos-causas';
import { envolver, responderSegun } from '../../pruebas/utilidades';
import { Atendidas } from './Atendidas';

it('muestra las causas que cerraron, con su fecha de cierre', async () => {
  responderSegun({
    'GET /api/causas/atendidas': [
      causaDePrueba({ cerroEl: '2026-09-30', motivo: 'VENCIDA' }),
      causaDePrueba({
        id: 'c3',
        titulo: 'Kits de abrigo para hogares geriátricos',
        cerroEl: '2026-08-20',
        motivo: 'ENTIDAD_SIN_VERIFICAR',
        urlOficial: null,
        entidad: {
          id: 'e3',
          nombre: 'Fundación Años Dorados',
          tieneLogo: false,
          verificadaEn: null,
        },
      }),
    ],
  });
  render(envolver(<Atendidas />, '/causas/atendidas'));
  expect(await screen.findByText('Cerró el 30 de septiembre de 2026')).toBeInTheDocument();
  expect(screen.getByText('Cerró el 20 de agosto de 2026')).toBeInTheDocument();
  // La de la entidad sin verificación vigente no muestra sello
  expect(screen.getAllByText(/Verificada el/)).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Personas desaparecidas' })).not.toBeInTheDocument();
});
