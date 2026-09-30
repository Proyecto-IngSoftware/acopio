import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  GRUPOS,
  porPersona,
  UNIDADES,
  useArchivarCategoria,
  useCanasta,
  useCategorias,
  useGuardarCategoria,
  type Categoria,
  type Grupo,
  type Unidad,
} from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from './FormularioError';

const GRUPO_ORDEN = Object.keys(GRUPOS) as Grupo[];

export function PestanaCategorias() {
  const [q, fijarQ] = useState('');
  const [grupo, fijarGrupo] = useState<Grupo | undefined>();
  const [archivadas, fijarArchivadas] = useState(false);
  const [editando, fijarEditando] = useState<Categoria | 'nueva' | null>(null);
  const { data, error, isPending, refetch } = useCategorias({ q, grupo, archivadas });
  const { data: canasta } = useCanasta();
  const archivar = useArchivarCategoria();

  const cantidades = new Map(canasta?.map((c) => [c.categoriaId, c]) ?? []);
  const porGrupo = GRUPO_ORDEN.map((g) => ({
    grupo: g,
    categorias: (data ?? []).filter((c) => c.grupo === g),
  })).filter((g) => g.categorias.length > 0);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="relative">
        <Icono
          nombre="search"
          className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[20px] text-on-surface-variant"
        />
        <input
          type="search"
          aria-label="Buscar categoría"
          placeholder="Buscar categoría (acepta errores, ej. aroz)"
          value={q}
          onChange={(e) => fijarQ(e.target.value)}
          className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest pr-space-md pl-12 text-body-md text-on-surface"
        />
      </div>

      <div className="flex gap-space-xs overflow-x-auto pb-1">
        {[undefined, ...GRUPO_ORDEN].map((g) => (
          <button
            key={g ?? 'todos'}
            type="button"
            aria-pressed={grupo === g}
            onClick={() => fijarGrupo(g)}
            className={`min-h-[40px] shrink-0 rounded-full px-space-md text-label-md ${
              grupo === g
                ? 'bg-primary-container text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {g ? GRUPOS[g] : 'Todos'}
          </button>
        ))}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={archivadas}
        onClick={() => fijarArchivadas(!archivadas)}
        className="flex min-h-[48px] items-center justify-between rounded-xl bg-surface-container-lowest px-space-md text-body-md text-on-surface shadow-sm"
      >
        Ver archivadas
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${archivadas ? 'bg-primary-container' : 'bg-outline-variant'}`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-surface-container-lowest transition-transform ${archivadas ? 'translate-x-5' : ''}`}
          />
        </span>
      </button>

      {isPending && <Esqueleto etiqueta="Cargando categorías" className="h-40" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && porGrupo.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-on-surface-variant">
          No hay categorías con estos filtros.
        </p>
      )}
      {archivar.error && <FormularioError mensaje={archivar.error.message} />}

      {porGrupo.map(({ grupo: g, categorias }) => (
        <section key={g} aria-labelledby={`grupo-${g}`} className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-space-xs">
            <h2 id={`grupo-${g}`} className="text-label-caps tracking-wider text-primary uppercase">
              {GRUPOS[g]}
            </h2>
            <span className="text-body-sm text-on-surface-variant">
              {categorias.length} {categorias.length === 1 ? 'categoría' : 'categorías'}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            {categorias.map((c) => {
              const canastaDe = cantidades.get(c.id);
              return (
                <li
                  key={c.id}
                  className={`flex items-start gap-space-sm p-space-md ${c.archivada ? 'opacity-70' : ''}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-space-xs">
                      <span className="text-body-lg font-bold text-on-surface">{c.nombre}</span>
                      <span className="rounded bg-surface-container px-1.5 text-label-md text-on-surface-variant">
                        {UNIDADES[c.unidadBase]}
                      </span>
                      {c.perecedero && (
                        <span className="rounded bg-tertiary-fixed px-1.5 text-label-md text-tertiary-container">
                          Perecedero
                        </span>
                      )}
                      {c.archivada && (
                        <span className="rounded bg-surface-container-high px-1.5 text-label-md text-on-surface-variant">
                          Archivada
                        </span>
                      )}
                    </div>
                    {canastaDe && (
                      <p className="text-body-sm text-on-surface-variant tabular-nums">
                        {porPersona(canastaDe.cantidadPersonaDia, c.unidadBase)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Editar ${c.nombre}`}
                    onClick={() => fijarEditando(c)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-on-surface-variant"
                  >
                    <Icono nombre="edit" className="text-[22px]" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${c.archivada ? 'Reactivar' : 'Archivar'} ${c.nombre}`}
                    disabled={archivar.isPending}
                    onClick={() => archivar.mutate({ id: c.id, archivar: !c.archivada })}
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-on-surface-variant"
                  >
                    <Icono nombre={c.archivada ? 'unarchive' : 'archive'} className="text-[22px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Boton className="min-h-[56px] w-full" onClick={() => fijarEditando('nueva')}>
        <Icono nombre="add_circle" className="text-[20px]" />
        Nueva categoría
      </Boton>

      {editando && (
        <FormularioCategoria
          categoria={editando === 'nueva' ? null : editando}
          alCerrar={() => fijarEditando(null)}
        />
      )}
    </div>
  );
}

function FormularioCategoria({
  categoria,
  alCerrar,
}: {
  categoria: Categoria | null;
  alCerrar: () => void;
}) {
  const guardar = useGuardarCategoria();
  const [nombre, fijarNombre] = useState(categoria?.nombre ?? '');
  const [grupo, fijarGrupo] = useState<Grupo | ''>(categoria?.grupo ?? '');
  const [unidad, fijarUnidad] = useState<Unidad | ''>(categoria?.unidadBase ?? '');
  const [perecedero, fijarPerecedero] = useState(categoria?.perecedero ?? false);
  const [sinonimos, fijarSinonimos] = useState((categoria?.sinonimos ?? []).join(', '));

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!grupo || !unidad) return;
    guardar.mutate(
      {
        id: categoria?.id,
        datos: {
          nombre: nombre.trim(),
          grupo,
          unidadBase: unidad,
          perecedero,
          sinonimos: sinonimos
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      },
      { onSuccess: alCerrar },
    );
  }

  return (
    <Hoja titulo={categoria ? `Editar ${categoria.nombre}` : 'Nueva categoría'} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        <Campo
          id="cat-nombre"
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          required
        />
        <Selector
          id="cat-grupo"
          etiqueta="Grupo"
          value={grupo}
          onChange={(e) => fijarGrupo(e.target.value as Grupo)}
          required
        >
          <option value="">Elige un grupo</option>
          {GRUPO_ORDEN.map((g) => (
            <option key={g} value={g}>
              {GRUPOS[g]}
            </option>
          ))}
        </Selector>
        <Selector
          id="cat-unidad"
          etiqueta="Unidad base"
          ayuda={categoria ? 'La unidad no cambia después de crear la categoría.' : undefined}
          value={unidad}
          onChange={(e) => fijarUnidad(e.target.value as Unidad)}
          disabled={Boolean(categoria)}
          required
        >
          <option value="">Elige una unidad</option>
          <option value="KILOGRAMO">Kilogramo (kg)</option>
          <option value="LITRO">Litro (L)</option>
          <option value="UNIDAD">Unidad</option>
        </Selector>
        <Campo
          id="cat-sinonimos"
          etiqueta="Sinónimos (separados por coma)"
          ayuda="Ayudan a encontrarla en la búsqueda."
          value={sinonimos}
          onChange={(e) => fijarSinonimos(e.target.value)}
        />
        <label className="flex min-h-[48px] items-center gap-space-sm text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={perecedero}
            onChange={(e) => fijarPerecedero(e.target.checked)}
            className="h-5 w-5 accent-primary-container"
          />
          Perecedero (pide fecha de vencimiento al recibir)
        </label>
        <FormularioError mensaje={guardar.error?.message} />
        <Boton type="submit" className="w-full" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}
