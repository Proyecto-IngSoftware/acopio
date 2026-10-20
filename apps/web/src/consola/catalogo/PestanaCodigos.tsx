import { useEffect, useState } from 'react';
import { formatearCantidad } from '@acopio/shared';
import {
  useBuscarCategorias,
  useCodigos,
  useEditarCodigo,
  usePresentaciones,
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
import { HojaCodigoNuevo } from '../inventario/Escaner';
import { FormularioError } from './FormularioError';

type Filtro = 'propuestos' | 'todos';

/** Un código espera al Administrador si es propuesto o una recepción lo marcó por revisar. */
const espera = (c: CodigoBarras) => c.estado === 'PROPUESTO' || c.porRevisar;
const SIN_PRESENTACION = 'sin-presentacion';
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

interface Grupo {
  /** Id de la presentación, o `SIN_PRESENTACION` en los códigos viejos. */
  id: string;
  nombre: string;
  tamano: number | null;
  categoria: string;
  unidad: CodigoBarras['unidad'];
  codigos: CodigoBarras[];
}

/** Agrupa por categoría y, dentro, por presentación. El orden de la API se conserva. */
function agrupar(codigos: CodigoBarras[]): { categoria: string; presentaciones: Grupo[] }[] {
  const categorias = new Map<string, Map<string, Grupo>>();
  for (const c of codigos) {
    const porPresentacion = categorias.get(c.categoria) ?? new Map<string, Grupo>();
    categorias.set(c.categoria, porPresentacion);
    const id = c.presentacion?.id ?? SIN_PRESENTACION;
    const grupo = porPresentacion.get(id) ?? {
      id,
      nombre: c.presentacion?.nombre ?? 'Sin presentación',
      tamano: c.presentacion?.tamano ?? null,
      categoria: c.categoria,
      unidad: c.unidad,
      codigos: [],
    };
    grupo.codigos.push(c);
    porPresentacion.set(id, grupo);
  }
  return [...categorias].map(([categoria, p]) => ({ categoria, presentaciones: [...p.values()] }));
}

/** El número en grupos de cuatro, como lo imprimen los envases: 7702 0010 2345 5. */
const agruparNumero = (ean: string) => ean.replace(/(\d{4})(?=\d)/g, '$1 ');

/** Espera 300 ms sin cambios antes de devolver el texto, para no pedir con cada tecla. */
function useEspera(texto: string, ms = 300) {
  const [valor, fijarValor] = useState(texto);
  useEffect(() => {
    const t = setTimeout(() => fijarValor(texto), ms);
    return () => clearTimeout(t);
  }, [texto, ms]);
  return valor;
}

interface Props {
  agregando: boolean;
  alAgregar: (abierta: boolean) => void;
}

/** C18, pestaña «Códigos»: el Administrador revisa los códigos que propusieron los Donadores o
 *  que una recepción marcó, agrupados por presentación (RF-CAT-004). Los códigos no se borran:
 *  se aprueban o se pasan a otra presentación. Diseño: docs/03-diseno/stitch/C18-codigos-barras. */
export function PestanaCodigos({ agregando, alAgregar }: Props) {
  const [filtro, fijarFiltro] = useState<Filtro>('propuestos');
  const [busqueda, fijarBusqueda] = useState('');
  const [abierta, fijarAbierta] = useState<string | null>(null);
  const [cambiando, fijarCambiando] = useState<CodigoBarras | null>(null);
  const q = useEspera(busqueda.trim());
  const codigos = useCodigos(q);
  const editar = useEditarCodigo();
  const todos = codigos.data ?? [];
  const propuestos = todos.filter(espera);
  const visibles = filtro === 'propuestos' ? propuestos : todos;
  const grupos = agrupar(visibles);
  // El detalle muestra todos los códigos de la presentación, estén o no en el filtro
  const detalle = abierta
    ? (agrupar(todos)
        .flatMap((g) => g.presentaciones)
        .find((p) => key(p) === abierta) ?? null)
    : null;

  const hojas = (
    <>
      {cambiando && <HojaCambiar codigo={cambiando} alCerrar={() => fijarCambiando(null)} />}
      {agregando && (
        <HojaCodigoNuevo
          ean=""
          escribirNumero
          alCerrar={() => alAgregar(false)}
          alAsociar={() => alAgregar(false)}
        />
      )}
    </>
  );

  if (abierta && detalle) {
    return (
      <div className="flex flex-col gap-space-md pt-space-md">
        <button
          type="button"
          onClick={() => fijarAbierta(null)}
          className="-ml-space-xs flex min-h-[48px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
        >
          <Icono nombre="arrow_back" className="shrink-0 text-[20px]" />
          Códigos
        </button>
        <div className="flex flex-col">
          <h2 className="text-headline-md text-on-surface">{detalle.nombre}</h2>
          <p className="text-body-sm text-on-surface-variant">
            {detalle.categoria}
            {detalle.tamano !== null &&
              ` · ${formatearCantidad(detalle.tamano, detalle.unidad)} por presentación`}
          </p>
        </div>
        <FormularioError mensaje={editar.error?.message} />
        {detalle.codigos.map((c) => (
          <TarjetaCodigo
            key={c.ean}
            codigo={c}
            aprobando={editar.isPending}
            alAprobar={() =>
              editar.mutate({ ean: c.ean, cambios: { estado: 'VALIDADO', porRevisar: false } })
            }
            alCambiar={() => fijarCambiando(c)}
          />
        ))}
        <p className="flex items-start gap-space-xs rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
          <Icono nombre="info" className="shrink-0 text-[20px]" />
          <span className="min-w-0">
            Los códigos no se borran. Si uno está en la presentación equivocada, se cambia de
            presentación.
          </span>
        </p>
        {hojas}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md pt-space-md">
      <label className="flex min-h-[48px] items-center gap-space-xs rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md">
        <Icono nombre="search" className="shrink-0 text-[20px] text-on-surface-variant" />
        <input
          type="search"
          aria-label="Buscar códigos"
          placeholder="Número o nombre"
          value={busqueda}
          onChange={(e) => fijarBusqueda(e.target.value)}
          className="min-h-[44px] w-full min-w-0 bg-transparent text-body-md text-on-surface outline-none"
        />
      </label>
      <Segmentado
        etiqueta="Qué códigos ver"
        valor={filtro}
        alCambiar={fijarFiltro}
        opciones={[
          { valor: 'propuestos', texto: `Propuestos (${propuestos.length})` },
          { valor: 'todos', texto: 'Todos' },
        ]}
      />
      {codigos.isPending && <Esqueleto etiqueta="Cargando códigos" />}
      {codigos.error && (
        <EstadoError mensaje={codigos.error.message} alReintentar={() => void codigos.refetch()} />
      )}
      {codigos.data && visibles.length === 0 && (
        <EstadoVacio
          titulo={
            q
              ? 'Ningún código coincide.'
              : filtro === 'propuestos'
                ? 'No hay códigos propuestos.'
                : 'No hay códigos.'
          }
        >
          Aparecen aquí cuando un Donador propone un código o una recepción marca uno por revisar.
        </EstadoVacio>
      )}
      {grupos.map((g) => (
        <section key={g.categoria} className="flex flex-col gap-space-xs">
          <h2 className="text-label-md font-bold text-on-surface-variant">{g.categoria}</h2>
          {g.presentaciones.map((p) => {
            const esperan = p.codigos.filter(espera).length;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => fijarAbierta(key(p))}
                className="flex min-h-[56px] w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md py-space-xs text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-space-xs">
                  <span className="text-body-lg font-bold text-on-surface">{p.nombre}</span>
                  <span className="flex flex-wrap items-center gap-space-xs">
                    {(filtro === 'todos' || esperan === 0) && (
                      <span className="rounded-full bg-surface-container px-space-sm py-0.5 text-label-md text-on-surface-variant">
                        {plural(p.codigos.length, 'código', 'códigos')}
                      </span>
                    )}
                    {esperan > 0 && (
                      <span className="rounded-full bg-primary-fixed px-space-sm py-0.5 text-label-md text-primary-container">
                        {plural(esperan, 'propuesto', 'propuestos')}
                      </span>
                    )}
                  </span>
                </span>
                <Icono nombre="chevron_right" className="shrink-0 text-[20px] text-outline" />
              </button>
            );
          })}
        </section>
      ))}
      <div className="flex flex-col gap-space-xs">
        <Boton className="min-h-[56px] w-full" onClick={() => alAgregar(true)}>
          <Icono nombre="add" className="shrink-0 text-[22px]" />
          Agregar código
        </Boton>
        <p className="text-center text-body-sm text-on-surface-variant">
          Escaneando o escribiendo el número
        </p>
      </div>
      {hojas}
    </div>
  );
}

/** Los códigos de una presentación viven bajo su categoría: el mismo id no se repite entre
 *  categorías, salvo `SIN_PRESENTACION`, que se distingue por la categoría. */
const key = (g: Grupo) => (g.id === SIN_PRESENTACION ? `${SIN_PRESENTACION}:${g.categoria}` : g.id);

function TarjetaCodigo({
  codigo: c,
  aprobando,
  alAprobar,
  alCambiar,
}: {
  codigo: CodigoBarras;
  aprobando: boolean;
  alAprobar: () => void;
  alCambiar: () => void;
}) {
  const pendiente = espera(c);
  const estado =
    c.estado === 'PROPUESTO'
      ? {
          texto: 'Propuesto',
          icono: 'lightbulb',
          clases: 'bg-primary-fixed text-primary-container',
        }
      : c.porRevisar
        ? {
            texto: 'Por revisar',
            icono: 'flag',
            clases: 'bg-surface-container text-on-surface-variant',
          }
        : {
            texto: 'Validado',
            icono: 'check_circle',
            clases: 'bg-surface-container text-on-surface-variant',
          };
  return (
    <article
      aria-label={c.ean}
      className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-space-xs">
        <span className="flex min-w-0 items-center gap-space-xs">
          <Icono nombre="barcode" className="shrink-0 text-[22px] text-on-surface-variant" />
          <b className="min-w-0 text-body-lg text-on-surface tabular-nums">
            {agruparNumero(c.ean)}
          </b>
        </span>
        <span
          className={`flex shrink-0 items-center gap-space-xs rounded-full px-space-sm py-0.5 text-label-md ${estado.clases}`}
        >
          <Icono nombre={estado.icono} className="shrink-0 text-[16px]" />
          {estado.texto}
        </span>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Asociado por {c.creadoPor ?? 'alguien que ya no está'} · {haceCuanto(c.creadoEn)}
      </p>
      <div className={`grid gap-space-sm ${pendiente ? 'grid-cols-2' : ''}`}>
        {pendiente && (
          <Boton className="min-h-[48px]" disabled={aprobando} onClick={alAprobar}>
            <Icono nombre="check" className="shrink-0 text-[20px]" />
            Aprobar
          </Boton>
        )}
        <Boton variante="secundario" className="min-h-[48px]" onClick={alCambiar}>
          Cambiar de presentación
        </Boton>
      </div>
    </article>
  );
}

/** Pasa un código a otra presentación, de cualquier categoría: la categoría del código la sigue. */
function HojaCambiar({ codigo, alCerrar }: { codigo: CodigoBarras; alCerrar: () => void }) {
  const [buscando, fijarBuscando] = useState(false);
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<Pick<ResultadoBusqueda, 'id' | 'nombre'>>({
    id: codigo.categoriaId,
    nombre: codigo.categoria,
  });
  const [eleccion, fijarEleccion] = useState<string | null>(null);
  const resultados = useBuscarCategorias(buscando ? q : '');
  const presentaciones = usePresentaciones(buscando ? undefined : categoria.id);
  const editar = useEditarCodigo();

  return (
    <Hoja titulo="Cambiar de presentación" alCerrar={alCerrar}>
      <p className="flex items-center gap-space-xs text-body-md text-on-surface-variant">
        <Icono nombre="barcode" className="shrink-0 text-[22px]" />
        <span className="min-w-0 tabular-nums">{agruparNumero(codigo.ean)}</span>
      </p>
      {!buscando ? (
        <div className="flex items-center gap-space-sm rounded-xl border border-outline-variant p-space-sm pl-space-md">
          <span className="min-w-0 flex-1 truncate font-bold text-on-surface">
            {categoria.nombre}
          </span>
          <button
            type="button"
            onClick={() => fijarBuscando(true)}
            className="min-h-[48px] shrink-0 px-space-sm text-label-md text-primary-container"
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
            className="min-h-[56px] w-full min-w-0 rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-md text-body-lg text-on-surface"
          />
          {(resultados.data ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                fijarCategoria(c);
                fijarEleccion(null);
                fijarBuscando(false);
              }}
              className="flex min-h-[48px] w-full items-center justify-between gap-space-sm rounded-xl bg-surface-container-low px-space-md text-left"
            >
              <span className="min-w-0 font-bold text-on-surface">{c.nombre}</span>
              <Icono nombre="chevron_right" className="shrink-0 text-[20px] text-outline" />
            </button>
          ))}
        </div>
      )}
      {!buscando && (
        <div className="flex flex-col gap-space-xs">
          <span id="cambiar-presentacion" className="text-label-md font-bold text-on-surface">
            ¿A qué presentación pasa?
          </span>
          {presentaciones.isPending ? (
            <Esqueleto etiqueta="Cargando presentaciones" className="h-12" />
          ) : (
            <div
              role="radiogroup"
              aria-labelledby="cambiar-presentacion"
              className="flex flex-col gap-space-xs"
            >
              {(presentaciones.data ?? []).map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-[48px] cursor-pointer items-center gap-space-sm rounded-xl border border-outline-variant px-space-md has-checked:border-[1.5px] has-checked:border-primary-container has-focus-visible:outline-2 has-focus-visible:outline-primary"
                >
                  <input
                    type="radio"
                    name="cambiar-presentacion"
                    checked={eleccion === p.id}
                    onChange={() => fijarEleccion(p.id)}
                    className="size-5 shrink-0 accent-primary-container"
                  />
                  <span className="min-w-0 flex-1 font-bold text-on-surface">{p.nombre}</span>
                  <span className="shrink-0 text-body-sm text-on-surface-variant">
                    {formatearCantidad(p.tamano, p.unidad)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <FormularioError mensaje={editar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        disabled={editar.isPending || buscando || eleccion === null}
        onClick={() =>
          editar.mutate(
            { ean: codigo.ean, cambios: { presentacionId: eleccion! } },
            { onSuccess: alCerrar },
          )
        }
      >
        <Icono nombre="check" className="shrink-0 text-[22px]" />
        Guardar
      </Boton>
    </Hoja>
  );
}
