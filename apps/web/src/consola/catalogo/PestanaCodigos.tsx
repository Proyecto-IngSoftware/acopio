import { useState } from 'react';
import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import {
  useBuscarCategorias,
  useCodigos,
  useEditarCodigo,
  type CodigoBarras,
  type ResultadoBusqueda,
} from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { haceCuanto } from '../../formato';
import { FormularioError } from './FormularioError';

type Filtro = 'sin-revisar' | 'todos';

/** C18, pestaña «Códigos de barras»: el Administrador revisa los códigos que asociaron los
 *  Operadores (RF-CAT-004). Diseño: docs/03-diseno/stitch/C18-codigos-barras. */
export function PestanaCodigos() {
  const [filtro, fijarFiltro] = useState<Filtro>('sin-revisar');
  const [cambiando, fijarCambiando] = useState<CodigoBarras | null>(null);
  const codigos = useCodigos();
  const editar = useEditarCodigo();
  const todos = codigos.data ?? [];
  const sinRevisar = todos.filter((c) => !c.revisado);
  const lista = filtro === 'sin-revisar' ? sinRevisar : todos;

  return (
    <div className="flex flex-col gap-space-md pt-space-md">
      <Segmentado
        etiqueta="Qué códigos ver"
        valor={filtro}
        alCambiar={fijarFiltro}
        opciones={[
          { valor: 'sin-revisar', texto: `Sin revisar (${sinRevisar.length})` },
          { valor: 'todos', texto: 'Todos' },
        ]}
      />
      {codigos.isPending && <Esqueleto etiqueta="Cargando códigos" />}
      {codigos.error && (
        <EstadoError mensaje={codigos.error.message} alReintentar={() => void codigos.refetch()} />
      )}
      <FormularioError mensaje={editar.error?.message} />
      {codigos.data && lista.length === 0 && (
        <EstadoVacio
          titulo={filtro === 'sin-revisar' ? 'No hay códigos por revisar.' : 'No hay códigos.'}
        >
          Aparecen aquí cuando un Operador escanea un código nuevo y lo asocia a una categoría.
        </EstadoVacio>
      )}
      {lista.map((c) => (
        <article
          key={c.ean}
          aria-label={c.ean}
          className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
        >
          <span className="flex items-center gap-space-xs">
            <Icono nombre="barcode" className="text-[22px] text-on-surface-variant" />
            <b className="text-body-lg text-on-surface tabular-nums">{c.ean}</b>
            <span className="ml-auto rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
              {c.revisado ? 'Revisado' : 'Sin revisar'}
            </span>
          </span>
          <span className="text-body-lg font-bold text-on-surface">
            {c.categoria} · {SIMBOLO_UNIDAD[c.unidad]}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            {c.contenido !== null
              ? `Cada presentación trae ${formatearCantidad(c.contenido, c.unidad)}`
              : 'Sin contenido'}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            Asociado por {c.creadoPor ?? 'alguien que ya no está'} · {haceCuanto(c.creadoEn)}
          </span>
          <span className={`grid gap-space-xs ${c.revisado ? '' : 'grid-cols-2'}`}>
            <Boton variante="secundario" className="min-h-[48px]" onClick={() => fijarCambiando(c)}>
              Cambiar
            </Boton>
            {!c.revisado && (
              <Boton
                className="min-h-[48px]"
                disabled={editar.isPending}
                onClick={() => editar.mutate({ ean: c.ean, cambios: { revisado: true } })}
              >
                <Icono nombre="check" className="text-[20px]" />
                Marcar revisado
              </Boton>
            )}
          </span>
        </article>
      ))}
      {cambiando && <HojaCambiar codigo={cambiando} alCerrar={() => fijarCambiando(null)} />}
    </div>
  );
}

const escribir = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
/** «0,5» → 0.5; vacío → null, que quita el contenido. */
const leer = (texto: string) => {
  const n = Number(texto.replace(',', '.'));
  return texto.trim() === '' || !Number.isFinite(n) ? null : n;
};

/** Cambiar la categoría o el contenido de un código. Guardar no lo marca revisado. */
function HojaCambiar({ codigo, alCerrar }: { codigo: CodigoBarras; alCerrar: () => void }) {
  const [buscando, fijarBuscando] = useState(false);
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [contenido, fijarContenido] = useState(escribir(codigo.contenido));
  const resultados = useBuscarCategorias(buscando ? q : '');
  const editar = useEditarCodigo();
  const unidad = categoria?.unidadBase ?? codigo.unidad;
  const nuevoContenido = leer(contenido);

  return (
    <Hoja titulo={`Código ${codigo.ean}`} alCerrar={alCerrar}>
      {!buscando ? (
        <div className="flex items-center gap-space-xs rounded-xl border border-outline-variant p-space-sm">
          <span className="font-bold text-on-surface">{categoria?.nombre ?? codigo.categoria}</span>
          <span className="text-body-sm text-on-surface-variant">{SIMBOLO_UNIDAD[unidad]}</span>
          <button
            type="button"
            onClick={() => fijarBuscando(true)}
            className="ml-auto min-h-[44px] px-space-sm text-label-md text-primary-container"
          >
            Otra categoría
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-space-xs">
          <input
            type="search"
            aria-label="Categoría"
            placeholder="Busca: arroz, pañal, agua…"
            value={q}
            onChange={(e) => fijarQ(e.target.value)}
            className="min-h-[56px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-md text-body-lg text-on-surface"
          />
          {(resultados.data ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                fijarCategoria(c);
                fijarBuscando(false);
              }}
              className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-surface-container-low px-space-md text-left"
            >
              <span className="font-bold text-on-surface">{c.nombre}</span>
              <Icono nombre="chevron_right" className="text-[20px] text-outline" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-space-xs">
        <label
          htmlFor="codigo-cambiar-contenido"
          className="text-label-md font-bold text-on-surface"
        >
          Cada presentación trae (opcional)
        </label>
        <span className="flex items-baseline gap-space-xs rounded-xl border-[1.5px] border-outline px-space-sm">
          <input
            id="codigo-cambiar-contenido"
            inputMode="decimal"
            autoComplete="off"
            value={contenido}
            onChange={(e) => fijarContenido(e.target.value.replace(/[^\d,]/g, ''))}
            className="min-h-[48px] w-full min-w-0 bg-transparent text-body-lg text-on-surface tabular-nums"
          />
          <span className="text-body-md text-on-surface-variant">{SIMBOLO_UNIDAD[unidad]}</span>
        </span>
      </div>
      <FormularioError mensaje={editar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        disabled={editar.isPending || buscando}
        onClick={() =>
          editar.mutate(
            {
              ean: codigo.ean,
              cambios: {
                ...(categoria ? { categoriaId: categoria.id } : {}),
                ...(nuevoContenido !== codigo.contenido ? { contenido: nuevoContenido } : {}),
              },
            },
            { onSuccess: alCerrar },
          )
        }
      >
        <Icono nombre="check" className="text-[22px]" />
        Guardar
      </Boton>
    </Hoja>
  );
}
