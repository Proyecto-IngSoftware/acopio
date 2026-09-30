import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  porPersona,
  UNIDADES,
  useCanasta,
  useNuevaVersionCanasta,
  type CanastaVigente,
} from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from './FormularioError';

const fecha = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Canasta estándar vigente (RF-CAT-003). Cada cambio es una versión nueva; la anterior
 *  queda en el historial. */
export function PestanaCanasta() {
  const { data, error, isPending, refetch } = useCanasta();
  const [editando, fijarEditando] = useState<CanastaVigente | null>(null);

  return (
    <section aria-labelledby="canasta-vigente" className="flex flex-col gap-space-sm">
      <h2
        id="canasta-vigente"
        className="px-space-xs text-label-caps tracking-wider text-primary uppercase"
      >
        Canasta vigente
      </h2>
      <p className="px-space-xs text-body-sm text-on-surface-variant">
        Cantidad por persona al día con la que el motor calcula la necesidad de cada zona.
      </p>
      {isPending && <Esqueleto etiqueta="Cargando la canasta" className="h-40" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-on-surface-variant">
          Todavía no hay categorías en la canasta.
        </p>
      )}
      {data && data.length > 0 && (
        <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
          {data.map((c) => (
            <li key={c.categoriaId} className="flex items-center gap-space-sm p-space-md">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-lg font-bold text-on-surface">{c.categoria}</span>
                <span className="text-body-md text-on-surface tabular-nums">
                  {porPersona(c.cantidadPersonaDia, c.unidadBase)}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {c.fuente} · desde {fecha(c.vigenteDesde)}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Nueva versión de ${c.categoria}`}
                onClick={() => fijarEditando(c)}
                className="flex h-12 w-12 items-center justify-center rounded-lg text-on-surface-variant"
              >
                <Icono nombre="edit" className="text-[22px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editando && <FormularioVersion canasta={editando} alCerrar={() => fijarEditando(null)} />}
    </section>
  );
}

function FormularioVersion({
  canasta,
  alCerrar,
}: {
  canasta: CanastaVigente;
  alCerrar: () => void;
}) {
  const guardar = useNuevaVersionCanasta();
  const [cantidad, fijarCantidad] = useState(canasta.cantidadPersonaDia.toLocaleString('es-CO'));
  const [fuente, fijarFuente] = useState('');
  const [desde, fijarDesde] = useState('');
  const [aviso, fijarAviso] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const numero = Number(cantidad.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numero) || numero <= 0) {
      fijarAviso('Escribe una cantidad mayor que cero.');
      return;
    }
    fijarAviso(null);
    guardar.mutate(
      {
        id: canasta.categoriaId,
        cantidadPersonaDia: numero,
        fuente: fuente.trim(),
        vigenteDesde: desde || undefined,
      },
      { onSuccess: alCerrar },
    );
  }

  return (
    <Hoja titulo={`Canasta de ${canasta.categoria}`} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        <Campo
          id="canasta-cantidad"
          etiqueta={`Cantidad por persona al día (${UNIDADES[canasta.unidadBase]})`}
          inputMode="decimal"
          value={cantidad}
          onChange={(e) => fijarCantidad(e.target.value)}
          required
        />
        <Campo
          id="canasta-fuente"
          etiqueta="Fuente"
          ayuda="De dónde sale la cifra, por ejemplo el Manual Esfera."
          value={fuente}
          onChange={(e) => fijarFuente(e.target.value)}
          required
        />
        <Campo
          id="canasta-desde"
          etiqueta="Vigente desde"
          ayuda="Si lo dejas vacío, rige desde hoy."
          type="date"
          value={desde}
          onChange={(e) => fijarDesde(e.target.value)}
        />
        <FormularioError mensaje={aviso ?? guardar.error?.message} />
        <Boton type="submit" className="w-full" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}
