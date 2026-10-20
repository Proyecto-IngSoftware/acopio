import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatearCantidad } from '@acopio/shared';
import {
  useAsociarCodigo,
  useBuscarCategorias,
  usePresentaciones,
  useValidarCodigo,
  type CodigoBarras,
  type Presentacion,
  type ResultadoBusqueda,
} from '../../api/catalogo';
import { useProponerCodigo } from '../../api/donaciones';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from '../catalogo/FormularioError';
import { abrirCamara } from './camara';
import { HojaNuevaPresentacion, type DatosNuevaPresentacion } from './HojaNuevaPresentacion';

/** La cámara a pantalla completa (RF-INV-002). Entrega el primer código que lee. Si el
 *  navegador niega el permiso o no hay cámara, avisa con `alFallar`. C13 la usa para el QR
 *  con otros textos. */
export function VistaCamara({
  alLeer,
  alCerrar,
  alFallar,
  indicacion = 'Apunta al código de barras del producto',
  textoSalir = 'Buscar por nombre',
}: {
  alLeer: (codigo: string) => void;
  alCerrar: () => void;
  alFallar: (error: unknown) => void;
  indicacion?: string;
  textoSalir?: string;
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
      <p className="relative mt-space-md text-center text-body-lg font-bold">{indicacion}</p>
      <button
        type="button"
        onClick={alCerrar}
        className="relative mt-auto min-h-[48px] rounded-xl border-[1.5px] border-inverse-on-surface font-bold"
      >
        {textoSalir}
      </button>
    </div>,
    document.body,
  );
}

/** Quien llama a la hoja: qué se hace al guardar el código. */
interface PropsHojaCodigo {
  ean: string;
  /** El código quedó guardado con esa categoría; `contenido` es el tamaño de la presentación. */
  alAsociar: (c: ResultadoBusqueda, contenido: number | null, ean: string) => void;
  alCerrar: () => void;
  /** Con esto aparece «Solo guardar el código»: asocia y vuelve a buscar sin pedir cantidad
   *  (el pase por la bodega, C4 con red). */
  soloGuardar?: () => void;
  /** El Operador puede corregir el número que leyó la cámara; el Donador solo escanea. */
  escribirNumero: boolean;
  /** El Donador propone el código en vez de asociarlo y no crea presentaciones aparte. */
  donador?: boolean;
  /** Un código propuesto que el Operador corrige: se valida con la presentación que elija. */
  corregir?: CodigoBarras;
}

const categoriaDeCodigo = (c: CodigoBarras): ResultadoBusqueda => ({
  id: c.categoriaId,
  nombre: c.categoria,
  grupo: c.grupo,
  unidadBase: c.unidad,
  perecedero: c.perecedero,
  puntaje: 1,
});

/** Código que Acopio no conoce: se asocia a una presentación de una categoría. Si la que
 *  hace falta no existe se crea ahí mismo (RF-CAT-004). El de un Operador queda validado; el
 *  de un Donador, propuesto. Diseño: docs/03-diseno/stitch/C04-escaner. */
export function HojaCodigoNuevo({
  ean: eanLeido,
  alAsociar,
  alCerrar,
  soloGuardar,
  escribirNumero,
  donador = false,
  corregir,
}: PropsHojaCodigo) {
  const [ean, fijarEan] = useState(eanLeido);
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(
    corregir ? categoriaDeCodigo(corregir) : null,
  );
  const [eleccion, fijarEleccion] = useState<string | null>(corregir?.presentacion?.id ?? null);
  const [creada, fijarCreada] = useState<Presentacion | null>(null);
  const [borrador, fijarBorrador] = useState<{
    datos: DatosNuevaPresentacion;
    tamano: number;
  } | null>(null);
  const [creando, fijarCreando] = useState(false);
  const resultados = useBuscarCategorias(categoria ? '' : q);
  const presentaciones = usePresentaciones(categoria?.id);
  const asociar = useAsociarCodigo();
  const validar = useValidarCodigo();
  const proponer = useProponerCodigo();

  const delServidor = presentaciones.data ?? [];
  // La que se acaba de crear entra a la lista aunque la consulta aún no la traiga
  const lista =
    creada && !delServidor.some((p) => p.id === creada.id) ? [...delServidor, creada] : delServidor;
  const elegida = lista.find((p) => p.id === eleccion) ?? null;
  const usaBorrador = eleccion === BORRADOR && borrador !== null;
  const hayEleccion = elegida !== null || usaBorrador;
  const pendiente = asociar.isPending || validar.isPending || proponer.isPending;
  const error = (asociar.error ?? validar.error ?? proponer.error)?.message;
  const eanValido = ean.trim().length > 0;

  const elegirCategoria = (c: ResultadoBusqueda | null) => {
    fijarCategoria(c);
    fijarEleccion(null);
    fijarCreada(null);
    fijarBorrador(null);
  };

  const guardar = (despues: PropsHojaCodigo['alAsociar']) => {
    if (!categoria || !hayEleccion) return;
    const tamano = usaBorrador ? borrador.tamano : elegida!.tamano;
    const alTerminar = (contenido: number | null) => () =>
      despues(categoria, contenido ?? tamano, ean.trim());
    const numero = ean.trim();
    if (corregir) {
      validar.mutate(
        { ean: corregir.ean, presentacionId: elegida!.id },
        { onSuccess: alTerminar(null) },
      );
    } else if (donador) {
      proponer.mutate(
        usaBorrador
          ? { ean: numero, presentacionNueva: borrador.datos }
          : { ean: numero, presentacionId: elegida!.id },
        // Si otro Donador ya lo había propuesto, vale lo que quedó guardado
        { onSuccess: (r) => alTerminar(r.contenido)() },
      );
    } else {
      asociar.mutate({ ean: numero, presentacionId: elegida!.id }, { onSuccess: alTerminar(null) });
    }
  };

  const opciones: { id: string; nombre: string }[] = [
    ...lista,
    ...(borrador ? [{ id: BORRADOR, nombre: borrador.datos.nombre }] : []),
  ];

  return (
    <>
      <Hoja titulo={corregir ? 'Corregir el código' : 'Código nuevo'} alCerrar={alCerrar}>
        <div className="flex min-h-[56px] items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md">
          <Icono nombre="barcode" className="shrink-0 text-[28px] text-primary-container" />
          {escribirNumero && !corregir ? (
            <input
              aria-label="Número del código"
              inputMode="numeric"
              autoComplete="off"
              value={ean}
              onChange={(e) => fijarEan(e.target.value.replace(/\D/g, ''))}
              className="min-h-[48px] w-full min-w-0 bg-transparent text-headline-sm font-bold tracking-wide text-on-surface tabular-nums"
            />
          ) : (
            <span className="min-w-0 text-headline-sm font-bold tracking-wide break-all text-on-surface tabular-nums">
              {ean}
            </span>
          )}
        </div>
        <p className="text-body-md text-on-surface-variant">
          {corregir
            ? 'Elige la categoría y la presentación correctas.'
            : 'Elige la categoría y la presentación. Acopio lo reconocerá la próxima vez.'}
        </p>
        {!categoria ? (
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
                onClick={() => elegirCategoria(c)}
                className="flex min-h-[48px] w-full items-center justify-between gap-space-sm rounded-xl bg-surface-container-low px-space-md text-left"
              >
                <span className="min-w-0 font-bold text-on-surface">{c.nombre}</span>
                <Icono nombre="chevron_right" className="shrink-0 text-[20px] text-outline" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-space-sm rounded-xl border-[1.5px] border-primary-container p-space-sm pl-space-md">
            <span className="min-w-0 flex-1 truncate font-bold text-on-surface">
              {categoria.nombre}
            </span>
            <button
              type="button"
              onClick={() => elegirCategoria(null)}
              className="min-h-[48px] shrink-0 px-space-sm text-label-md text-primary-container"
            >
              Cambiar
            </button>
          </div>
        )}

        {categoria && (
          <div className="flex flex-col gap-space-xs">
            <span id="codigo-presentacion" className="text-label-md font-bold text-on-surface">
              ¿Qué presentación es?
            </span>
            {presentaciones.isPending ? (
              <Esqueleto etiqueta="Cargando presentaciones" className="h-12" />
            ) : opciones.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">
                Esta categoría aún no tiene presentaciones. Crea la primera.
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby="codigo-presentacion"
                className="flex flex-col gap-space-xs"
              >
                {opciones.map((o) => (
                  <label
                    key={o.id}
                    className="flex min-h-[48px] cursor-pointer items-center gap-space-sm rounded-xl border border-outline-variant px-space-md has-checked:border-[1.5px] has-checked:border-primary-container has-focus-visible:outline-2 has-focus-visible:outline-primary"
                  >
                    <input
                      type="radio"
                      name="codigo-presentacion"
                      checked={eleccion === o.id}
                      onChange={() => fijarEleccion(o.id)}
                      className="size-5 shrink-0 accent-primary-container"
                    />
                    <span className="min-w-0 font-bold text-on-surface">{o.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <FormularioError mensaje={error} />
        <Boton
          variante="secundario"
          className="min-h-[56px] w-full"
          disabled={!categoria}
          onClick={() => fijarCreando(true)}
        >
          <Icono nombre="add" className="shrink-0 text-[22px]" />
          Nueva presentación
        </Boton>
        <Boton
          className="min-h-[56px] w-full"
          disabled={!categoria || !hayEleccion || !eanValido || pendiente}
          onClick={() => guardar(alAsociar)}
        >
          <Icono nombre={corregir ? 'check' : 'link'} className="shrink-0 text-[22px]" />
          {corregir ? 'Confirmar y seguir' : 'Asociar y seguir'}
        </Boton>
        {soloGuardar && !corregir && !donador && (
          <Boton
            variante="secundario"
            className="min-h-[48px] w-full"
            disabled={!categoria || !hayEleccion || !eanValido || pendiente}
            onClick={() => guardar(() => soloGuardar())}
          >
            <Icono nombre="save" className="shrink-0 text-[22px]" />
            Solo guardar el código
          </Boton>
        )}
        <Boton variante="terciario" className="min-h-[48px] w-full" onClick={alCerrar}>
          Ahora no
        </Boton>
      </Hoja>
      {creando && categoria && (
        <HojaNuevaPresentacion
          categoria={categoria}
          presentaciones={lista}
          soloBorrador={donador}
          alCerrar={() => fijarCreando(false)}
          alListo={(nueva) => {
            fijarCreando(false);
            if ('presentacion' in nueva) {
              if (!lista.some((p) => p.id === nueva.presentacion.id))
                fijarCreada(nueva.presentacion);
              fijarEleccion(nueva.presentacion.id);
            } else {
              fijarBorrador({ datos: nueva.borrador, tamano: nueva.tamano });
              fijarEleccion(BORRADOR);
            }
          }}
        />
      )}
    </>
  );
}

const BORRADOR = 'borrador';

/** Un código que un Donador propuso y nadie confirmó: el Operador lo confirma o lo corrige
 *  antes de pedir la cantidad (RF-CAT-004). */
export function HojaCodigoPropuesto({
  codigo,
  alConfirmar,
  alCorregir,
  alCerrar,
}: {
  codigo: CodigoBarras;
  alConfirmar: () => void;
  alCorregir: () => void;
  alCerrar: () => void;
}) {
  const validar = useValidarCodigo();
  const presentacion = codigo.presentacion;
  return (
    <Hoja titulo="Confirma el código" alCerrar={alCerrar}>
      <div className="flex min-h-[56px] items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md">
        <Icono nombre="barcode" className="shrink-0 text-[28px] text-primary-container" />
        <span className="min-w-0 text-headline-sm font-bold tracking-wide break-all text-on-surface tabular-nums">
          {codigo.ean}
        </span>
      </div>
      <p className="text-body-md text-on-surface-variant">
        {codigo.creadoPor ? `${codigo.creadoPor} lo propuso` : 'Lo propuso un donador'} y nadie lo
        ha confirmado. ¿Es esto?
      </p>
      <div className="flex flex-col gap-space-2xs rounded-xl border-[1.5px] border-primary-container p-space-md">
        <span className="font-bold text-on-surface">{codigo.categoria}</span>
        <span className="text-body-md text-on-surface-variant">
          {presentacion
            ? `${presentacion.nombre} · ${formatearCantidad(presentacion.tamano, codigo.unidad)}`
            : 'Sin presentación'}
        </span>
      </div>
      <FormularioError mensaje={validar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        disabled={!presentacion || validar.isPending}
        onClick={() =>
          validar.mutate(
            { ean: codigo.ean, presentacionId: presentacion!.id },
            {
              onSuccess: alConfirmar,
              // Otro Operador ya lo confirmó: se puede seguir
              onError: (e) => e.codigo === 'CODIGO_YA_VALIDADO' && alConfirmar(),
            },
          )
        }
      >
        <Icono nombre="check" className="shrink-0 text-[22px]" />
        Es correcto
      </Boton>
      <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alCorregir}>
        <Icono nombre="edit" className="shrink-0 text-[22px]" />
        Corregir
      </Boton>
    </Hoja>
  );
}
