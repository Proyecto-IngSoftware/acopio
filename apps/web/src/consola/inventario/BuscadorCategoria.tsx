import { useRef, useState } from 'react';
import type { Ref } from 'react';
import {
  consultarCodigo,
  useBuscarCategorias,
  type CodigoBarras,
  type ResultadoBusqueda,
} from '../../api/catalogo';
import { ErrorApi } from '../../api/cliente';
import { Icono } from '../../componentes/Icono';
import { buscarEnCopia, useCategoriasLocales } from '../../sin-conexion/busqueda-local';
import { buscarCodigoVisto } from '../../sin-conexion/datos-locales';
import { HojaCodigoNuevo, HojaCodigoPropuesto, VistaCamara } from './Escaner';

/** Lo que el escáner leyó: C4 cuenta presentaciones si trae contenido. */
export interface Leido {
  ean: string;
  contenido: number | null;
  /** Un Donador propuso el código y ningún Operador lo ha confirmado. */
  sinConfirmar?: boolean;
}

const SIN_PERMISO = 'Sin permiso para usar la cámara. Busca la categoría por nombre.';
const SIN_RED = 'Sin conexión, Acopio no aprende códigos nuevos. Busca por nombre.';

const categoriaDe = (c: CodigoBarras): ResultadoBusqueda => ({
  id: c.categoriaId,
  nombre: c.categoria,
  grupo: c.grupo,
  unidadBase: c.unidad,
  perecedero: c.perecedero,
  puntaje: 1,
});

/** Otra fuente de códigos para quien no es de la consola (el Donador): devuelve la categoría y
 *  lo que trae cada presentación, o null si no se conoce. Con ella, un código desconocido se
 *  propone en vez de asociarse. */
export type ResolverCodigo = (ean: string) => Promise<{
  categoria: ResultadoBusqueda;
  contenido: number | null;
  sinConfirmar?: boolean;
} | null>;

type Escaneo =
  | { paso: 'nada' }
  | { paso: 'camara' }
  | { paso: 'nuevo'; ean: string }
  | { paso: 'propuesto'; codigo: CodigoBarras }
  | { paso: 'corregir'; codigo: CodigoBarras };

/** Búsqueda de categoría de C4, C5 y C6, por nombre o con la cámara (RF-INV-002). */
export function BuscadorCategoria({
  id,
  q,
  onQ,
  onElegir,
  sinRed = false,
  resolverCodigo,
  soloGuardar = false,
  confirmarPropuestos = false,
  ref,
}: {
  id: string;
  q: string;
  onQ: (q: string) => void;
  onElegir: (c: ResultadoBusqueda, leido?: Leido) => void;
  /** C4 sin red busca en la copia del teléfono (O-06). */
  sinRed?: boolean;
  /** Con esto el escáner usa esta consulta (el Donador): un código desconocido se propone
   *  escaneándolo, sin escribir el número, y queda sin confirmar. */
  resolverCodigo?: ResolverCodigo;
  /** Un código nuevo ofrece «Solo guardar el código» (con red): lo asocia y vuelve a buscar. */
  soloGuardar?: boolean;
  /** Un código propuesto se confirma o se corrige antes de elegir la categoría. */
  confirmarPropuestos?: boolean;
  ref?: Ref<HTMLInputElement>;
}) {
  const remotos = useBuscarCategorias(sinRed ? '' : q);
  const locales = useCategoriasLocales(sinRed);
  const encontrados = sinRed ? buscarEnCopia(locales.data ?? [], q) : (remotos.data ?? []);
  const [escaneo, fijarEscaneo] = useState<Escaneo>({ paso: 'nada' });
  const [aviso, fijarAviso] = useState('');
  const propio = useRef<HTMLInputElement>(null);

  const volverABuscar = () => {
    fijarEscaneo({ paso: 'nada' });
    // El foco vuelve al campo para escribir el nombre
    setTimeout(() => propio.current?.focus(), 0);
  };

  const leer = async (ean: string) => {
    fijarEscaneo({ paso: 'nada' });
    if (resolverCodigo) {
      try {
        const r = await resolverCodigo(ean);
        if (r) onElegir(r.categoria, { ean, contenido: r.contenido, sinConfirmar: r.sinConfirmar });
        else fijarEscaneo({ paso: 'nuevo', ean });
      } catch (e) {
        fijarAviso((e as Error).message);
      }
      return;
    }
    try {
      const c = await consultarCodigo(ean);
      if (confirmarPropuestos && c.estado === 'PROPUESTO') {
        return fijarEscaneo({ paso: 'propuesto', codigo: c });
      }
      onElegir(categoriaDe(c), { ean, contenido: c.contenido });
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) return fijarEscaneo({ paso: 'nuevo', ean });
      if (!(e instanceof ErrorApi && e.estado === 0)) return fijarAviso((e as Error).message);
      // Sin red reconoce los códigos que ya vio este teléfono y no aprende nuevos (O-08)
      const visto = await buscarCodigoVisto(ean);
      if (visto) onElegir(categoriaDe(visto), { ean, contenido: visto.contenido });
      else fijarAviso(SIN_RED);
    }
  };

  const fallar = (e: unknown) => {
    fijarEscaneo({ paso: 'nada' });
    fijarAviso(
      e instanceof DOMException && e.name === 'NotAllowedError'
        ? SIN_PERMISO
        : 'No pudimos abrir la cámara. Busca la categoría por nombre.',
    );
  };

  return (
    <div className="flex flex-col gap-space-xs">
      {aviso && (
        <p
          role="status"
          className="flex items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-on-surface"
        >
          <Icono nombre="info" className="shrink-0 text-[20px]" />
          {aviso}
        </p>
      )}
      <div className="flex flex-wrap gap-space-sm">
        <label className="relative min-w-0 flex-[4_1_12rem]">
          <span className="sr-only">Categoría</span>
          <Icono
            nombre="search"
            className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[22px] text-on-surface-variant"
          />
          <input
            ref={(el) => {
              propio.current = el;
              if (typeof ref === 'function') ref(el);
              else if (ref) ref.current = el;
            }}
            id={id}
            type="search"
            aria-label="Categoría"
            placeholder="Busca: arroz…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            className="min-h-[56px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest pr-space-xs pl-11 text-body-lg text-on-surface"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            fijarAviso('');
            fijarEscaneo({ paso: 'camara' });
          }}
          className="flex min-h-[56px] flex-[1_0_auto] items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-sm font-bold text-on-primary"
        >
          <Icono nombre="barcode_scanner" className="shrink-0 text-[22px]" />
          Escanear
        </button>
      </div>
      {sinRed && (
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="smartphone" className="shrink-0 text-[18px]" />
          Busca en la copia guardada en el teléfono
        </p>
      )}
      {encontrados.length > 0 && (
        <ul aria-label="Resultados" className="flex flex-col gap-space-xs">
          {encontrados.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegir(c)}
                className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-surface-container-lowest px-space-md text-left shadow-sm"
              >
                <span className="font-bold text-on-surface">{c.nombre}</span>
                <Icono nombre="chevron_right" className="text-[20px] text-outline" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {escaneo.paso === 'camara' && (
        <VistaCamara alLeer={(ean) => void leer(ean)} alCerrar={volverABuscar} alFallar={fallar} />
      )}
      {escaneo.paso === 'nuevo' && (
        <HojaCodigoNuevo
          ean={escaneo.ean}
          alCerrar={volverABuscar}
          donador={Boolean(resolverCodigo)}
          escribirNumero={!resolverCodigo}
          soloGuardar={
            soloGuardar && !sinRed && !resolverCodigo
              ? () => {
                  fijarEscaneo({ paso: 'nada' });
                  fijarAviso('Código guardado. Busca la categoría o escanea otro.');
                }
              : undefined
          }
          alAsociar={(c, contenido, ean) => {
            fijarEscaneo({ paso: 'nada' });
            onElegir(c, { ean, contenido, ...(resolverCodigo ? { sinConfirmar: true } : {}) });
          }}
        />
      )}
      {escaneo.paso === 'propuesto' && (
        <HojaCodigoPropuesto
          codigo={escaneo.codigo}
          alCerrar={volverABuscar}
          alCorregir={() => fijarEscaneo({ paso: 'corregir', codigo: escaneo.codigo })}
          alConfirmar={() => {
            fijarEscaneo({ paso: 'nada' });
            onElegir(categoriaDe(escaneo.codigo), {
              ean: escaneo.codigo.ean,
              contenido: escaneo.codigo.contenido,
            });
          }}
        />
      )}
      {escaneo.paso === 'corregir' && (
        <HojaCodigoNuevo
          ean={escaneo.codigo.ean}
          corregir={escaneo.codigo}
          escribirNumero={false}
          alCerrar={volverABuscar}
          alAsociar={(c, contenido) => {
            fijarEscaneo({ paso: 'nada' });
            onElegir(c, { ean: escaneo.codigo.ean, contenido });
          }}
        />
      )}
    </div>
  );
}
