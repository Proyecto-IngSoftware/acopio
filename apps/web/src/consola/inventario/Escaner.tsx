import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SIMBOLO_UNIDAD } from '@acopio/shared';
import { useAsociarCodigo, useBuscarCategorias, type ResultadoBusqueda } from '../../api/catalogo';
import { Boton } from '../../componentes/Boton';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from '../catalogo/FormularioError';
import { abrirCamara } from './camara';

/** La cámara a pantalla completa (RF-INV-002). Entrega el primer código que lee. Si el
 *  navegador niega el permiso o no hay cámara, avisa con `alFallar`. */
export function VistaCamara({
  alLeer,
  alCerrar,
  alFallar,
}: {
  alLeer: (codigo: string) => void;
  alCerrar: () => void;
  alFallar: (error: unknown) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  // Las funciones cambian en cada render del padre; la cámara se abre una sola vez
  const avisos = useRef({ alLeer, alFallar });
  avisos.current = { alLeer, alFallar };

  useEffect(() => {
    cerrar.current?.focus();
    let apagar: (() => void) | undefined;
    let leido = false;
    let vigente = true;
    abrirCamara(video.current!, (codigo) => {
      if (leido) return;
      leido = true;
      apagar?.();
      avisos.current.alLeer(codigo);
    }).then(
      (detener) => {
        if (vigente) apagar = detener;
        else detener();
      },
      (e: unknown) => vigente && avisos.current.alFallar(e),
    );
    return () => {
      vigente = false;
      apagar?.();
    };
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [alCerrar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Escáner"
      className="fixed inset-0 z-[60] flex flex-col bg-inverse-surface p-space-md pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] text-inverse-on-surface"
    >
      <video
        ref={video}
        muted
        playsInline
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <button
        ref={cerrar}
        type="button"
        aria-label="Cerrar"
        onClick={alCerrar}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-inverse-surface/60"
      >
        <Icono nombre="close" className="text-[24px]" />
      </button>
      <span
        aria-hidden="true"
        className="relative mx-auto mt-[25vh] h-32 w-64 max-w-full rounded-xl border-[3px] border-inverse-on-surface"
      />
      <p className="relative mt-space-md text-center text-body-lg font-bold">
        Apunta al código de barras del producto
      </p>
      <button
        type="button"
        onClick={alCerrar}
        className="relative mt-auto min-h-[48px] rounded-xl border-[1.5px] border-inverse-on-surface font-bold"
      >
        Buscar por nombre
      </button>
    </div>,
    document.body,
  );
}

/** «12,5» → 12.5; vacío o inválido → null. */
const leer = (texto: string) => {
  const n = Number(texto.replace(',', '.'));
  return texto.trim() === '' || !Number.isFinite(n) || n <= 0 ? null : n;
};

/** Código que Acopio no conoce: se asocia a una categoría, con lo que trae cada presentación
 *  si se sabe, y queda sin revisar para el Administrador (RF-CAT-004). */
export function HojaCodigoNuevo({
  ean,
  alAsociar,
  alCerrar,
}: {
  ean: string;
  alAsociar: (c: ResultadoBusqueda, contenido: number | null) => void;
  alCerrar: () => void;
}) {
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [contenido, fijarContenido] = useState('');
  const resultados = useBuscarCategorias(categoria ? '' : q);
  const asociar = useAsociarCodigo();
  const cantidad = leer(contenido);

  return (
    <Hoja titulo="Código nuevo" alCerrar={alCerrar}>
      <span className="text-headline-sm font-bold tracking-wide text-on-surface tabular-nums">
        {ean}
      </span>
      <p className="text-body-md text-on-surface-variant">
        Elige la categoría y Acopio lo reconocerá la próxima vez.
      </p>
      {!categoria ? (
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
              onClick={() => fijarCategoria(c)}
              className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-surface-container-low px-space-md text-left"
            >
              <span className="font-bold text-on-surface">{c.nombre}</span>
              <Icono nombre="chevron_right" className="text-[20px] text-outline" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-space-xs rounded-xl border border-outline-variant p-space-sm">
          <span className="font-bold text-on-surface">{categoria.nombre}</span>
          <span className="text-body-sm text-on-surface-variant">
            {SIMBOLO_UNIDAD[categoria.unidadBase]}
          </span>
          <button
            type="button"
            onClick={() => fijarCategoria(null)}
            className="ml-auto min-h-[44px] px-space-sm text-label-md text-primary-container"
          >
            Cambiar
          </button>
        </div>
      )}
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="codigo-contenido" className="text-label-md font-bold text-on-surface">
          Cada presentación trae (opcional)
        </label>
        <span className="flex items-baseline gap-space-xs rounded-xl border-[1.5px] border-outline px-space-sm">
          <input
            id="codigo-contenido"
            inputMode="decimal"
            autoComplete="off"
            value={contenido}
            onChange={(e) => fijarContenido(e.target.value.replace(/[^\d,]/g, ''))}
            className="min-h-[48px] w-full min-w-0 bg-transparent text-body-lg text-on-surface tabular-nums"
          />
          {categoria && (
            <span className="text-body-md text-on-surface-variant">
              {SIMBOLO_UNIDAD[categoria.unidadBase]}
            </span>
          )}
        </span>
        <span className="text-body-sm text-on-surface-variant">
          Si lo llenas, la entrada cuenta presentaciones. Un administrador lo revisará.
        </span>
      </div>
      <FormularioError mensaje={asociar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        disabled={!categoria || asociar.isPending}
        onClick={() =>
          categoria &&
          asociar.mutate(
            { ean, categoriaId: categoria.id, ...(cantidad ? { contenido: cantidad } : {}) },
            { onSuccess: () => alAsociar(categoria, cantidad) },
          )
        }
      >
        <Icono nombre="link" className="text-[22px]" />
        Asociar y seguir
      </Boton>
      <Boton variante="terciario" className="min-h-[48px] w-full" onClick={alCerrar}>
        Ahora no
      </Boton>
    </Hoja>
  );
}
