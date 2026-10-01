import { useMemo, useState } from 'react';
import { useBuscarUbicaciones, type Ubicacion } from '../../api/red';
import { useUsuarios, type EstadoUsuario, type RolInterno } from '../../api/usuarios';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Pildora } from '../../componentes/Pildora';
import { iniciales } from '../../sesion/roles';
import { useSesion } from '../../sesion/Sesion';
import { Encabezado } from '../Encabezado';
import { DistintivoEstado, ROLES } from '../usuarios/comun';
import { cruzarMatriz, filtrarMatriz, matrizCsv, type FilaMatriz } from './matriz';

const FILTRO_ROL = ROLES.filter((r) => r.rol !== 'ADMIN');
const FILTRO_ESTADO: { estado?: EstadoUsuario; texto: string }[] = [
  { texto: 'Todos' },
  { estado: 'ACTIVO', texto: 'Activos' },
  { estado: 'INVITADO', texto: 'Invitados' },
  { estado: 'SUSPENDIDO', texto: 'Suspendidos' },
];

const nombreRol = (r: string) => ROLES.find((x) => x.rol === r)?.nombre ?? r;
const lugar = (u: Ubicacion) => `${u.nombre} · ${u.municipio}`;

function AvisoRestablecimiento() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded bg-tertiary-fixed px-2 py-0.5 text-label-md text-tertiary-container">
      <Icono nombre="lock_reset" className="text-[16px]" />
      Restablecimiento pendiente
    </span>
  );
}

function resumen(cantidad: number, ubicacion: Ubicacion, administradores: number): string {
  const destino = ubicacion.tipo === 'ACOPIO' ? 'este acopio' : 'esta zona';
  const quien =
    cantidad === 0
      ? `Nadie tiene asignado ${destino}.`
      : cantidad === 1
        ? `1 persona puede tocar ${destino}.`
        : `${cantidad} personas pueden tocar ${destino}.`;
  if (administradores === 0) return quien;
  const admins =
    administradores === 1
      ? 'Además, el administrador puede tocar todas las ubicaciones.'
      : `Además, los ${administradores} administradores pueden tocar todas las ubicaciones.`;
  return `${quien} ${admins}`;
}

/** Lectura a 360 px: se elige una ubicación y se ve quién puede tocarla (J-06). */
function PorUbicacion({
  filas,
  columnas,
  administradores,
}: {
  filas: FilaMatriz[];
  columnas: Ubicacion[];
  administradores: number;
}) {
  const [elegida, fijarElegida] = useState<string | null>(null);
  const ubicacion = columnas.find((c) => c.id === elegida) ?? columnas[0]!;
  const quienes = filtrarMatriz(filas, { ubicacionId: ubicacion.id });

  return (
    <section aria-label="Por ubicación" className="flex flex-col gap-space-md md:hidden">
      <label className="flex flex-col gap-space-xs">
        <span className="text-label-md font-bold text-on-surface">Ubicación</span>
        <select
          id="matriz-ubicacion"
          value={ubicacion.id}
          onChange={(e) => fijarElegida(e.target.value)}
          className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-sm text-body-md text-on-surface"
        >
          {(
            [
              ['Acopios', 'ACOPIO'],
              ['Zonas', 'ZONA'],
            ] as const
          ).map(([titulo, tipo]) => {
            const grupo = columnas.filter((c) => c.tipo === tipo);
            return grupo.length === 0 ? null : (
              <optgroup key={tipo} label={titulo}>
                {grupo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lugar(c)}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      <p role="status" className="rounded-xl bg-surface-container-low p-space-sm text-body-sm">
        {resumen(quienes.length, ubicacion, administradores)}
      </p>
      {quienes.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {quienes.map((f) => (
            <li
              key={f.usuario.id}
              className="flex items-start gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-bold text-primary-container">
                {iniciales(f.usuario.nombre)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-lg font-bold text-on-surface">{f.usuario.nombre}</span>
                <span className="text-body-sm text-on-surface-variant">
                  {f.usuario.username ? `@${f.usuario.username}` : 'Sin usuario'} ·{' '}
                  {nombreRol(f.usuario.rol)}
                </span>
                <DistintivoEstado estado={f.usuario.estado} />
                {f.restablecimientoPendiente && <AvisoRestablecimiento />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Desde 768 px: personas por ubicaciones, con la columna de personas fija (J-06). */
function Tabla({ filas, columnas }: { filas: FilaMatriz[]; columnas: Ubicacion[] }) {
  return (
    <section aria-label="Tabla de acceso" className="hidden md:block">
      {/* Con foco, la tabla se desplaza con las flechas del teclado */}
      <div
        tabIndex={0}
        className="relative overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest focus-visible:outline-2 focus-visible:outline-primary-container"
      >
        <table className="w-full border-separate border-spacing-0 text-body-sm">
          <caption className="sr-only">Personas por ubicación</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 border-r border-b border-outline-variant bg-surface-container-low p-space-sm text-left font-semibold"
              >
                Persona
              </th>
              {columnas.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className="border-b border-outline-variant bg-surface-container-low p-space-sm align-bottom font-semibold whitespace-nowrap"
                >
                  {c.nombre}
                  <span className="block font-normal text-on-surface-variant">
                    {c.tipo === 'ACOPIO' ? 'Acopio' : 'Zona'} · {c.municipio}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-outline-variant bg-surface-container-low p-space-sm text-left font-semibold"
              >
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.usuario.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-b border-outline-variant border-b-surface-container bg-surface-container-lowest p-space-sm text-left whitespace-nowrap"
                >
                  <span className="block font-semibold">{f.usuario.nombre}</span>
                  <span className="font-normal text-on-surface-variant">
                    {nombreRol(f.usuario.rol)}
                  </span>
                </th>
                {columnas.map((c) => (
                  <td
                    key={c.id}
                    className="border-b border-surface-container p-space-sm text-center"
                  >
                    {f.puede(c.id) ? (
                      <>
                        <Icono
                          nombre="check_circle"
                          className="text-[22px] text-primary-container"
                        />
                        <span className="sr-only">Sí</span>
                      </>
                    ) : (
                      <>
                        <Icono nombre="remove" className="text-[22px] text-outline-variant" />
                        <span className="sr-only">No</span>
                      </>
                    )}
                  </td>
                ))}
                <td className="border-b border-surface-container p-space-sm">
                  <span className="flex flex-wrap gap-space-xs">
                    <DistintivoEstado estado={f.usuario.estado} />
                    {f.restablecimientoPendiente && <AvisoRestablecimiento />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function descargar(texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `matriz-de-acceso-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** Matriz de acceso (RF-IDE-011, B-07). Para el Administrador y el Auditor. */
export function MatrizAcceso() {
  const { usuario } = useSesion();
  const [rol, fijarRol] = useState<RolInterno | undefined>();
  const [estado, fijarEstado] = useState<EstadoUsuario | undefined>();
  const usuarios = useUsuarios({ q: '' });
  const ubicaciones = useBuscarUbicaciones('');

  const matriz = useMemo(
    () =>
      usuarios.data && ubicaciones.data ? cruzarMatriz(usuarios.data, ubicaciones.data) : null,
    [usuarios.data, ubicaciones.data],
  );
  const filas = matriz ? filtrarMatriz(matriz.filas, { rol, estado }) : [];
  const error = usuarios.error ?? ubicaciones.error;

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Matriz de acceso"
        subtitulo="Quién puede tocar cada ubicación"
        volverA={usuario?.rol === 'ADMIN' ? '/consola/usuarios' : '/mas'}
      />

      <div className="flex flex-col gap-space-xs md:flex-row md:flex-wrap md:items-center md:gap-space-md">
        <div role="group" aria-label="Rol" className="flex gap-space-xs overflow-x-auto pb-1">
          <Pildora activa={!rol} texto="Todos" alTocar={() => fijarRol(undefined)} />
          {FILTRO_ROL.map((r) => (
            <Pildora
              key={r.rol}
              activa={rol === r.rol}
              texto={r.nombre}
              alTocar={() => fijarRol(r.rol)}
            />
          ))}
        </div>
        <div role="group" aria-label="Estado" className="flex gap-space-xs overflow-x-auto pb-1">
          {FILTRO_ESTADO.map((f) => (
            <Pildora
              key={f.texto}
              activa={estado === f.estado}
              texto={f.texto}
              alTocar={() => fijarEstado(f.estado)}
            />
          ))}
        </div>
      </div>

      {error && (
        <EstadoError
          mensaje={error.message}
          alReintentar={() => {
            void usuarios.refetch();
            void ubicaciones.refetch();
          }}
        />
      )}
      {!error && !matriz && <Esqueleto etiqueta="Cargando la matriz" className="h-48" />}
      {matriz && matriz.columnas.length === 0 && (
        <EstadoVacio titulo="Todavía no hay acopios ni zonas">
          Cuando el Administrador cree acopios o zonas y asigne personas, aquí se verá quién puede
          tocar cada uno.
        </EstadoVacio>
      )}
      {matriz && matriz.columnas.length > 0 && (
        <>
          <PorUbicacion
            filas={filas}
            columnas={matriz.columnas}
            administradores={matriz.administradores}
          />
          <Tabla filas={filas} columnas={matriz.columnas} />
          <Boton
            variante="secundario"
            className="min-h-[56px] w-full md:w-fit"
            onClick={() => descargar(matrizCsv(filas))}
          >
            <Icono nombre="download" className="text-[20px]" />
            Exportar CSV
          </Boton>
        </>
      )}
    </div>
  );
}
