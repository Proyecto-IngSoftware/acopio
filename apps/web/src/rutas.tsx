import { Route, Routes } from 'react-router';
import { MarcoPortal } from './portal/MarcoPortal';
import { NoEncontrada } from './portal/NoEncontrada';
import { Portada } from './portal/Portada';
import { Proximamente } from './portal/Proximamente';

const SIN_CONSTRUIR = ['mapa', 'causas', 'voluntariado', 'mas', 'entrar'];

/** /consola/* queda reservado para el ciclo 2. */
export function Rutas() {
  return (
    <Routes>
      <Route element={<MarcoPortal />}>
        <Route index element={<Portada />} />
        {SIN_CONSTRUIR.map((ruta) => (
          <Route key={ruta} path={ruta} element={<Proximamente />} />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
