import { Route, Routes } from 'react-router';
import { ActivarCuenta } from './acceso/ActivarCuenta';
import { Entrar } from './acceso/Entrar';
import { MarcoAcceso } from './portal/MarcoAcceso';
import { Bitacora } from './consola/Bitacora';
import { Catalogo } from './consola/catalogo/Catalogo';
import { Acopios } from './consola/red/Acopios';
import { Entidades } from './consola/red/Entidades';
import { FormularioAcopio } from './consola/red/FormularioAcopio';
import { Zonas } from './consola/red/Zonas';
import { DetalleUsuario } from './consola/usuarios/DetalleUsuario';
import { InvitarPersona } from './consola/usuarios/InvitarPersona';
import { Usuarios } from './consola/usuarios/Usuarios';
import { RequiereRol } from './consola/RequiereRol';
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
        <Route
          path="consola/bitacora"
          element={
            <RequiereRol roles={['ADMIN', 'AUDITOR']}>
              <Bitacora />
            </RequiereRol>
          }
        />
        {(
          [
            ['consola/usuarios', <Usuarios key="u" />],
            ['consola/usuarios/invitar', <InvitarPersona key="i" />],
            ['consola/usuarios/:id', <DetalleUsuario key="d" />],
            ['consola/entidades', <Entidades key="e" />],
            ['consola/acopios', <Acopios key="a" />],
            ['consola/acopios/nuevo', <FormularioAcopio key="an" />],
            ['consola/acopios/:id', <FormularioAcopio key="ae" />],
            ['consola/zonas', <Zonas key="z" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={<RequiereRol roles={['ADMIN']}>{pantalla}</RequiereRol>}
          />
        ))}
        <Route
          path="consola/catalogo"
          element={
            <RequiereRol roles={['ADMIN']}>
              <Catalogo />
            </RequiereRol>
          }
        />
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
