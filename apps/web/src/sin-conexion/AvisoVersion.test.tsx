import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AvisoVersion } from './AvisoVersion';

const sw = vi.hoisted(() => ({ hayNueva: false, actualizar: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.hayNueva, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: sw.actualizar,
  }),
}));

describe('aviso de versión nueva (ADR-0016)', () => {
  it('sin versión nueva no muestra nada', () => {
    sw.hayNueva = false;
    const { container } = render(<AvisoVersion />);
    expect(container).toBeEmptyDOMElement();
  });

  it('con versión nueva la anuncia y recarga solo cuando el Operador toca «Actualizar»', async () => {
    sw.hayNueva = true;
    render(<AvisoVersion />);

    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva de Acopio.');
    expect(sw.actualizar).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(sw.actualizar).toHaveBeenCalledWith(true);
  });
});
