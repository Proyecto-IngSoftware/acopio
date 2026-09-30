import { Route, Routes } from 'react-router';
import { ActivarCuenta } from './acceso/ActivarCuenta';
import { Entrar } from './acceso/Entrar';
import { MarcoAcceso } from './portal/MarcoAcceso';
import { MarcoPortal } from './portal/MarcoPortal';
import { Mas } from './portal/Mas';
import { NoEncontrada } from './portal/NoEncontrada';
import { Portada } from './portal/Portada';
import { Proximamente } from './portal/Proximamente';

const SIN_CONSTRUIR = ['mapa', 'causas', 'voluntariado', 'proximamente'];

/** /consola/* queda reservado para el ciclo 2. */
export function Rutas() {
  return (
    <Routes>
      <Route element={<MarcoPortal />}>
        <Route index element={<Portada />} />
        <Route path="mas" element={<Mas />} />
        {SIN_CONSTRUIR.map((ruta) => (
          <Route key={ruta} path={ruta} element={<Proximamente />} />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      <Route element={<MarcoAcceso />}>
        <Route path="entrar" element={<Entrar />} />
        <Route path="invitacion/:token" element={<ActivarCuenta />} />
      </Route>
    </Routes>
  );
}
