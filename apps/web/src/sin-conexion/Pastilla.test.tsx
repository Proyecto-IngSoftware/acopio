import { act, render, screen } from '@testing-library/react';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { encolar } from './cola';
import { abrir } from './base-local';
import { PastillaCola } from './PastillaCola';
import { publicarEnvio } from './Sincronizador';

const OPERADORA = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const sinRed = () => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
const pastilla = () => render(envolver(<PastillaCola />, '/', clienteFalso(OPERADORA)));

const tres = async () => {
  for (const [i, cantidad] of [12, 24, 5].entries()) {
    await encolar('u1', 'x1', { id: `e${i}`, categoriaId: 'c1', cantidad });
  }
};

afterEach(() => publicarEnvio(null));

describe('pastilla de la cabecera', () => {
  it('sin nada en la cola no aparece', async () => {
    pastilla();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('cuenta lo que espera y lleva a «Sin sincronizar»', async () => {
    sinRed();
    await tres();
    pastilla();

    const enlace = await screen.findByRole('link', { name: '3 sin sincronizar' });
    expect(enlace).toHaveAttribute('href', '/consola/sin-sincronizar');
  });

  it('mientras envía muestra el avance', async () => {
    await tres();
    pastilla();
    await screen.findByRole('link', { name: '3 sin sincronizar' });

    act(() => publicarEnvio({ hechas: 1, total: 3 }));

    expect(await screen.findByRole('link', { name: 'Enviando 2 de 3' })).toBeInTheDocument();
  });

  it('si solo quedan rechazadas lo dice', async () => {
    await encolar('u1', 'x1', { id: 'e1', categoriaId: 'c1', cantidad: 5 });
    const base = await abrir();
    const fila = (await base.get('cola', 'e1'))!;
    await base.put('cola', { ...fila, estado: 'rechazada', codigo: 'X', motivo: 'X' });
    pastilla();

    expect(await screen.findByRole('link', { name: '1 rechazada' })).toBeInTheDocument();
  });

  it('las entradas de otra persona del teléfono no cuentan', async () => {
    await encolar('otra', 'x1', { id: 'e9', categoriaId: 'c1', cantidad: 1 });
    pastilla();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
