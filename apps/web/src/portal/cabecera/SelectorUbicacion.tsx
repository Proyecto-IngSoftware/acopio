import { useState } from 'react';
import type { Ubicacion } from '../../api/red';
import { EtiquetaEstado, type EstadoRed } from '../../componentes/EtiquetaEstado';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { useUbicacionActiva } from '../../sesion/ubicacion-activa';

function iconoDe(u: Ubicacion) {
  if (u.tipo === 'ACOPIO') return 'warehouse';
  return 'location_on';
}

function Grupo({
  titulo,
  lista,
  activa,
  alElegir,
}: {
  titulo: string;
  lista: Ubicacion[];
  activa: Ubicacion;
  alElegir: (id: string) => void;
}) {
  if (lista.length === 0) return null;
  const id = `grupo-${titulo}`;
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-space-xs">
      <h3 id={id} className="text-label-caps text-on-surface-variant uppercase">
        {titulo}
      </h3>
      {lista.map((u) => {
        const elegida = u.id === activa.id;
        return (
          <button
            key={u.id}
            type="button"
            aria-pressed={elegida}
            onClick={() => alElegir(u.id)}
            className={`flex min-h-[56px] items-center gap-space-sm rounded-lg px-space-sm text-left ${
              elegida
                ? 'border-2 border-primary-container bg-surface-container-low'
                : 'border border-outline-variant'
            }`}
          >
            <Icono nombre={iconoDe(u)} className="text-[22px] text-on-surface-variant" />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body-md font-semibold text-on-surface">{u.nombre}</span>
              <span className="flex flex-wrap items-center gap-space-xs text-body-sm text-on-surface-variant">
                {u.municipio}
                <EtiquetaEstado estado={u.estado as EstadoRed} />
              </span>
            </span>
            {elegida && (
              <Icono nombre="check_circle" className="text-[22px] text-primary-container" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Conmutador de ubicación de la cabecera (RF-IDE-010, J-02 y J-03). Solo aparece con
 *  dos ubicaciones o más. */
export function SelectorUbicacion() {
  const { ubicaciones, activa, elegir } = useUbicacionActiva();
  const [abierto, fijarAbierto] = useState(false);
  if (!activa || ubicaciones.length < 2) return null;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`Ubicación activa: ${activa.nombre}. Cambiar`}
        onClick={() => fijarAbierto(true)}
        className="flex h-11 min-w-0 items-center gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-space-sm text-label-md text-on-surface"
      >
        <Icono nombre={iconoDe(activa)} className="text-[20px] text-primary-container" />
        <span className="min-w-0 truncate">{activa.nombre}</span>
        <Icono nombre="expand_more" className="text-[20px]" />
      </button>
      {abierto && (
        <Hoja titulo="¿Dónde estás operando?" alCerrar={() => fijarAbierto(false)}>
          <p className="text-body-sm text-on-surface-variant">
            Lo que registres queda en esta ubicación. Puedes cambiarla cuando quieras.
          </p>
          {(
            [
              ['Acopios', 'ACOPIO'],
              ['Zonas', 'ZONA'],
            ] as const
          ).map(([titulo, tipo]) => (
            <Grupo
              key={tipo}
              titulo={titulo}
              lista={ubicaciones.filter((u) => u.tipo === tipo)}
              activa={activa}
              alElegir={(id) => {
                elegir(id);
                fijarAbierto(false);
              }}
            />
          ))}
        </Hoja>
      )}
    </>
  );
}
