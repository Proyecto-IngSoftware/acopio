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
import { HojaCodigoNuevo, VistaCamara } from './Escaner';

/** Lo que el escáner leyó: C4 cuenta presentaciones si trae contenido. */
export interface Leido {
  ean: string;
  contenido: number | null;
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

type Escaneo = { paso: 'nada' } | { paso: 'camara' } | { paso: 'nuevo'; ean: string };

/** Búsqueda de categoría de C4, C5 y C6, por nombre o con la cámara (RF-INV-002). */
export function BuscadorCategoria({
  id,
  q,
  onQ,
  onElegir,
  ref,
}: {
  id: string;
  q: string;
  onQ: (q: string) => void;
  onElegir: (c: ResultadoBusqueda, leido?: Leido) => void;
  ref?: Ref<HTMLInputElement>;
}) {
  const resultados = useBuscarCategorias(q);
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
    try {
      const c = await consultarCodigo(ean);
      onElegir(categoriaDe(c), { ean, contenido: c.contenido });
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 404) fijarEscaneo({ paso: 'nuevo', ean });
      else fijarAviso(e instanceof ErrorApi && e.estado === 0 ? SIN_RED : (e as Error).message);
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
          className="flex gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-on-surface"
        >
          <Icono nombre="info" className="text-[20px]" />
          {aviso}
        </p>
      )}
      <div className="flex gap-space-xs">
        <label className="relative min-w-0 flex-1">
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
            placeholder="Busca: arroz, pañal, agua…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            className="min-h-[56px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest pr-space-md pl-12 text-body-lg text-on-surface"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            fijarAviso('');
            fijarEscaneo({ paso: 'camara' });
          }}
          className="flex min-h-[56px] shrink-0 items-center gap-space-xs rounded-xl bg-primary-container px-space-md font-bold text-on-primary"
        >
          <Icono nombre="barcode_scanner" className="text-[22px]" />
          Escanear
        </button>
      </div>
      {(resultados.data ?? []).length > 0 && (
        <ul aria-label="Resultados" className="flex flex-col gap-space-xs">
          {resultados.data!.map((c) => (
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
          alAsociar={(c, contenido) => {
            fijarEscaneo({ paso: 'nada' });
            onElegir(c, { ean: escaneo.ean, contenido });
          }}
        />
      )}
    </div>
  );
}
