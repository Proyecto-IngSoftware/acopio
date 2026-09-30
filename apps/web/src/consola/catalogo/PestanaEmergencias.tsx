import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  useCerrarEmergencia,
  useEmergenciasConsola,
  useGuardarEmergencia,
  type Emergencia,
} from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from './FormularioError';

const ESTADOS: Record<Emergencia['estado'], { texto: string; icono: string; clases: string }> = {
  ACTIVA: { texto: 'Activa', icono: 'check_circle', clases: 'bg-exito-container text-exito' },
  EN_SEGUIMIENTO: {
    texto: 'En seguimiento',
    icono: 'schedule',
    clases: 'bg-tertiary-fixed text-tertiary-container',
  },
  CERRADA: {
    texto: 'Cerrada',
    icono: 'lock',
    clases: 'bg-surface-container-high text-on-surface-variant',
  },
};
const fecha = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Emergencias (RF-CAT-005, ADR-0010): pueden estar activas varias; cerrar es manual. */
export function PestanaEmergencias() {
  const { data, error, isPending, refetch } = useEmergenciasConsola();
  const [editando, fijarEditando] = useState<Emergencia | 'nueva' | null>(null);
  const [cerrando, fijarCerrando] = useState<Emergencia | null>(null);

  return (
    <section aria-labelledby="titulo-emergencias" className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between px-space-xs">
        <h2
          id="titulo-emergencias"
          className="text-label-caps tracking-wider text-primary uppercase"
        >
          Emergencias
        </h2>
        <Boton className="min-h-[44px]" onClick={() => fijarEditando('nueva')}>
          <Icono nombre="add" className="text-[20px]" />
          Nueva emergencia
        </Boton>
      </div>
      {isPending && <Esqueleto etiqueta="Cargando emergencias" className="h-40" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-on-surface-variant">
          Todavía no hay emergencias registradas.
        </p>
      )}
      {data?.map((e) => {
        const estado = ESTADOS[e.estado];
        const abierta = e.estado !== 'CERRADA';
        return (
          <article
            key={e.id}
            className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
          >
            <div className="flex items-start justify-between gap-space-sm">
              <h3 className="text-body-lg font-bold text-on-surface">{e.nombre}</h3>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-label-md ${estado.clases}`}
              >
                <Icono nombre={estado.icono} className="text-[16px]" />
                {estado.texto}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {e.tipo} · inicio {fecha(e.inicio)}
            </p>
            {abierta && (
              <p className="text-body-sm text-on-surface">
                Destacada hasta {fecha(e.destacadaHasta)}
              </p>
            )}
            {abierta && (
              <div className="grid grid-cols-2 gap-space-sm">
                <Boton
                  variante="secundario"
                  aria-label={`Editar ${e.nombre}`}
                  onClick={() => fijarEditando(e)}
                >
                  <Icono nombre="edit" className="text-[18px]" />
                  Editar
                </Boton>
                <button
                  type="button"
                  aria-label={`Cerrar ${e.nombre}`}
                  onClick={() => fijarCerrando(e)}
                  className="flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl border-[1.5px] border-secondary-container bg-surface-container-lowest px-space-md text-label-md text-secondary"
                >
                  <Icono nombre="lock" className="text-[18px]" />
                  Cerrar
                </button>
              </div>
            )}
          </article>
        );
      })}
      {editando && (
        <FormularioEmergencia
          emergencia={editando === 'nueva' ? null : editando}
          alCerrar={() => fijarEditando(null)}
        />
      )}
      {cerrando && <CerrarEmergencia emergencia={cerrando} alCerrar={() => fijarCerrando(null)} />}
    </section>
  );
}

function FormularioEmergencia({
  emergencia,
  alCerrar,
}: {
  emergencia: Emergencia | null;
  alCerrar: () => void;
}) {
  const guardar = useGuardarEmergencia();
  const [nombre, fijarNombre] = useState(emergencia?.nombre ?? '');
  const [tipo, fijarTipo] = useState(emergencia?.tipo ?? '');
  const [inicio, fijarInicio] = useState(emergencia?.inicio.slice(0, 10) ?? '');
  const [destacada, fijarDestacada] = useState(emergencia?.destacadaHasta.slice(0, 10) ?? '');

  function enviar(e: FormEvent) {
    e.preventDefault();
    guardar.mutate(
      {
        id: emergencia?.id,
        datos: { nombre: nombre.trim(), tipo: tipo.trim(), inicio, destacadaHasta: destacada },
      },
      { onSuccess: alCerrar },
    );
  }

  return (
    <Hoja
      titulo={emergencia ? `Editar ${emergencia.nombre}` : 'Nueva emergencia'}
      alCerrar={alCerrar}
    >
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        <Campo
          id="em-nombre"
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          required
        />
        <Campo
          id="em-tipo"
          etiqueta="Tipo"
          ayuda="Por ejemplo: sismo, inundación, deslizamiento."
          value={tipo}
          onChange={(e) => fijarTipo(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-space-sm">
          <Campo
            id="em-inicio"
            etiqueta="Inicio"
            type="date"
            value={inicio}
            onChange={(e) => fijarInicio(e.target.value)}
            required
          />
          <Campo
            id="em-destacada"
            etiqueta="Destacada hasta"
            type="date"
            value={destacada}
            onChange={(e) => fijarDestacada(e.target.value)}
            required
          />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Después de esa fecha baja a «en seguimiento» en el portal; el motor la sigue atendiendo
          igual.
        </p>
        <FormularioError mensaje={guardar.error?.message} />
        <Boton type="submit" className="w-full" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}

function CerrarEmergencia({
  emergencia,
  alCerrar,
}: {
  emergencia: Emergencia;
  alCerrar: () => void;
}) {
  const cerrar = useCerrarEmergencia();
  const [motivo, fijarMotivo] = useState('');
  const [aviso, fijarAviso] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) {
      fijarAviso('Escribe el motivo del cierre.');
      return;
    }
    fijarAviso(null);
    cerrar.mutate({ id: emergencia.id, motivo: motivo.trim() }, { onSuccess: alCerrar });
  }

  return (
    <Hoja titulo="Cerrar emergencia" alCerrar={alCerrar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-space-md">
        <p className="text-body-md text-on-surface">
          {emergencia.nombre} deja de mostrarse en el portal. Cerrarla no se puede deshacer.
        </p>
        <Campo
          id="em-motivo"
          etiqueta="Motivo"
          value={motivo}
          onChange={(e) => fijarMotivo(e.target.value)}
        />
        <FormularioError mensaje={aviso ?? cerrar.error?.message} />
        <button
          type="submit"
          disabled={cerrar.isPending}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-secondary-container px-space-md text-label-md text-on-secondary"
        >
          {cerrar.isPending ? 'Cerrando…' : 'Cerrar emergencia'}
        </button>
      </form>
    </Hoja>
  );
}
