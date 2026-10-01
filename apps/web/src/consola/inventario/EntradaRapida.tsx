import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import { useBuscarCategorias, type ResultadoBusqueda } from '../../api/catalogo';
import { useRegistrarEntrada, useSaldos } from '../../api/inventario';
import { useAcopio, useNoRecibir } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { Encabezado } from '../Encabezado';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'Borrar'] as const;
const hoy = () => new Date().toISOString().slice(0, 10);

/** «12,5» → 12.5. Vacío o inválido → 0. */
const aNumero = (texto: string) => {
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Agrega una tecla a la cantidad: una sola coma y hasta 3 decimales. */
function teclear(actual: string, tecla: (typeof TECLAS)[number]): string {
  if (tecla === 'Borrar') return actual.slice(0, -1);
  if (tecla === ',') return actual.includes(',') ? actual : `${actual || '0'},`;
  const decimales = actual.split(',')[1];
  if (decimales !== undefined && decimales.length >= 3) return actual;
  return actual === '0' ? tecla : actual + tecla;
}

/** C4 Entrada rápida (RF-INV-001). Diseño: docs/03-diseno/stitch/C04-entrada-rapida. */
export function EntradaRapida() {
  const { id } = useParams();
  const acopioId = id!;
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [cantidad, fijarCantidad] = useState('');
  const [vence, fijarVence] = useState('');
  const [aviso, fijarAviso] = useState('');
  const busqueda = useRef<HTMLInputElement>(null);
  const { data: acopio } = useAcopio(acopioId);
  const resultados = useBuscarCategorias(categoria ? '' : q);
  const saldos = useSaldos(acopioId);
  const noRecibir = useNoRecibir(acopioId);
  const registrar = useRegistrarEntrada(acopioId);

  const n = aNumero(cantidad);
  const falta = categoria?.perecedero && !vence;
  const noSeRecibe = categoria && noRecibir.data?.some((x) => x.categoriaId === categoria.id);
  const saldoActual = saldos.data?.find((s) => s.categoriaId === categoria?.id)?.cantidad ?? 0;

  const elegir = (c: ResultadoBusqueda) => {
    fijarCategoria(c);
    fijarAviso('');
    registrar.reset();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!categoria || n <= 0 || falta) return;
    const elegida = categoria;
    registrar.mutate(
      {
        // Un doble toque o un reintento no duplica la entrada (E-04)
        id: crypto.randomUUID(),
        categoriaId: elegida.id,
        cantidad: n,
        ...(elegida.perecedero ? { venceEn: vence } : {}),
      },
      {
        onSuccess: (r) => {
          fijarAviso(`${elegida.nombre}: ${formatearCantidad(r.saldo, elegida.unidadBase)}`);
          fijarCategoria(null);
          fijarQ('');
          fijarCantidad('');
          fijarVence('');
          busqueda.current?.focus();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Entrada rápida"
        subtitulo={acopio?.nombre}
        volverA={`/consola/acopios/${acopioId}/inventario`}
      />

      <section
        aria-label="Recibir por folio"
        className="flex items-center gap-space-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-space-md text-on-surface-variant"
      >
        <Icono nombre="qr_code_scanner" className="text-[28px]" />
        <span className="flex flex-col">
          <span className="font-bold text-on-surface">Recibir por folio</span>
          <span className="text-body-sm">Llega con los comprobantes</span>
        </span>
      </section>

      <p
        role="status"
        className={
          aviso ? 'rounded-xl bg-exito-container p-space-sm font-bold text-exito' : 'sr-only'
        }
      >
        {aviso && (
          <>
            <Icono nombre="check_circle" className="mr-1 text-[20px]" />
            {aviso}
          </>
        )}
      </p>

      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        {!categoria ? (
          <div className="flex flex-col gap-space-xs">
            <label className="relative">
              <span className="sr-only">Categoría</span>
              <Icono
                nombre="search"
                className="pointer-events-none absolute top-1/2 left-space-md -translate-y-1/2 text-[22px] text-on-surface-variant"
              />
              <input
                ref={busqueda}
                id="entrada-busqueda"
                type="search"
                aria-label="Categoría"
                placeholder="Busca: arroz, pañal, agua…"
                value={q}
                onChange={(e) => fijarQ(e.target.value)}
                className="min-h-[56px] w-full rounded-xl border-[1.5px] border-outline bg-surface-container-lowest pr-space-md pl-12 text-body-lg text-on-surface"
              />
            </label>
            {(resultados.data ?? []).length > 0 && (
              <ul aria-label="Resultados" className="flex flex-col gap-space-xs">
                {resultados.data!.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => elegir(c)}
                      className="flex min-h-[48px] w-full items-center justify-between rounded-xl bg-surface-container-lowest px-space-md text-left shadow-sm"
                    >
                      <span className="font-bold text-on-surface">{c.nombre}</span>
                      <Icono nombre="chevron_right" className="text-[20px] text-outline" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <section
            aria-label="Categoría elegida"
            className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
          >
            <span className="flex flex-wrap items-center gap-space-xs">
              <span className="text-headline-sm font-bold text-on-surface">{categoria.nombre}</span>
              {categoria.perecedero && (
                <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-label-md text-primary-container">
                  Perecedero
                </span>
              )}
              <button
                type="button"
                onClick={() => fijarCategoria(null)}
                className="ml-auto min-h-[44px] rounded-lg px-space-sm text-label-md text-primary-container"
              >
                Cambiar
              </button>
            </span>
            <span className="text-body-md text-on-surface-variant">
              Saldo actual:{' '}
              <b className="text-on-surface">
                {formatearCantidad(saldoActual, categoria.unidadBase)}
              </b>
            </span>
          </section>
        )}

        {noSeRecibe && (
          <p
            role="alert"
            className="flex gap-space-xs rounded-xl bg-tertiary-fixed p-space-sm text-tertiary-container"
          >
            <Icono nombre="do_not_disturb_on" className="text-[20px]" />
            Este acopio marcó «no recibir» para {categoria.nombre}. Si ya llegó, regístralo igual.
          </p>
        )}

        <label className="flex flex-col items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
          <span className="text-label-caps text-on-surface-variant uppercase">Cantidad</span>
          <span className="flex items-baseline gap-space-xs">
            <input
              id="entrada-cantidad"
              aria-label="Cantidad"
              inputMode="decimal"
              autoComplete="off"
              value={cantidad}
              onChange={(e) => fijarCantidad(e.target.value.replace(/[^\d,]/g, ''))}
              placeholder="0"
              className="w-40 bg-transparent text-center text-display-hero-mobile font-bold text-on-surface tabular-nums"
            />
            {categoria && (
              <span className="text-headline-sm text-on-surface-variant">
                {SIMBOLO_UNIDAD[categoria.unidadBase]}
              </span>
            )}
          </span>
        </label>

        <div role="group" aria-label="Teclado numérico" className="grid grid-cols-3 gap-space-xs">
          {TECLAS.map((t) => (
            <button
              key={t}
              type="button"
              aria-label={t}
              onClick={() => fijarCantidad((c) => teclear(c, t))}
              className={`flex min-h-[56px] items-center justify-center rounded-xl border border-outline-variant text-headline-sm font-bold text-on-surface ${
                t === 'Borrar' ? 'bg-surface-container' : 'bg-surface-container-lowest'
              }`}
            >
              {t === 'Borrar' ? <Icono nombre="backspace" className="text-[24px]" /> : t}
            </button>
          ))}
        </div>

        {categoria?.perecedero && (
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="entrada-vence" className="text-label-md font-bold text-on-surface">
              Vence el
            </label>
            <input
              id="entrada-vence"
              type="date"
              min={hoy()}
              value={vence}
              onChange={(e) => fijarVence(e.target.value)}
              aria-describedby={vence ? undefined : 'entrada-vence-ayuda'}
              className="min-h-[48px] rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-sm text-body-md text-on-surface"
            />
            {!vence && (
              <span id="entrada-vence-ayuda" className="text-body-sm text-on-surface-variant">
                Indica la fecha de vencimiento
              </span>
            )}
          </div>
        )}

        {registrar.error && (
          <p className="rounded-xl bg-error-container p-space-sm text-on-error-container">
            {registrar.error.message}
          </p>
        )}

        <Boton
          type="submit"
          className="min-h-[56px] w-full text-body-lg"
          disabled={!categoria || n <= 0 || !!falta || registrar.isPending}
        >
          <Icono nombre="check" className="text-[22px]" />
          {categoria && n > 0
            ? `Registrar ${formatearCantidad(n, categoria.unidadBase)}`
            : 'Registrar'}
        </Boton>
      </form>
    </div>
  );
}
