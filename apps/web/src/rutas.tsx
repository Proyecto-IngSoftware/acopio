import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { MarcoAcceso } from './portal/MarcoAcceso';
import { RequiereRol } from './consola/RequiereRol';
import { MarcoPortal } from './portal/MarcoPortal';
import { Mas } from './portal/Mas';
import { NoEncontrada } from './portal/NoEncontrada';
import { Portada } from './portal/Portada';
import { Proximamente } from './portal/Proximamente';

// La Portada carga sola; cada pantalla de la consola, del acceso y del mapa se descarga
// al abrirla, para que el portal pese poco en 3G (RF-HOM-001)
const ActivarCuenta = lazy(() =>
  import('./acceso/ActivarCuenta').then((m) => ({ default: m.ActivarCuenta })),
);
const Entrar = lazy(() => import('./acceso/Entrar').then((m) => ({ default: m.Entrar })));
const Inventario = lazy(() =>
  import('./consola/inventario/Inventario').then((m) => ({ default: m.Inventario })),
);
const Historial = lazy(() =>
  import('./consola/inventario/Historial').then((m) => ({ default: m.Historial })),
);
const EntradaRapida = lazy(() =>
  import('./consola/inventario/EntradaRapida').then((m) => ({ default: m.EntradaRapida })),
);
const MatrizAcceso = lazy(() =>
  import('./consola/accesos/MatrizAcceso').then((m) => ({ default: m.MatrizAcceso })),
);
const Bitacora = lazy(() => import('./consola/Bitacora').then((m) => ({ default: m.Bitacora })));
const Catalogo = lazy(() =>
  import('./consola/catalogo/Catalogo').then((m) => ({ default: m.Catalogo })),
);
const DetalleUsuario = lazy(() =>
  import('./consola/usuarios/DetalleUsuario').then((m) => ({ default: m.DetalleUsuario })),
);
const InvitarPersona = lazy(() =>
  import('./consola/usuarios/InvitarPersona').then((m) => ({ default: m.InvitarPersona })),
);
const Usuarios = lazy(() =>
  import('./consola/usuarios/Usuarios').then((m) => ({ default: m.Usuarios })),
);
const Acopios = lazy(() => import('./consola/red/Acopios').then((m) => ({ default: m.Acopios })));
const Entidades = lazy(() =>
  import('./consola/red/Entidades').then((m) => ({ default: m.Entidades })),
);
const FormularioAcopio = lazy(() =>
  import('./consola/red/FormularioAcopio').then((m) => ({ default: m.FormularioAcopio })),
);
const MiAcopio = lazy(() =>
  import('./consola/red/MiAcopio').then((m) => ({ default: m.MiAcopio })),
);
const NoRecibir = lazy(() =>
  import('./consola/red/NoRecibir').then((m) => ({ default: m.NoRecibir })),
);
const Zonas = lazy(() => import('./consola/red/Zonas').then((m) => ({ default: m.Zonas })));
const FichaAcopio = lazy(() =>
  import('./portal/ficha/FichaAcopio').then((m) => ({ default: m.FichaAcopio })),
);
const Mapa = lazy(() => import('./portal/mapa/Mapa').then((m) => ({ default: m.Mapa })));

const SIN_CONSTRUIR = ['causas', 'voluntariado', 'proximamente'];

/** /consola/* queda reservado para el ciclo 2. */
export function Rutas() {
  return (
    <Routes>
      <Route element={<MarcoPortal />}>
        <Route index element={<Portada />} />
        <Route path="mas" element={<Mas />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="acopios/:id" element={<FichaAcopio />} />
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
            ['consola/acopios/:id/inventario', <Inventario key="inv" />],
            ['consola/acopios/:id/inventario/:categoriaId', <Historial key="his" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={<RequiereRol roles={['ADMIN', 'AUDITOR', 'OPERADOR']}>{pantalla}</RequiereRol>}
          />
        ))}
        <Route
          path="consola/acopios/:id/entrada"
          element={
            <RequiereRol roles={['OPERADOR']}>
              <EntradaRapida />
            </RequiereRol>
          }
        />
        <Route
          path="consola/accesos"
          element={
            <RequiereRol roles={['ADMIN', 'AUDITOR']}>
              <MatrizAcceso />
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
        {(
          [
            ['consola/acopios/:id/operacion', <MiAcopio key="mi" />],
            ['consola/acopios/:id/no-recibir', <NoRecibir key="nr" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={<RequiereRol roles={['ADMIN', 'OPERADOR']}>{pantalla}</RequiereRol>}
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
