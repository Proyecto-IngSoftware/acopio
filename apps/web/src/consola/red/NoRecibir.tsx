import { useState } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, formatearNumero, SIMBOLO_UNIDAD } from '@acopio/shared';
import { GRUPOS, useCategorias, type Categoria, type Grupo } from '../../api/catalogo';
import { useFijarUmbral, useQuitarUmbral, useSaldos } from '../../api/inventario';
import {
  useAcopiosGestion,
  useDesmarcarNoRecibir,
  useMarcarNoRecibir,
  useNoRecibir,
  type NoRecibe,
} from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { EstadoError } from '../../componentes/EstadoError';
import { TarjetaNoTraigan } from '../../componentes/TarjetaNoTraigan';
import { haceCuanto } from '../../formato';
import { useSesion } from '../../sesion/Sesion';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';
import { Buscador } from './Buscador';
import { limpiarCantidad } from '../inventario/TecladoCantidad';
import { errorUmbral } from './umbral';

type Umbral = { minimo: number; maximo: number };

const ORDEN = Object.keys(GRUPOS) as Grupo[];

/** C7 Umbrales y no recibir (RF-INV-007, RF-INV-008, B-02). Cada interruptor guarda al tocarlo;
 *  la fila abre la hoja del umbral. Diseño: docs/03-diseno/stitch/C07-umbrales. */
export function NoRecibir() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const acopioId = id!;
  const [q, fijarQ] = useState('');
  const { data: acopios } = useAcopiosGestion();
  const categorias = useCategorias({ archivadas: false, q: '' });
  const marcas = useNoRecibir(acopioId);
  const marcar = useMarcarNoRecibir(acopioId);
  const desmarcar = useDesmarcarNoRecibir(acopioId);
  // Los umbrales llegan con los saldos; si no cargan, la lista sigue sirviendo para «no recibir»
  const saldos = useSaldos(acopioId);
  const [editando, fijarEditando] = useState<Categoria | null>(null);

  const acopio = acopios?.find((a) => a.id === acopioId);
  const porCategoria = new Map((marcas.data ?? []).map((m) => [m.categoriaId, m]));
  const umbrales = new Map(
    (saldos.data ?? []).flatMap((s) => (s.umbral ? [[s.categoriaId, s.umbral] as const] : [])),
  );
  const texto = q.trim().toLocaleLowerCase('es-CO');
  const grupos = ORDEN.map((g) => ({
    grupo: g,
    categorias: (categorias.data ?? []).filter(
      (c) => c.grupo === g && c.nombre.toLocaleLowerCase('es-CO').includes(texto),
    ),
  })).filter((g) => g.categorias.length > 0);
  const volverA =
    usuario?.rol === 'ADMIN'
      ? `/consola/acopios/${acopioId}`
      : `/consola/acopios/${acopioId}/operacion`;
  const error = categorias.error ?? marcas.error;

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Umbrales y no recibir" subtitulo={acopio?.nombre} volverA={volverA} />
      {(categorias.isPending || marcas.isPending) && <Esqueleto etiqueta="Cargando categorías" />}
      {error && (
        <EstadoError
          mensaje={error.message}
          alReintentar={() => void (categorias.refetch(), marcas.refetch())}
        />
      )}
      {marcas.data && (
        <>
          <TarjetaNoTraigan
            items={marcas.data.map((m) => ({ categoria: m.categoria, hasta: m.hasta }))}
          />
          <p className="text-body-sm text-on-surface-variant">
            Lo que marques se publica de inmediato en el mapa y en la ficha del acopio.
          </p>
        </>
      )}
      <FormularioError mensaje={marcar.error?.message ?? desmarcar.error?.message} />
      <Buscador etiqueta="Buscar categoría" valor={q} alCambiar={fijarQ} />

      {categorias.data &&
        marcas.data &&
        grupos.map(({ grupo, categorias: lista }) => (
          <section
            key={grupo}
            aria-labelledby={`grupo-${grupo}`}
            className="flex flex-col gap-space-xs"
          >
            <h2
              id={`grupo-${grupo}`}
              className="text-label-caps tracking-wider text-on-surface-variant uppercase"
            >
              {GRUPOS[grupo]}
            </h2>
            <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
              {lista.map((c) => (
                <Fila
                  key={c.id}
                  nombre={c.nombre}
                  umbral={umbrales.get(c.id)}
                  unidad={c.unidadBase}
                  alAbrir={() => fijarEditando(c)}
                  marca={porCategoria.get(c.id)}
                  alMarcar={(hasta) => marcar.mutate({ categoriaId: c.id, hasta })}
                  alDesmarcar={() => desmarcar.mutate(c.id)}
                />
              ))}
            </ul>
          </section>
        ))}

      {editando && (
        <HojaUmbral
          acopioId={acopioId}
          categoria={editando}
          umbral={umbrales.get(editando.id)}
          alCerrar={() => fijarEditando(null)}
        />
      )}
    </div>
  );
}

function Fila({
  nombre,
  umbral,
  unidad,
  alAbrir,
  marca,
  alMarcar,
  alDesmarcar,
}: {
  nombre: string;
  umbral: Umbral | undefined;
  unidad: Categoria['unidadBase'];
  alAbrir: () => void;
  marca: NoRecibe | undefined;
  alMarcar: (hasta: string | null) => void;
  alDesmarcar: () => void;
}) {
  const id = `nr-${nombre.replace(/\W+/g, '-')}`;
  return (
    <li className={`flex flex-col gap-space-sm p-space-md ${marca ? 'bg-error-container/30' : ''}`}>
      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          onClick={alAbrir}
          className="flex min-h-[48px] min-w-0 flex-1 flex-col items-start text-left"
        >
          <span className="text-body-lg text-on-surface">{nombre}</span>
          <span className="flex items-center gap-1 text-body-sm text-on-surface-variant tabular-nums">
            {umbral && <Icono nombre="tune" className="text-[16px]" />}
            {umbral
              ? `Mín. ${formatearNumero(umbral.minimo)} · Máx. ${formatearCantidad(umbral.maximo, unidad)}`
              : 'Sin umbral'}
          </span>
        </button>
        <label className="flex cursor-pointer flex-col items-center gap-1 text-label-md text-on-surface-variant">
          <input
            type="checkbox"
            role="switch"
            aria-label={nombre}
            checked={Boolean(marca)}
            onChange={() => (marca ? alDesmarcar() : alMarcar(null))}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-7 w-12 shrink-0 rounded-full bg-outline-variant transition-colors peer-checked:bg-secondary-container peer-focus-visible:outline-2 peer-focus-visible:outline-primary after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-surface-container-lowest after:transition-transform peer-checked:after:translate-x-5"
          />
          <span aria-hidden="true">No recibir</span>
        </label>
      </div>
      {marca && (
        <div className="flex flex-col gap-space-xs rounded-lg bg-surface-container-lowest p-space-sm">
          <label htmlFor={id} className="text-label-md text-on-surface">
            No recibir hasta
          </label>
          <input
            id={id}
            type="date"
            aria-label={`No recibir hasta (${nombre})`}
            value={marca.hasta ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v)) alMarcar(v || null);
            }}
            className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface"
          />
          <p className="text-body-sm text-on-surface-variant">
            {marca.hasta
              ? 'Vuelve a recibir al día siguiente.'
              : 'Sin fecha: hasta que la desmarques.'}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Marcado {haceCuanto(marca.marcadoEn)}
          </p>
        </div>
      )}
    </li>
  );
}

/** «12,5» → 12.5; vacío → NaN, que `errorUmbral` rechaza. */
const leer = (texto: string) =>
  texto.trim() === '' ? Number.NaN : Number(texto.replace(',', '.'));
const escribir = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

/** Hoja del umbral de una categoría: mínimo y máximo en su unidad (RF-INV-007, V-03). */
function HojaUmbral({
  acopioId,
  categoria,
  umbral,
  alCerrar,
}: {
  acopioId: string;
  categoria: Categoria;
  umbral: Umbral | undefined;
  alCerrar: () => void;
}) {
  const [minimo, fijarMinimo] = useState(escribir(umbral?.minimo));
  const [maximo, fijarMaximo] = useState(escribir(umbral?.maximo));
  const fijar = useFijarUmbral(acopioId);
  const quitar = useQuitarUmbral(acopioId);
  const completos = minimo.trim() !== '' && maximo.trim() !== '';
  const error = completos ? errorUmbral(leer(minimo), leer(maximo), categoria.unidadBase) : null;
  const ocupado = fijar.isPending || quitar.isPending;
  const unidad = SIMBOLO_UNIDAD[categoria.unidadBase];

  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void) => (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-label-md font-bold text-on-surface">
        {etiqueta}
      </label>
      <span className="con-unidad flex items-baseline gap-space-xs rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-sm">
        <input
          id={id}
          inputMode={categoria.unidadBase === 'UNIDAD' ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={valor}
          onChange={(e) => cambiar(limpiarCantidad(e.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'umbral-error' : undefined}
          className="min-h-[56px] w-full min-w-0 bg-transparent text-headline-sm font-bold text-on-surface tabular-nums"
        />
        <span className="text-body-md text-on-surface-variant">{unidad}</span>
      </span>
    </div>
  );

  return (
    <Hoja titulo={`Umbral de ${categoria.nombre}`} alCerrar={alCerrar}>
      <form
        className="flex flex-col gap-space-md"
        onSubmit={(e) => {
          e.preventDefault();
          if (!completos || error) return;
          fijar.mutate(
            { categoriaId: categoria.id, minimo: leer(minimo), maximo: leer(maximo) },
            { onSuccess: alCerrar },
          );
        }}
      >
        <div className="grid grid-cols-2 gap-space-sm">
          {campo('umbral-minimo', 'Mínimo', minimo, fijarMinimo)}
          {campo('umbral-maximo', 'Máximo', maximo, fijarMaximo)}
        </div>
        {error && (
          <p
            id="umbral-error"
            role="alert"
            className="flex gap-space-xs rounded-xl bg-error-container p-space-sm text-on-error-container"
          >
            <Icono nombre="error" className="text-[20px]" />
            {error}
          </p>
        )}
        <p className="text-body-sm text-on-surface-variant">
          Bajo el mínimo, el inventario la marca en rojo; sobre el máximo, en morado.
        </p>
        <FormularioError mensaje={fijar.error?.message ?? quitar.error?.message} />
        <Boton
          type="submit"
          className="min-h-[56px] w-full"
          disabled={!completos || Boolean(error) || ocupado}
        >
          <Icono nombre="check" className="text-[22px]" />
          Guardar umbral
        </Boton>
        {umbral && (
          <Boton
            type="button"
            variante="secundario"
            className="min-h-[48px] w-full"
            disabled={ocupado}
            onClick={() => quitar.mutate(categoria.id, { onSuccess: alCerrar })}
          >
            <Icono nombre="remove" className="text-[22px]" />
            Quitar umbral
          </Boton>
        )}
      </form>
    </Hoja>
  );
}
