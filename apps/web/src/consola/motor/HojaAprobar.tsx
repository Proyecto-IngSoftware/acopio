import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ErrorApi } from '../../api/cliente';
import { useAprobar, type Aprobacion, type Sugerencia } from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';

/** Otra persona la decidió o el motor recalculó: la hoja se cierra y la lista se recarga. */
export const YA_NO_SE_PUEDE = ['SUGERENCIA_DECIDIDA', 'SUGERENCIA_NO_ENCONTRADA'];

const maximoDe = (e: ErrorApi | null) =>
  e?.codigo === 'SUGERENCIA_DESACTUALIZADA'
    ? ((e.detalles as { maximo?: number } | undefined)?.maximo ?? null)
    : null;

/** Aprobar con la cantidad editable (RF-MOT-007). La remisión se conoce al aprobar (I1-01). */
export function HojaAprobar({
  sugerencia: s,
  alAprobar,
  alDecidida,
  alCerrar,
}: {
  sugerencia: Sugerencia;
  alAprobar: (r: Aprobacion) => void;
  alDecidida: (codigo: string) => void;
  alCerrar: () => void;
}) {
  const aprobar = useAprobar();
  const unidad = s.categoria.unidad;
  const enteros = unidad === 'UNIDAD';
  const [texto, fijarTexto] = useState(String(s.cantidad).replace('.', ','));
  const cantidad = Number(texto.replace(',', '.'));
  const valida = cantidad > 0 && (!enteros || Number.isInteger(cantidad));
  const maximo = maximoDe(aprobar.error);

  function mover(delta: number) {
    const base = Number.isFinite(cantidad) ? cantidad : 0;
    const nuevo = Math.round(Math.max(0, base + delta) * 1000) / 1000;
    fijarTexto(String(nuevo).replace('.', ','));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valida) return;
    aprobar.mutate(
      { id: s.id, cantidad },
      {
        onSuccess: alAprobar,
        onError: (err) => {
          if (YA_NO_SE_PUEDE.includes(err.codigo)) alDecidida(err.codigo);
        },
      },
    );
  }

  return (
    <Hoja titulo="Aprobar traslado" alCerrar={alCerrar}>
      <p className="text-body-md font-semibold text-on-surface">
        {s.acopio.nombre} → {s.zona.nombre}
      </p>
      <form className="flex flex-col gap-space-md" onSubmit={enviar} noValidate>
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="aprobar-cantidad" className="text-label-md text-on-surface">
            Cantidad ({SIMBOLO_UNIDAD[unidad]})
          </label>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-outline-variant">
            <button
              type="button"
              aria-label="Quitar uno"
              className="grid min-w-[48px] place-items-center text-on-surface"
              onClick={() => mover(-1)}
            >
              <Icono nombre="remove" className="text-[22px]" />
            </button>
            <input
              id="aprobar-cantidad"
              inputMode={enteros ? 'numeric' : 'decimal'}
              value={texto}
              onChange={(e) => fijarTexto(e.target.value)}
              className="min-h-[48px] w-full border-x border-outline-variant bg-surface-container-lowest text-center text-headline-sm text-on-surface tabular-nums"
            />
            <button
              type="button"
              aria-label="Agregar uno"
              className="grid min-w-[48px] place-items-center text-on-surface"
              onClick={() => mover(1)}
            >
              <Icono nombre="add" className="text-[22px]" />
            </button>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Sugeridos {formatearCantidad(s.cantidad, unidad)}
          </p>
        </div>
        <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
          <Icono nombre="description" className="text-[20px] text-on-surface-variant" />
          Se suma a la remisión en borrador de este acopio a esta zona, o se crea una. El Operador
          la revisa y la despacha.
        </p>
        {aprobar.error && !YA_NO_SE_PUEDE.includes(aprobar.error.codigo) && (
          <div role="alert" className="flex flex-col gap-space-xs text-body-sm text-error">
            <p>{aprobar.error.message}</p>
            {maximo !== null && (
              <Boton
                variante="secundario"
                onClick={() => {
                  fijarTexto(String(maximo).replace('.', ','));
                  aprobar.reset();
                }}
              >
                Usar {String(maximo).replace('.', ',')}
              </Boton>
            )}
          </div>
        )}
        <Boton type="submit" disabled={!valida || aprobar.isPending}>
          Aprobar {valida ? formatearCantidad(cantidad, unidad) : ''}
        </Boton>
      </form>
    </Hoja>
  );
}
