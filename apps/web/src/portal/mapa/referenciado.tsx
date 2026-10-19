import { Link } from 'react-router';
import type { AcopioPublico } from '../../api/red';
import { EnlaceBoton } from '../../componentes/Boton';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useLlevarALaVista } from './llevarALaVista';

type Fuente = NonNullable<AcopioPublico['fuente']>;
type Referenciado = AcopioPublico & { fuente: Fuente };

export const esReferenciado = (a: AcopioPublico): a is Referenciado => a.fuente !== null;

const mayuscula = (t: string) => t.charAt(0).toLocaleUpperCase('es-CO') + t.slice(1);

/** «Abierto», tal como lo escribe la fuente. */
export const estadoDeFuente = (f: Fuente) => mayuscula(f.estadoOriginal || 'sin estado');

/** «Abierto según RedAcopio · hace 3 h», para la lista. */
export const resumenFuente = (f: Fuente) =>
  `${estadoDeFuente(f)} según ${f.nombreCorto}${f.actualizadoEn ? ` · ${haceCuanto(f.actualizadoEn)}` : ''}`;

/** «Datos de RedAcopio actualizados hace 3 h»: la misma línea de antigüedad de un acopio. */
export const antiguedadFuente = (f: Fuente) =>
  f.actualizadoEn
    ? `Datos de ${f.nombreCorto} actualizados ${haceCuanto(f.actualizadoEn)}`
    : `Datos de ${f.nombreCorto}`;

/** El chip del estado con el texto de la fuente y «según RedAcopio» al lado. */
export function EstadoSegunFuente({ punto }: { punto: Referenciado }) {
  return (
    <span className="flex flex-wrap items-center gap-space-xs text-body-sm text-on-surface-variant">
      <EtiquetaEstado estado={punto.estado} texto={estadoDeFuente(punto.fuente)} />
      según {punto.fuente.nombreCorto}
    </span>
  );
}

/** Un punto de RedAcopio en la lista del mapa (P5). */
export function TarjetaReferenciado({ punto, enlace }: { punto: Referenciado; enlace: string }) {
  return (
    <Link
      to={enlace}
      className="flex items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary-container text-primary-container">
        <Icono nombre="link" className="text-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-lg font-semibold text-on-surface">{punto.nombre}</span>
        <span className="text-body-sm text-on-surface-variant">{resumenFuente(punto.fuente)}</span>
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono nombre="location_on" className="text-[18px]" />
          {punto.direccion}
        </span>
      </span>
      <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
    </Link>
  );
}

/** Tarjeta del punto de RedAcopio tocado en el mapa: solo lo que trae su fuente. */
export function ElegidoReferenciado({ punto, enlace }: { punto: Referenciado; enlace: string }) {
  const ref = useLlevarALaVista<HTMLElement>(punto.id);
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-label={`Punto elegido: ${punto.nombre}`}
      className="flex scroll-mt-24 flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md shadow-md outline-none"
    >
      <div>
        <p className="text-body-lg font-semibold text-on-surface">{punto.nombre}</p>
        <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono nombre="link" className="text-[16px]" />
          Punto de {punto.fuente.nombre}
        </p>
      </div>
      <EstadoSegunFuente punto={punto} />
      <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
        <Icono nombre="location_on" className="text-[18px]" />
        {punto.direccion}
      </p>
      <p className="text-body-sm text-on-surface-variant">{antiguedadFuente(punto.fuente)}</p>
      <EnlaceBoton a={enlace} className="w-full">
        Ver ficha
      </EnlaceBoton>
    </section>
  );
}
