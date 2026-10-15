import { useState } from 'react';
import { formatearCantidad } from '@acopio/shared';
import { ErrorApi } from '../../api/cliente';
import {
  useDespachar,
  useEditarRemision,
  useFoliosVinculables,
  type Remision,
} from '../../api/remisiones';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { diaLargo } from '../../formato';

/** DespacharDto acepta hasta 20 folios. */
const MAXIMO_FOLIOS = 20;

interface Props {
  remision: Remision;
  alCerrar: () => void;
  alDespachar: (r: Remision) => void;
  alError: (e: ErrorApi) => void;
}

/** Despachar: el responsable si falta (I2-07) y los folios conciliados que van (I2-06). */
export function HojaDespachar({ remision, alCerrar, alDespachar, alError }: Props) {
  const folios = useFoliosVinculables(remision.codigo, true);
  const editar = useEditarRemision(remision.codigo);
  const despachar = useDespachar(remision.codigo);
  const faltaResponsable = !remision.responsable?.trim();
  const [responsable, fijarResponsable] = useState('');
  const [elegidos, fijarElegidos] = useState<Set<string>>(new Set());
  const [sinResponsable, fijarSinResponsable] = useState(false);
  const [fallo, fijarFallo] = useState<string | null>(null);
  const ocupado = editar.isPending || despachar.isPending;

  async function enviar() {
    fijarFallo(null);
    if (faltaResponsable && !responsable.trim()) {
      fijarSinResponsable(true);
      return;
    }
    try {
      if (faltaResponsable) await editar.mutateAsync({ responsable: responsable.trim() });
      alDespachar(await despachar.mutateAsync([...elegidos]));
    } catch (e) {
      if (
        e instanceof ErrorApi &&
        (e.codigo === 'REMISION_ESTADO_INVALIDO' || e.codigo === 'REMISION_CAMBIO')
      ) {
        alError(e);
      } else fijarFallo(e instanceof Error ? e.message : 'No se pudo despachar');
    }
  }

  function alternar(folio: string) {
    fijarElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(folio)) nuevo.delete(folio);
      else nuevo.add(folio);
      return nuevo;
    });
  }

  const destino = remision.zona?.nombre ?? 'Despacho general';
  return (
    <Hoja titulo={`Despachar ${remision.codigo}`} alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface">
        <b>
          {remision.acopio.nombre} → {destino}
        </b>{' '}
      </p>
      <ul className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface tabular-nums">
        {remision.lineas.map((l) => (
          <li key={l.categoriaId}>
            {l.categoria} · {formatearCantidad(l.cantidadPlaneada, l.unidad)}
          </li>
        ))}
      </ul>
      {faltaResponsable && (
        <div className="flex flex-col gap-space-xs">
          <Campo
            id="despachar-responsable"
            etiqueta="Quién lleva el envío"
            maxLength={120}
            value={responsable}
            onChange={(e) => {
              fijarResponsable(e.target.value);
              fijarSinResponsable(false);
            }}
          />
          {sinResponsable && (
            <p role="alert" className="text-body-sm text-error">
              Escribe quién lleva el envío
            </p>
          )}
        </div>
      )}
      <fieldset className="flex flex-col gap-space-xs">
        <legend className="mb-space-xs text-label-md text-on-surface">
          Folios que van en este envío
        </legend>
        {folios.isPending && <Esqueleto etiqueta="Cargando folios" className="h-12" />}
        {folios.error && (
          <p className="text-body-sm text-on-surface-variant">
            No se pudieron cargar los folios. Puedes despachar sin vincular.
          </p>
        )}
        {folios.data?.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">
            No hay folios conciliados en este acopio. Puedes despachar sin vincular.
          </p>
        )}
        {folios.data?.map((f) => {
          const marcado = elegidos.has(f.folio);
          const lleno = !marcado && elegidos.size >= MAXIMO_FOLIOS;
          return (
            <label key={f.folio} className="flex min-h-[48px] items-center gap-space-sm">
              <input
                type="checkbox"
                checked={marcado}
                disabled={lleno}
                onChange={() => alternar(f.folio)}
                className="h-5 w-5 accent-primary-container"
              />
              <span className="text-body-md text-on-surface">
                <b className="font-mono">{f.folio}</b>
                {f.categorias.length > 0 && ` · ${f.categorias.join(', ')}`}
                {f.conciliadoEn && ` · conciliado el ${diaLargo(f.conciliadoEn)}`}
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className="rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface">
        Al despachar, estas cantidades salen del inventario del acopio.
      </p>
      {fallo && (
        <p role="alert" className="text-body-sm text-error">
          {fallo}
        </p>
      )}
      <Boton disabled={ocupado} onClick={() => void enviar()}>
        Despachar
      </Boton>
    </Hoja>
  );
}
