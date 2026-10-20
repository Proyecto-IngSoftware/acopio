import { useState } from 'react';
import { useBuscarCategorias, usePresentaciones, type Presentacion } from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';

interface Props {
  /** Lo que se sabe de la línea: arriba de la hoja, para que el Operador la reconozca. */
  descripcion: string;
  /** La categoría de la línea: sus presentaciones salen primero, sin buscar. */
  categoria: { id: string; nombre: string };
  actual: string | null;
  alElegir: (presentacion: Presentacion) => void;
  alCerrar: () => void;
}

/** Recepción: el Operador corrige la presentación de un código, de cualquier categoría. */
export function HojaCorregirPresentacion({
  descripcion,
  categoria,
  actual,
  alElegir,
  alCerrar,
}: Props) {
  const [q, fijarQ] = useState('');
  const [eleccion, fijarEleccion] = useState<Presentacion | null>(null);
  const texto = q.trim();
  const resultados = useBuscarCategorias(texto);
  const grupos = texto
    ? (resultados.data ?? []).map((c) => ({ id: c.id, nombre: c.nombre }))
    : [categoria];

  return (
    <Hoja titulo="Corregir presentación" alCerrar={alCerrar}>
      <p className="min-w-0 text-body-md break-words text-on-surface-variant">{descripcion}</p>
      <div className="flex min-h-[56px] items-center gap-space-sm rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-md">
        <Icono nombre="search" className="shrink-0 text-[24px] text-on-surface-variant" />
        <input
          type="search"
          aria-label="Buscar categoría"
          placeholder="Buscar categoría"
          autoComplete="off"
          value={q}
          onChange={(e) => fijarQ(e.target.value)}
          className="min-h-[48px] w-full min-w-0 bg-transparent text-body-lg text-on-surface"
        />
      </div>
      <div role="radiogroup" aria-label="Presentaciones" className="flex flex-col gap-space-sm">
        {texto && resultados.isPending ? (
          <Esqueleto etiqueta="Buscando" className="h-12" />
        ) : grupos.length === 0 ? (
          <p className="text-body-md text-on-surface-variant">No hay categorías con ese texto.</p>
        ) : (
          grupos.map((g) => (
            <Grupo
              key={g.id}
              categoria={g}
              actual={actual}
              eleccion={eleccion?.id ?? null}
              alElegir={fijarEleccion}
            />
          ))
        )}
      </div>
      {!texto && (
        <p className="text-body-sm text-on-surface-variant">
          Busca otra categoría para ver sus presentaciones.
        </p>
      )}
      <p className="flex items-start gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
        <Icono nombre="info" className="shrink-0 text-[22px] text-on-surface-variant" />
        <span className="min-w-0">
          Al terminar la recepción, el código queda validado con lo que elijas.
        </span>
      </p>
      <Boton
        className="min-h-[56px] w-full"
        disabled={!eleccion}
        onClick={() => alElegir(eleccion!)}
      >
        Guardar corrección
      </Boton>
    </Hoja>
  );
}

function Grupo({
  categoria,
  actual,
  eleccion,
  alElegir,
}: {
  categoria: { id: string; nombre: string };
  actual: string | null;
  eleccion: string | null;
  alElegir: (p: Presentacion) => void;
}) {
  const presentaciones = usePresentaciones(categoria.id);
  return (
    <div role="group" aria-label={categoria.nombre} className="flex flex-col gap-space-xs">
      <h3 className="text-label-md font-bold text-on-surface-variant">{categoria.nombre}</h3>
      {presentaciones.isPending ? (
        <Esqueleto etiqueta="Cargando presentaciones" className="h-12" />
      ) : (presentaciones.data ?? []).length === 0 ? (
        <p className="text-body-md text-on-surface-variant">Sin presentaciones.</p>
      ) : (
        presentaciones.data!.map((p) => {
          const marcada = (eleccion ?? actual) === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={marcada}
              onClick={() => alElegir(p)}
              className={`flex min-h-[48px] w-full items-center gap-space-sm rounded-xl border px-space-md text-left ${
                marcada
                  ? 'border-[1.5px] border-primary-container bg-primary-fixed'
                  : 'border-outline-variant bg-surface-container-lowest'
              }`}
            >
              <Icono
                nombre={marcada ? 'radio_button_checked' : 'radio_button_unchecked'}
                className="shrink-0 text-[22px] text-primary-container"
              />
              <span className="min-w-0 font-bold break-words text-on-surface">{p.nombre}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
