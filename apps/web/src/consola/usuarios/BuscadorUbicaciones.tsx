import { useState } from 'react';
import { useBuscarUbicaciones, type Ubicacion } from '../../api/red';
import { Icono } from '../../componentes/Icono';
import { Buscador } from '../red/Buscador';

interface Props {
  /** Ids que ya están elegidos: no se ofrecen otra vez. */
  excluir: string[];
  alElegir: (u: Ubicacion) => void;
}

const TIPO = { ACOPIO: 'Acopio', ZONA: 'Zona' } as const;

/** Busca acopios y zonas por nombre para asignarlos (B-08). */
export function BuscadorUbicaciones({ excluir, alElegir }: Props) {
  const [q, fijarQ] = useState('');
  const { data, error } = useBuscarUbicaciones('');
  const texto = q.trim().toLocaleLowerCase('es-CO');
  const resultados =
    texto.length < 2
      ? []
      : (data ?? [])
          .filter((u) => !excluir.includes(u.id))
          .filter((u) => `${u.nombre} ${u.municipio}`.toLocaleLowerCase('es-CO').includes(texto))
          .slice(0, 8);

  return (
    <div className="flex flex-col gap-space-xs">
      <Buscador etiqueta="Buscar acopio o zona" valor={q} alCambiar={fijarQ} />
      {error && <p className="text-body-sm text-error">{error.message}</p>}
      {texto.length >= 2 && data && resultados.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Ningún acopio ni zona coincide.</p>
      )}
      {resultados.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-surface-container-lowest">
          {resultados.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                aria-label={`Agregar ${u.nombre} (${TIPO[u.tipo]}, ${u.municipio})`}
                onClick={() => {
                  alElegir(u);
                  fijarQ('');
                }}
                className="flex min-h-[48px] w-full items-center gap-space-sm px-space-md py-space-xs text-left"
              >
                <Icono
                  nombre={u.tipo === 'ACOPIO' ? 'inventory_2' : 'location_on'}
                  className="text-[20px] text-primary-container"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-md text-on-surface">{u.nombre}</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {TIPO[u.tipo]} · {u.municipio}
                  </span>
                </span>
                <Icono nombre="add" className="text-[20px] text-primary-container" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Una ubicación elegida, con su nombre y el botón para quitarla. */
export function UbicacionElegida({
  tipo,
  nombre,
  alQuitar,
}: {
  tipo: 'ACOPIO' | 'ZONA';
  nombre: string;
  alQuitar: () => void;
}) {
  return (
    <li className="flex items-center gap-space-xs rounded-lg bg-surface-container-low p-space-sm text-body-md">
      <Icono
        nombre={tipo === 'ACOPIO' ? 'inventory_2' : 'location_on'}
        className="text-[20px] text-primary-container"
      />
      <span className="min-w-0 flex-1">
        <span className="text-on-surface">{nombre}</span>
        <span className="text-body-sm text-on-surface-variant"> · {TIPO[tipo]}</span>
      </span>
      <button
        type="button"
        aria-label={`Quitar ${nombre}`}
        onClick={alQuitar}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant"
      >
        <Icono nombre="delete" className="text-[20px]" />
      </button>
    </li>
  );
}
