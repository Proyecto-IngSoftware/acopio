import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorApi } from '../api/cliente';
import { clienteFalso, envolver } from '../pruebas/utilidades';
import { leerRecordado, recordarUsuario } from './recordada';
import { Route, Routes } from 'react-router';
import { RequiereRol } from '../consola/RequiereRol';
import { useSesion } from './Sesion';

const operadora = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};
const sinRed = new ErrorApi(0, 'SIN_RED', 'No pudimos conectar con Acopio.');

function QuienSoy() {
  const { usuario, cargando, salir } = useSesion();
  if (cargando) return <p>Cargando</p>;
  return (
    <>
      <p>{usuario ? `Sesión de ${usuario.nombre}` : 'Sin sesión'}</p>
      <button onClick={() => void salir()}>Salir</button>
    </>
  );
}

describe('sesión sin red (O-05)', () => {
  it('con red recuerda al usuario de la sesión', async () => {
    render(envolver(<QuienSoy />, '/', clienteFalso(operadora)));

    await screen.findByText('Sesión de Daniela Méndez');
    expect(leerRecordado()).toEqual(operadora);
  });

  it('sin red al abrir, sigue con el último usuario recordado', async () => {
    recordarUsuario(operadora);
    const cliente = clienteFalso();
    cliente.usuarioActual.mockRejectedValue(sinRed);

    render(envolver(<QuienSoy />, '/', cliente));

    expect(await screen.findByText('Sesión de Daniela Méndez')).toBeInTheDocument();
  });

  it('sin red y sin nadie recordado, no hay sesión', async () => {
    const cliente = clienteFalso();
    cliente.usuarioActual.mockRejectedValue(sinRed);

    render(envolver(<QuienSoy />, '/', cliente));

    expect(await screen.findByText('Sin sesión')).toBeInTheDocument();
  });

  it('si la API dice que no hay sesión (401), olvida al recordado', async () => {
    recordarUsuario(operadora);

    render(envolver(<QuienSoy />, '/', clienteFalso(null)));

    await screen.findByText('Sin sesión');
    expect(leerRecordado()).toBeNull();
  });

  it('al salir olvida al usuario recordado', async () => {
    recordarUsuario(operadora);
    render(envolver(<QuienSoy />, '/', clienteFalso(operadora)));
    await screen.findByText('Sesión de Daniela Méndez');

    await userEvent.click(screen.getByRole('button', { name: 'Salir' }));

    await waitFor(() => expect(leerRecordado()).toBeNull());
  });

  it('sin red, la operadora recordada entra a sus herramientas sin pasar por Entrar', async () => {
    recordarUsuario(operadora);
    const cliente = clienteFalso();
    cliente.usuarioActual.mockRejectedValue(sinRed);

    render(
      envolver(
        <Routes>
          <Route
            path="/consola/entrada"
            element={
              <RequiereRol roles={['OPERADOR']}>
                <p>Entrada rápida</p>
              </RequiereRol>
            }
          />
          <Route path="/entrar" element={<p>Pantalla de Entrar</p>} />
        </Routes>,
        '/consola/entrada',
        cliente,
      ),
    );

    expect(await screen.findByText('Entrada rápida')).toBeInTheDocument();
  });
});
