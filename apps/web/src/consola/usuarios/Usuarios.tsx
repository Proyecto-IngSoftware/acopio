import { useState } from 'react';
import { Link } from 'react-router';
import { useUsuarios, type EstadoUsuario, type RolInterno } from '../../api/usuarios';
import { EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { iniciales } from '../../sesion/roles';
import { Encabezado } from '../Encabezado';
import { DistintivoEstado, ROLES } from './comun';

const FILTRO_ESTADO: { estado?: EstadoUsuario; texto: string }[] = [
  { texto: 'Todos' },
  { estado: 'ACTIVO', texto: 'Activos' },
  { estado: 'INVITADO', texto: 'Invitados' },
  { estado: 'SUSPENDIDO', texto: 'Suspendidos' },
];

function Pildora({
  activa,
  texto,
  alTocar,
}: {
  activa: boolean;
  texto: string;
  alTocar: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={alTocar}
      className={`min-h-[40px] shrink-0 rounded-full px-space-md text-label-md ${
        activa
          ? 'bg-primary-container text-on-primary'
          : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {texto}
    </button>
  );
}

/** C16 Usuarios y accesos (RF-IDE-001 a 011). Diseño: docs/03-diseno/stitch/C16-usuarios. */
export function Usuarios() {
  const [q, fijarQ] = useState('');
  const [rol, fijarRol] = useState<RolInterno | undefined>();
  const [estado, fijarEstado] = useState<EstadoUsuario | undefined>();
  const { data, error, isPending, refetch } = useUsuarios({ q, rol, estado });
  const nombreRol = (r: string) => ROLES.find((x) => x.rol === r)?.nombre ?? r;

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Usuarios y accesos" subtitulo="Quién entra a la consola y dónde" />

      <div className="relative">
        <Icono
          nombre="search"
          className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[20px] text-on-surface-variant"
        />
        <input
          type="search"
          aria-label="Buscar por nombre o usuario"
          placeholder="Buscar por nombre o usuario"
          value={q}
          onChange={(e) => fijarQ(e.target.value)}
          className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest pr-space-md pl-12 text-body-md text-on-surface"
        />
      </div>

      <div className="flex flex-col gap-space-xs">
        <div role="group" aria-label="Rol" className="flex gap-space-xs overflow-x-auto pb-1">
          <Pildora activa={!rol} texto="Todos" alTocar={() => fijarRol(undefined)} />
          {ROLES.map((r) => (
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

      {isPending && <Esqueleto etiqueta="Cargando usuarios" className="h-48" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-on-surface-variant">
          No hay personas con estos filtros.
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {data.map((u) => (
            <li key={u.id}>
              <Link
                to={`/consola/usuarios/${u.id}`}
                className="flex items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm active:bg-surface-container"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-label-md font-bold text-primary-container">
                  {iniciales(u.nombre)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body-lg font-bold text-on-surface">{u.nombre}</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {u.username ? `@${u.username}` : 'Sin usuario'} · {nombreRol(u.rol)}
                  </span>
                  <span>
                    <DistintivoEstado estado={u.estado} />
                  </span>
                </span>
                <Icono nombre="chevron_right" className="text-[22px] text-outline" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <EnlaceBoton a="/consola/usuarios/invitar" className="min-h-[56px] w-full">
        <Icono nombre="person_add" className="text-[20px]" />
        Invitar persona
      </EnlaceBoton>
    </div>
  );
}
