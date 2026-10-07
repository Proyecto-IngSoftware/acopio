import { formatearCantidad, type UnidadBase } from '@acopio/shared';
import { useState } from 'react';
import { useEntradasVinculables, useVincular } from '../../api/comprobantes';
import { useAcopiosGestion, useUbicacionesMias } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { fechaHora } from '../../formato';
import { useSesion } from '../../sesion/Sesion';

interface Props {
  folio: string;
  /** El acopio del comprobante: va primero en el selector. */
  acopio: { id: string; nombre: string };
  alCerrar: () => void;
}

/** Vincula entradas sin donación a un folio, por ejemplo uno entregado sin red (RF-CMP-004). */
export function HojaVincular({ folio, acopio, alCerrar }: Props) {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'ADMIN';
  const mias = useUbicacionesMias(usuario !== null && !esAdmin);
  const todos = useAcopiosGestion(esAdmin);
  const opciones = [
    acopio,
    ...(esAdmin ? (todos.data ?? []) : (mias.data ?? []).filter((u) => u.tipo === 'ACOPIO'))
      .filter((a) => a.id !== acopio.id)
      .map((a) => ({ id: a.id, nombre: a.nombre })),
  ];
  const [acopioId, setAcopioId] = useState(acopio.id);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const entradas = useEntradasVinculables(folio, acopioId, true);
  const vincular = useVincular(folio);
  const otro = opciones.find((o) => o.id === acopioId && o.id !== acopio.id);

  const alternar = (id: string) =>
    setElegidas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  const n = elegidas.size;

  return (
    <Hoja titulo="Vincular entradas" alCerrar={alCerrar}>
      <Selector
        id="vincular-acopio"
        etiqueta="Acopio"
        value={acopioId}
        onChange={(e) => {
          setAcopioId(e.target.value);
          setElegidas(new Set());
        }}
      >
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </Selector>
      {otro && (
        <p className="flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
          <Icono nombre="info" className="text-[22px] text-on-surface-variant" />
          Este folio pasa a {otro.nombre}.
        </p>
      )}

      {entradas.isPending ? (
        <Esqueleto etiqueta="Cargando las entradas" />
      ) : entradas.error ? (
        <p role="alert" className="text-body-md text-error">
          {entradas.error.message}
        </p>
      ) : entradas.data.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">
          No hay entradas sin donación en los últimos 14 días.
        </p>
      ) : (
        <fieldset className="flex flex-col">
          <legend className="sr-only">Entradas sin donación</legend>
          {entradas.data.map((e) => (
            <label key={e.id} className="flex min-h-[56px] items-center gap-space-sm py-space-xs">
              <input
                type="checkbox"
                checked={elegidas.has(e.id)}
                onChange={() => alternar(e.id)}
                aria-describedby={`vinculable-${e.id}`}
                aria-label={`${e.categoria} · ${formatearCantidad(e.cantidad, e.unidad as UnidadBase)}`}
                className="h-5 w-5 accent-primary-container"
              />
              <span className="flex flex-col">
                <span className="text-body-md text-on-surface">
                  {e.categoria} · {formatearCantidad(e.cantidad, e.unidad as UnidadBase)}
                </span>
                <span id={`vinculable-${e.id}`} className="text-body-sm text-on-surface-variant">
                  {fechaHora(e.ocurridoEn)} · {e.registradoPor}
                  {e.origenOffline && ' · sin conexión'}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {vincular.error && (
        <p role="alert" className="text-body-sm text-error">
          {vincular.error.message}
        </p>
      )}
      <Boton
        className="min-h-[56px]"
        disabled={n === 0 || vincular.isPending}
        onClick={() => vincular.mutate({ movimientoIds: [...elegidas] }, { onSuccess: alCerrar })}
      >
        {n === 1 ? 'Vincular 1 entrada' : `Vincular ${n} entradas`}
      </Boton>
    </Hoja>
  );
}
