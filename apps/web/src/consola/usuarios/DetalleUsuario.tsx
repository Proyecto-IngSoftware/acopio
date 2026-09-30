import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  useCambiarRol,
  useReactivar,
  useReenviarInvitacion,
  useRestablecer,
  useSuspender,
  useUsuario,
  type RolInterno,
  type Usuario,
} from '../../api/usuarios';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from '../catalogo/FormularioError';
import { Encabezado } from '../Encabezado';
import { CompartirEnlace, DistintivoEstado, ROLES } from './comun';

const fecha = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-space-sm">
      <h2 id={id} className="px-space-xs text-label-caps tracking-wider text-primary uppercase">
        {titulo}
      </h2>
      <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        {children}
      </div>
    </section>
  );
}

/** C16 Detalle de usuario (RF-IDE-006 a 009). */
export function DetalleUsuario() {
  const { id = '' } = useParams();
  const { data: u, error, isPending, refetch } = useUsuario(id);

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      {isPending && <Esqueleto etiqueta="Cargando la persona" className="h-48" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {u && <Contenido u={u} />}
    </div>
  );
}

function Contenido({ u }: { u: Usuario }) {
  const ubicaciones =
    u.rol === 'ADMIN'
      ? 'Todas las ubicaciones'
      : u.asignaciones.length === 1
        ? '1 ubicación asignada'
        : `${u.asignaciones.length} ubicaciones asignadas`;

  return (
    <>
      <Encabezado titulo={u.nombre} volverA="/consola/usuarios" />
      <div className="flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <span className="text-body-lg font-bold text-on-surface">
            {u.username ? `@${u.username}` : 'Sin usuario'}
          </span>
          <DistintivoEstado estado={u.estado} />
        </div>
        <p className="text-body-md text-on-surface-variant">
          {u.correo ?? 'Sin correo: el enlace va por WhatsApp'}
        </p>
        <p className="text-body-sm text-on-surface-variant">Creada el {fecha(u.creadoEn)}</p>
      </div>

      <Seccion id="ubicaciones" titulo="Ubicaciones asignadas">
        <p className="text-body-md text-on-surface">{ubicaciones}</p>
        {u.rol !== 'ADMIN' && (
          <p className="text-body-sm text-on-surface-variant">
            Asignar y quitar ubicaciones por nombre llega con la lista de acopios (Bloque 1).
          </p>
        )}
      </Seccion>

      <CambiarRol u={u} />
      <Acceso u={u} />

      <Link
        to={`/consola/bitacora?usuario=${u.id}&nombre=${encodeURIComponent(u.nombre)}`}
        className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="history" className="text-[18px]" />
        Ver su actividad en la bitácora
      </Link>
    </>
  );
}

function CambiarRol({ u }: { u: Usuario }) {
  const cambiar = useCambiarRol();
  const [rol, fijarRol] = useState<RolInterno>(u.rol as RolInterno);
  return (
    <Seccion id="rol" titulo="Rol">
      <Selector
        id="rol-usuario"
        etiqueta="Rol asignado"
        value={rol}
        onChange={(e) => fijarRol(e.target.value as RolInterno)}
      >
        {ROLES.map((r) => (
          <option key={r.rol} value={r.rol}>
            {r.nombre}
          </option>
        ))}
      </Selector>
      <p className="text-body-sm text-on-surface-variant">
        El cambio aplica en su siguiente acción.
      </p>
      <FormularioError mensaje={cambiar.error?.message} />
      {cambiar.isSuccess && (
        <p role="status" className="text-body-sm text-exito">
          Rol guardado.
        </p>
      )}
      <Boton
        variante="secundario"
        disabled={rol === u.rol || cambiar.isPending}
        onClick={() => cambiar.mutate({ id: u.id, rol })}
      >
        Guardar rol
      </Boton>
    </Seccion>
  );
}

function Acceso({ u }: { u: Usuario }) {
  const [hoja, fijarHoja] = useState<'suspender' | 'restablecer' | null>(null);
  const reactivar = useReactivar();
  const reenviar = useReenviarInvitacion();

  return (
    <Seccion id="acceso" titulo="Acceso">
      {u.estado === 'ACTIVO' && (
        <>
          <Boton variante="secundario" onClick={() => fijarHoja('restablecer')}>
            <Icono nombre="lock_reset" className="text-[18px]" />
            Restablecer acceso
          </Boton>
          <p className="text-body-sm text-on-surface-variant">
            Genera un enlace nuevo y cierra sus sesiones abiertas.
          </p>
          <button
            type="button"
            onClick={() => fijarHoja('suspender')}
            className="flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl bg-secondary-container px-space-md text-label-md text-on-secondary"
          >
            <Icono nombre="person_off" className="text-[18px]" />
            Suspender
          </button>
          <p className="text-body-sm text-on-surface-variant">
            No podrá entrar hasta que la reactives.
          </p>
        </>
      )}
      {u.estado === 'SUSPENDIDO' && (
        <>
          <Boton disabled={reactivar.isPending} onClick={() => reactivar.mutate(u.id)}>
            Reactivar
          </Boton>
          <FormularioError mensaje={reactivar.error?.message} />
        </>
      )}
      {u.estado === 'INVITADO' && (
        <>
          <p className="text-body-md text-on-surface">
            {u.invitacionPendiente
              ? `La invitación vence el ${fecha(u.invitacionPendiente.venceEn)}.`
              : 'La invitación venció o se revocó.'}
          </p>
          {reenviar.data ? (
            <CompartirEnlace enlace={reenviar.data.enlace} nombre={u.nombre} />
          ) : (
            <Boton
              variante="secundario"
              disabled={reenviar.isPending}
              onClick={() => reenviar.mutate(u.id)}
            >
              Generar enlace nuevo
            </Boton>
          )}
          <FormularioError mensaje={reenviar.error?.message} />
        </>
      )}
      {hoja === 'suspender' && <Suspender u={u} alCerrar={() => fijarHoja(null)} />}
      {hoja === 'restablecer' && <Restablecer u={u} alCerrar={() => fijarHoja(null)} />}
    </Seccion>
  );
}

function Suspender({ u, alCerrar }: { u: Usuario; alCerrar: () => void }) {
  const suspender = useSuspender();
  return (
    <Hoja titulo={`Suspender a ${u.nombre}`} alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface">
        No podrá entrar a la consola hasta que la reactives. Sus registros se conservan.
      </p>
      <FormularioError mensaje={suspender.error?.message} />
      <button
        type="button"
        disabled={suspender.isPending}
        onClick={() => suspender.mutate(u.id, { onSuccess: alCerrar })}
        className="flex min-h-[48px] items-center justify-center rounded-xl bg-secondary-container px-space-md text-label-md text-on-secondary"
      >
        Suspender
      </button>
    </Hoja>
  );
}

function Restablecer({ u, alCerrar }: { u: Usuario; alCerrar: () => void }) {
  const restablecer = useRestablecer();
  const [motivo, fijarMotivo] = useState('');
  const [aviso, fijarAviso] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (motivo.trim().length < 20) {
      fijarAviso('El motivo necesita al menos 20 caracteres.');
      return;
    }
    fijarAviso(null);
    restablecer.mutate({ id: u.id, motivo: motivo.trim() });
  }

  return (
    <Hoja titulo="Restablecer acceso" alCerrar={alCerrar}>
      {restablecer.data ? (
        <CompartirEnlace enlace={restablecer.data.enlace} nombre={u.nombre} />
      ) : (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-space-md">
          <p className="text-body-md text-on-surface">
            {u.nombre} define una contraseña nueva con el enlace. Sus sesiones abiertas se cierran.
          </p>
          <Campo
            id="motivo-restablecer"
            etiqueta="Motivo"
            ayuda="Queda en la bitácora. Mínimo 20 caracteres."
            value={motivo}
            onChange={(e) => fijarMotivo(e.target.value)}
          />
          <FormularioError mensaje={aviso ?? restablecer.error?.message} />
          <Boton type="submit" disabled={restablecer.isPending}>
            Generar enlace
          </Boton>
        </form>
      )}
    </Hoja>
  );
}
