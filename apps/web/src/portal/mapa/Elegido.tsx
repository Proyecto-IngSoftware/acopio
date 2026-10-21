import { useId, type ReactNode } from 'react';
import type { NecesidadAcopio } from '../../api/inventario';
import { useNoRecibir, type AcopioPublico } from '../../api/red';
import { EnlaceBoton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { aperturaPublica, km } from './TarjetaAcopio';
import { useLlevarALaVista } from './llevarALaVista';
import { estadoDeCategoria, muestraEtiqueta, type EstadoMapa } from './necesidad';

type Categoria = { id: string; nombre: string };

const TITULO: Record<EstadoMapa, (nombre: string) => string> = {
  falta: (n) => `Falta ${n}`,
  sobra: (n) => `${n} de sobra`,
  aldia: (n) => `${n} al día`,
  norecibe: (n) => `No recibe ${n}`,
};

const TONO = {
  falta: {
    titulo: 'text-on-secondary-fixed-variant',
    cat: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    icono: 'priority_high',
  },
  sobra: {
    titulo: 'text-tertiary-container',
    cat: 'bg-tertiary-fixed text-tertiary-container',
    icono: 'inventory_2',
  },
  aldia: { titulo: 'text-primary-container', cat: '', icono: 'check' },
  norecibe: { titulo: 'text-on-surface-variant', cat: '', icono: 'block' },
} as const;

/** Un bloque de la tarjeta con su título en el color del estado. */
function Bloque({
  estado,
  titulo,
  categorias = [],
  children,
}: {
  estado: EstadoMapa;
  titulo: string;
  categorias?: string[];
  children?: ReactNode;
}) {
  const id = useId();
  const tono = TONO[estado];
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-1.5 border-t border-outline-variant pt-space-sm"
    >
      <h3 id={id} className={`flex items-center gap-1.5 text-label-caps uppercase ${tono.titulo}`}>
        <Icono nombre={tono.icono} className="text-[16px]" />
        {titulo}
      </h3>
      {categorias.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {categorias.map((c) => (
            <li
              key={c}
              className={`rounded-lg px-2.5 py-1.5 text-body-sm font-semibold ${tono.cat}`}
            >
              {c}
            </li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}

const nombres = (lista: { categoriaId: string; categoria: string }[], sin?: string) =>
  lista.filter((x) => x.categoriaId !== sin).map((x) => x.categoria);

const MEJOR_OTRO = (
  <p className="text-body-sm text-on-surface-variant">Mejor llévalo a otro acopio.</p>
);

/** «Qué falta hoy» y «Ya tienen de sobra»; con una categoría elegida, el primer bloque se titula
 *  con el estado de esa categoría y nombra las demás faltas. */
function Necesidades({ n, categoria }: { n: NecesidadAcopio; categoria?: Categoria }) {
  const estado = categoria ? estadoDeCategoria(n, categoria.id) : null;
  const faltan = nombres(n.faltan, categoria?.id);
  const sobran = nombres(n.sobran, estado ? categoria?.id : undefined);
  const todasFaltan = nombres(n.faltan);
  return (
    <>
      {categoria && estado ? (
        <Bloque
          estado={estado}
          titulo={TITULO[estado](categoria.nombre.toLocaleLowerCase('es-CO'))}
        >
          {faltan.length > 0 && (
            <p className="text-body-sm text-on-surface-variant">
              También les falta: {faltan.join(', ')}
            </p>
          )}
          {estado === 'sobra' && MEJOR_OTRO}
        </Bloque>
      ) : (
        todasFaltan.length > 0 && (
          <Bloque estado="falta" titulo="Qué falta hoy" categorias={todasFaltan} />
        )
      )}
      {sobran.length > 0 && (
        <Bloque estado="sobra" titulo="Ya tienen de sobra" categorias={sobran}>
          {MEJOR_OTRO}
        </Bloque>
      )}
    </>
  );
}

/** Tarjeta del acopio tocado en el mapa: lo que falta, lo que sobra, lo que no reciben y el paso
 *  a la ficha. */
export function Elegido({
  acopio,
  enlace,
  necesidad,
  categoria,
}: {
  acopio: AcopioPublico;
  enlace: string;
  necesidad?: NecesidadAcopio;
  categoria?: Categoria;
}) {
  const { data: marcas } = useNoRecibir(acopio.id);
  const ref = useLlevarALaVista<HTMLElement>(acopio.id);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`Acopio elegido: ${acopio.nombre}`}
      className="flex scroll-mt-24 flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-md outline-none"
    >
      <div className="flex items-start justify-between gap-space-sm">
        <p className="text-body-sm text-on-surface">{aperturaPublica(acopio)}</p>
        {acopio.distanciaKm !== undefined && (
          <span className="text-label-md text-primary-container tabular-nums">
            {km(acopio.distanciaKm)}
          </span>
        )}
      </div>
      <div>
        <p className="text-body-lg font-semibold text-on-surface">{acopio.nombre}</p>
        <p className="text-body-md text-on-surface-variant">{acopio.entidad?.nombre}</p>
      </div>
      <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Icono nombre="location_on" className="text-[18px]" />
        {acopio.direccion} · {acopio.municipio}
      </p>
      {/* Un pausado no recibe nada: decir qué le falta confundiría */}
      {necesidad && muestraEtiqueta(acopio) && <Necesidades n={necesidad} categoria={categoria} />}
      {marcas && marcas.length > 0 && (
        <p className="flex items-start gap-space-xs rounded-lg border-l-4 border-secondary-container bg-error-container/40 p-space-sm text-body-sm text-on-surface">
          <Icono nombre="block" className="text-[18px] text-on-error-container" />
          No traigan: {marcas.map((m) => m.categoria.toLocaleLowerCase('es-CO')).join(', ')}
        </p>
      )}
      <EnlaceBoton a={enlace} className="w-full">
        Ver ficha
      </EnlaceBoton>
      <EnlaceBoton
        a={`/voluntariado?acopio=${encodeURIComponent(acopio.id)}`}
        variante="secundario"
        className="w-full"
      >
        Ver jornadas
      </EnlaceBoton>
    </section>
  );
}
