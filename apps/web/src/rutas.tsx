import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { MarcoAcceso } from './portal/MarcoAcceso';
import { RequiereDonador } from './donador/RequiereDonador';
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
const Salida = lazy(() =>
  import('./consola/inventario/Salida').then((m) => ({ default: m.Salida })),
);
const Conteo = lazy(() =>
  import('./consola/inventario/Conteo').then((m) => ({ default: m.Conteo })),
);
const SinSincronizar = lazy(() =>
  import('./consola/SinSincronizar').then((m) => ({ default: m.SinSincronizar })),
);
const MatrizAcceso = lazy(() =>
  import('./consola/accesos/MatrizAcceso').then((m) => ({ default: m.MatrizAcceso })),
);
const FichaZona = lazy(() =>
  import('./consola/motor/FichaZona').then((m) => ({ default: m.FichaZona })),
);
const Motor = lazy(() => import('./consola/motor/Motor').then((m) => ({ default: m.Motor })));
const PesosMotor = lazy(() => import('./consola/motor/Pesos').then((m) => ({ default: m.Pesos })));
const Descartes = lazy(() =>
  import('./consola/motor/Descartes').then((m) => ({ default: m.Descartes })),
);
const Remisiones = lazy(() =>
  import('./consola/remisiones/Remisiones').then((m) => ({ default: m.Remisiones })),
);
const NuevaRemision = lazy(() =>
  import('./consola/remisiones/NuevaRemision').then((m) => ({ default: m.NuevaRemision })),
);
const Recepciones = lazy(() =>
  import('./consola/recepciones/Recepciones').then((m) => ({ default: m.Recepciones })),
);
const RecibirPorCodigo = lazy(() =>
  import('./consola/recepciones/RecibirRemision').then((m) => ({ default: m.RecibirPorCodigo })),
);
const RecibirPorQr = lazy(() =>
  import('./consola/recepciones/RecibirRemision').then((m) => ({ default: m.RecibirPorQr })),
);
const MiZona = lazy(() =>
  import('./consola/recepciones/MiZona').then((m) => ({ default: m.MiZona })),
);
const ReportarNecesidad = lazy(() =>
  import('./consola/recepciones/ReportarNecesidad').then((m) => ({
    default: m.ReportarNecesidad,
  })),
);
const DetalleRemision = lazy(() =>
  import('./consola/remisiones/DetalleRemision').then((m) => ({ default: m.DetalleRemision })),
);
const DocumentoRemision = lazy(() =>
  import('./consola/remisiones/DocumentoRemision').then((m) => ({
    default: m.DocumentoRemision,
  })),
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
const MiCuenta = lazy(() => import('./donador/MiCuenta').then((m) => ({ default: m.MiCuenta })));
const Confirmar = lazy(() => import('./donador/Confirmar').then((m) => ({ default: m.Confirmar })));
const Preparar = lazy(() => import('./donador/Preparar').then((m) => ({ default: m.Preparar })));
const Seguimiento = lazy(() =>
  import('./portal/Seguimiento').then((m) => ({ default: m.Seguimiento })),
);
const Plataformas = lazy(() =>
  import('./portal/plataformas/Plataformas').then((m) => ({ default: m.Plataformas })),
);
const Privacidad = lazy(() =>
  import('./portal/Privacidad').then((m) => ({ default: m.Privacidad })),
);
const RecibirFolio = lazy(() =>
  import('./consola/comprobantes/RecibirFolio').then((m) => ({ default: m.RecibirFolio })),
);
const Comprobantes = lazy(() =>
  import('./consola/comprobantes/Comprobantes').then((m) => ({ default: m.Comprobantes })),
);
const Conciliacion = lazy(() =>
  import('./consola/comprobantes/Conciliacion').then((m) => ({ default: m.Conciliacion })),
);
const Mapa = lazy(() => import('./portal/mapa/Mapa').then((m) => ({ default: m.Mapa })));
const DirectorioCausas = lazy(() =>
  import('./portal/causas/Directorio').then((m) => ({ default: m.Directorio })),
);
const CausasAtendidas = lazy(() =>
  import('./portal/causas/Atendidas').then((m) => ({ default: m.Atendidas })),
);
const CausasConsola = lazy(() =>
  import('./consola/causas/Causas').then((m) => ({ default: m.Causas })),
);
const CausaConsola = lazy(() =>
  import('./consola/causas/Causas').then((m) => ({ default: m.CausaConsola })),
);
const FichaCausa = lazy(() => import('./portal/causas/Ficha').then((m) => ({ default: m.Ficha })));

const Jornadas = lazy(() =>
  import('./portal/turnos/Jornadas').then((m) => ({ default: m.Jornadas })),
);

const ReservarJornada = lazy(() =>
  import('./portal/turnos/Reservar').then((m) => ({ default: m.Reservar })),
);

const MiReserva = lazy(() =>
  import('./portal/turnos/MiReserva').then((m) => ({ default: m.MiReserva })),
);

const TurnosConsola = lazy(() =>
  import('./consola/turnos/Turnos').then((m) => ({ default: m.Turnos })),
);

const SIN_CONSTRUIR = ['proximamente'];

/** /consola/* queda reservado para el ciclo 2. */
export function Rutas() {
  return (
    <Routes>
      <Route element={<MarcoPortal />}>
        <Route index element={<Portada />} />
        <Route path="mas" element={<Mas />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="acopios/:id" element={<FichaAcopio />} />
        <Route path="donador" element={<MiCuenta />} />
        <Route path="donador/confirmar/:token" element={<Confirmar />} />
        <Route
          path="donar"
          element={
            <RequiereDonador>
              <Preparar />
            </RequiereDonador>
          }
        />
        <Route path="seguimiento" element={<Seguimiento />} />
        <Route path="seguimiento/:folio" element={<Seguimiento />} />
        <Route path="privacidad" element={<Privacidad />} />
        <Route path="plataformas" element={<Plataformas />} />
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
        {(
          [
            ['consola/acopios/:id/entrada', <EntradaRapida key="ent" />],
            ['consola/acopios/:id/salida', <Salida key="sal" />],
            ['consola/acopios/:id/conteo', <Conteo key="con" />],
            ['consola/acopios/:id/recibir', <RecibirFolio key="rec" />],
            // Las entradas guardadas sin red: solo las captura el Operador (ADR-0005)
            ['consola/sin-sincronizar', <SinSincronizar key="sin" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          // Solo el Operador asignado registra movimientos (V-04)
          <Route
            key={ruta}
            path={ruta}
            element={<RequiereRol roles={['OPERADOR']}>{pantalla}</RequiereRol>}
          />
        ))}
        {(
          [
            ['consola/comprobantes', <Comprobantes key="cmp" />],
            ['consola/comprobantes/:folio', <Conciliacion key="cnc" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={<RequiereRol roles={['ADMIN', 'AUDITOR']}>{pantalla}</RequiereRol>}
          />
        ))}
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
            ['consola/usuarios', <Usuarios key="u" />, false],
            ['consola/usuarios/invitar', <InvitarPersona key="i" />, false],
            ['consola/usuarios/:id', <DetalleUsuario key="d" />, false],
            ['consola/entidades', <Entidades key="e" />, true],
            ['consola/causas', <CausasConsola key="ca" />, true],
            ['consola/causas/:id', <CausaConsola key="cc" />, true],
            ['consola/acopios', <Acopios key="a" />, true],
            ['consola/acopios/nuevo', <FormularioAcopio key="an" />, true],
            ['consola/acopios/:id', <FormularioAcopio key="ae" />, true],
            ['consola/zonas', <Zonas key="z" />, true],
          ] as const
        ).map(([ruta, pantalla, margen]) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RequiereRol roles={['ADMIN']} margen={margen}>
                {pantalla}
              </RequiereRol>
            }
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
            element={
              <RequiereRol roles={['ADMIN', 'OPERADOR']} margen>
                {pantalla}
              </RequiereRol>
            }
          />
        ))}
        <Route
          path="consola/zonas/:id"
          element={
            <RequiereRol roles={['ADMIN', 'RECEPTOR']} margen>
              <FichaZona />
            </RequiereRol>
          }
        />
        <Route
          path="consola/zonas/:id/reportar"
          element={
            <RequiereRol roles={['ADMIN', 'RECEPTOR']} margen>
              <ReportarNecesidad />
            </RequiereRol>
          }
        />
        {(
          [
            ['consola/mi-zona', <MiZona key="mz" />],
            ['consola/recepciones', <Recepciones key="rc" />],
            ['consola/recepciones/qr/:token', <RecibirPorQr key="rq" />],
            ['consola/recepciones/:codigo', <RecibirPorCodigo key="rr" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RequiereRol roles={['RECEPTOR']} margen>
                {pantalla}
              </RequiereRol>
            }
          />
        ))}
        {(
          [
            ['consola/motor', <Motor key="m" />],
            ['consola/motor/pesos', <PesosMotor key="mp" />],
            ['consola/motor/descartes', <Descartes key="md" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RequiereRol roles={['ADMIN']} margen>
                {pantalla}
              </RequiereRol>
            }
          />
        ))}
        {(
          [
            ['consola/remisiones', <Remisiones key="r" />],
            ['consola/remisiones/nueva', <NuevaRemision key="rn" />],
            ['consola/remisiones/:codigo', <DetalleRemision key="rd" />],
          ] as const
        ).map(([ruta, pantalla]) => (
          <Route
            key={ruta}
            path={ruta}
            element={
              <RequiereRol roles={['ADMIN', 'OPERADOR']} margen>
                {pantalla}
              </RequiereRol>
            }
          />
        ))}
        <Route
          path="consola/turnos"
          element={
            <RequiereRol roles={['ADMIN', 'OPERADOR']} margen>
              <TurnosConsola />
            </RequiereRol>
          }
        />
        <Route
          path="consola/catalogo"
          element={
            <RequiereRol roles={['ADMIN']}>
              <Catalogo />
            </RequiereRol>
          }
        />
        <Route path="causas" element={<DirectorioCausas />} />
        <Route path="voluntariado" element={<Jornadas />} />
        <Route path="voluntariado/:id" element={<ReservarJornada />} />
        <Route path="voluntariado/reserva/:codigo" element={<MiReserva />} />
        <Route path="causas/atendidas" element={<CausasAtendidas />} />
        <Route path="causas/:id" element={<FichaCausa />} />
        {SIN_CONSTRUIR.map((ruta) => (
          <Route key={ruta} path={ruta} element={<Proximamente />} />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      {/* El documento se imprime: sin la cabecera ni la barra del portal (I2-02) */}
      <Route
        path="consola/remisiones/:codigo/documento"
        element={
          <RequiereRol roles={['ADMIN', 'OPERADOR']}>
            <Suspense fallback={null}>
              <DocumentoRemision />
            </Suspense>
          </RequiereRol>
        }
      />
      <Route element={<MarcoAcceso />}>
        <Route path="entrar" element={<Entrar />} />
        <Route path="invitacion/:token" element={<ActivarCuenta />} />
      </Route>
    </Routes>
  );
}
