import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatearCantidad } from '@acopio/shared';
import { Boton } from '../componentes/Boton';
import { Hoja } from '../componentes/Hoja';
import { Icono } from '../componentes/Icono';
import { useSesion } from '../sesion/Sesion';
import { useCategoriasLocales } from '../sin-conexion/busqueda-local';
import { corregirFecha, descartar, type EnCola } from '../sin-conexion/cola';
import { useEnLinea } from '../sin-conexion/en-linea';
import { pedirEnvio } from '../sin-conexion/Sincronizador';
import { useCola } from '../sin-conexion/useCola';
import { Encabezado } from './Encabezado';

/** «Hoy, 10:42» o «26 sep, 9:10». */
function cuando(iso: string, ahora = new Date()) {
  const fecha = new Date(iso);
  const hora = fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  if (fecha.toDateString() === ahora.toDateString()) return `Hoy, ${hora}`;
  return `${fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${hora}`;
}

/** Valor de un input datetime-local en la hora del teléfono. */
const paraCampo = (iso: string) => {
  const f = new Date(iso);
  return new Date(f.getTime() - f.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/**
 * Entradas guardadas en el teléfono: las que esperan, en orden, y las que la API rechazó,
 * con su motivo, «Corregir» y «Descartar» (§6 del Bloque 2). Se llega desde la pastilla
 * de la cabecera. Diseño: docs/03-diseno/stitch/C04-pendientes.
 */
export function SinSincronizar() {
  const { usuario } = useSesion();
  const enLinea = useEnLinea();
  const consultas = useQueryClient();
  const { data: cola, isPending } = useCola(usuario?.id);
  const { data: categorias = [] } = useCategoriasLocales(true);
  const [corrigiendo, fijarCorrigiendo] = useState<EnCola | null>(null);

  const porId = new Map(categorias.map((c) => [c.id, c]));
  const etiqueta = (e: EnCola) => {
    const c = porId.get(e.cuerpo.categoriaId);
    const cantidad = c
      ? formatearCantidad(e.cuerpo.cantidad, c.unidadBase)
      : String(e.cuerpo.cantidad);
    return `${c?.nombre ?? 'Categoría'} · ${cantidad}`;
  };
  const refrescar = () => void consultas.invalidateQueries({ queryKey: ['cola'] });
  const pendientes = (cola ?? []).filter((e) => e.estado === 'pendiente');
  const rechazadas = (cola ?? []).filter((e) => e.estado === 'rechazada');

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Sin sincronizar" />

      {pendientes.length > 0 && (
        <div className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm">
          <p className="flex gap-space-sm text-body-md text-on-surface">
            <Icono
              nombre={enLinea ? 'cloud_upload' : 'wifi_off'}
              className="text-[22px] text-on-surface-variant"
            />
            {enLinea
              ? 'Se envían solas. Si tarda, envíalas ahora.'
              : 'Sin conexión. Se envían solas al volver la señal.'}
          </p>
          <Boton variante="secundario" disabled={!enLinea} onClick={() => pedirEnvio()}>
            <Icono nombre="sync" className="text-[20px]" />
            Enviar ahora
          </Boton>
        </div>
      )}

      {!isPending && cola?.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface-variant">
          No hay entradas sin enviar.
        </p>
      )}

      {pendientes.length > 0 && (
        <section className="flex flex-col gap-space-xs">
          <h2 id="por-enviar" className="text-label-md font-bold text-on-surface">
            Por enviar ({pendientes.length})
          </h2>
          <ul
            aria-labelledby="por-enviar"
            className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
          >
            {pendientes.map((e) => (
              <li
                key={e.id}
                className="flex min-h-[64px] items-center gap-space-sm border-t border-outline-variant px-space-md first:border-t-0"
              >
                <Icono nombre="schedule" className="text-[22px] text-on-surface-variant" />
                <span className="flex flex-col tabular-nums">
                  <b className="text-body-lg text-on-surface">{etiqueta(e)}</b>
                  <span className="text-body-sm text-on-surface-variant">
                    {cuando(e.cuerpo.ocurridoEn)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rechazadas.length > 0 && (
        <section className="flex flex-col gap-space-xs">
          <h2 className="text-label-md font-bold text-on-surface">
            Rechazadas ({rechazadas.length})
          </h2>
          {rechazadas.map((e) => (
            <article
              key={e.id}
              aria-label={etiqueta(e)}
              className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <div className="flex items-start gap-space-sm">
                <Icono nombre="error" className="text-[22px] text-error" />
                <span className="flex flex-col tabular-nums">
                  <b className="text-body-lg text-on-surface">{etiqueta(e)}</b>
                  <span className="text-body-sm text-on-surface-variant">
                    Registrada el {cuando(e.cuerpo.ocurridoEn)}
                  </span>
                </span>
              </div>
              <p className="rounded-xl bg-error-container p-space-sm text-body-md text-on-error-container">
                {e.motivo}
              </p>
              <div className="grid grid-cols-2 gap-space-sm">
                {/* Solo la fecha se corrige; otro rechazo (la asignación, la categoría) se descarta */}
                {e.codigo === 'FECHA_FUERA_DE_RANGO' && (
                  <Boton variante="secundario" onClick={() => fijarCorrigiendo(e)}>
                    Corregir
                  </Boton>
                )}
                <button
                  type="button"
                  onClick={() => void descartar(e.id).then(refrescar)}
                  className="col-start-2 min-h-[48px] rounded-lg font-bold text-error"
                >
                  Descartar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {corrigiendo && (
        <HojaCorregir
          entrada={corrigiendo}
          descripcion={etiqueta(corrigiendo)}
          alCerrar={() => fijarCorrigiendo(null)}
          alGuardar={async (fecha) => {
            await corregirFecha(corrigiendo.id, fecha);
            fijarCorrigiendo(null);
            refrescar();
            pedirEnvio();
          }}
        />
      )}
    </div>
  );
}

function HojaCorregir({
  entrada,
  descripcion,
  alCerrar,
  alGuardar,
}: {
  entrada: EnCola;
  descripcion: string;
  alCerrar: () => void;
  alGuardar: (fecha: Date) => Promise<void>;
}) {
  const [valor, fijarValor] = useState(paraCampo(entrada.cuerpo.ocurridoEn));
  const fecha = new Date(valor);
  return (
    <Hoja titulo="Corregir la fecha" alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface-variant">
        {descripcion}. La API acepta entradas de hasta 7 días atrás.
      </p>
      <label htmlFor="corregir-fecha" className="text-label-md font-bold text-on-surface">
        Cuándo llegó
      </label>
      <input
        id="corregir-fecha"
        type="datetime-local"
        value={valor}
        onChange={(e) => fijarValor(e.target.value)}
        className="min-h-[52px] rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-sm text-body-lg text-on-surface tabular-nums"
      />
      <Boton
        className="w-full"
        disabled={Number.isNaN(fecha.getTime())}
        onClick={() => void alGuardar(fecha)}
      >
        Guardar y volver a enviar
      </Boton>
      <Boton variante="secundario" className="w-full" onClick={alCerrar}>
        Cancelar
      </Boton>
    </Hoja>
  );
}
