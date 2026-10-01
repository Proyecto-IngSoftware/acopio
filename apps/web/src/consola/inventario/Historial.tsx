import { useParams } from 'react-router';
import { formatearCantidad } from '@acopio/shared';
import { useHistorial, useSaldos, type FilaHistorial, type Saldo } from '../../api/inventario';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { EtiquetaSemaforo } from '../../componentes/EtiquetaSemaforo';
import { Icono } from '../../componentes/Icono';
import { diaLargo } from '../../formato';
import { Encabezado } from '../Encabezado';

const TIPO = { ENTRADA: 'Entrada', SALIDA: 'Salida', AJUSTE: 'Ajuste' } as const;
function iconoDe(tipo: FilaHistorial['tipo']) {
  if (tipo === 'ENTRADA') return 'input';
  if (tipo === 'SALIDA') return 'output';
  return 'edit_note';
}
const MOTIVO_SALIDA = {
  ENTREGA_FAMILIAS: 'Entrega directa a familias',
  TRASLADO: 'Traslado a otra organización',
  VENCIDO: 'Vencido o dañado',
  OTRO: 'Otro',
} as const;

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

function Movimiento({ m, unidad }: { m: FilaHistorial; unidad: Saldo['unidad'] }) {
  const signo = m.signo < 0 ? '−' : '+';
  // Más de un minuto entre que pasó y que llegó: se muestran las dos horas (RF-INV-006)
  const diferido =
    m.origenOffline ||
    new Date(m.registradoEn).getTime() - new Date(m.ocurridoEn).getTime() > 60_000;
  return (
    <li className="flex gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary-container">
        <Icono nombre={iconoDe(m.tipo)} className="text-[20px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-bold text-on-surface tabular-nums">
          {TIPO[m.tipo]} {signo}
          {formatearCantidad(m.cantidad, unidad)}
        </span>
        {m.motivoSalida && (
          <span className="text-body-sm text-on-surface-variant">
            {MOTIVO_SALIDA[m.motivoSalida]}
          </span>
        )}
        {m.nota && <span className="text-body-sm text-on-surface-variant">{m.nota}</span>}
        {m.motivo && <span className="text-body-sm text-on-surface italic">«{m.motivo}»</span>}
        {m.venceEn && (
          <span className="text-body-sm text-on-surface-variant">
            Vence el {diaLargo(m.venceEn)}
          </span>
        )}
        <span className="text-body-sm text-on-surface-variant">
          {m.usuario} ·{' '}
          {diferido
            ? `Ocurrió ${cuando(m.ocurridoEn)} · llegó ${cuando(m.registradoEn)}`
            : cuando(m.ocurridoEn)}
        </span>
        {m.origenOffline && (
          <span className="inline-flex w-fit items-center gap-1 rounded bg-tertiary-fixed px-2 py-0.5 text-label-md text-tertiary-container">
            <Icono nombre="cloud_off" className="text-[16px]" />
            Registrada sin conexión
          </span>
        )}
      </span>
      <span className="shrink-0 text-body-sm text-on-surface-variant tabular-nums">
        Saldo {formatearCantidad(m.saldoDespues, unidad)}
      </span>
    </li>
  );
}

/** Historial de una categoría (RF-INV-006): responde «¿por qué hay 120 kg?». */
export function Historial() {
  const { id, categoriaId } = useParams();
  const acopioId = id!;
  const saldos = useSaldos(acopioId);
  const historial = useHistorial(acopioId, categoriaId!);
  const saldo = saldos.data?.find((s) => s.categoriaId === categoriaId);
  const filas = historial.data?.pages.flatMap((p) => p.filas) ?? [];
  const unidad = saldo?.unidad ?? 'UNIDAD';
  const primero = saldo?.vencimientos[0];

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo={saldo?.categoria ?? 'Historial'}
        volverA={`/consola/acopios/${acopioId}/inventario`}
      />

      {saldo && (
        <section
          aria-label="Saldo"
          className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
        >
          <span className="text-headline-md font-bold text-on-surface tabular-nums">
            {formatearCantidad(saldo.cantidad, unidad)}
          </span>
          <EtiquetaSemaforo estado={saldo.semaforo} />
          {saldo.umbral && (
            <span className="text-body-sm text-on-surface-variant">
              Mínimo {formatearCantidad(saldo.umbral.minimo, unidad)} · Máximo{' '}
              {formatearCantidad(saldo.umbral.maximo, unidad)}
            </span>
          )}
          {primero?.venceEn && (
            <span className="text-body-sm text-on-surface-variant">
              Vence primero: {formatearCantidad(primero.cantidad, unidad)} el{' '}
              {diaLargo(primero.venceEn)} (estimado)
            </span>
          )}
        </section>
      )}

      <h2 className="text-headline-sm text-on-surface">Movimientos</h2>
      {historial.isPending && <Esqueleto etiqueta="Cargando los movimientos" className="h-40" />}
      {historial.error && (
        <EstadoError
          mensaje={historial.error.message}
          alReintentar={() => void historial.refetch()}
        />
      )}
      {historial.data && filas.length === 0 && (
        <EstadoVacio titulo="Sin movimientos">
          Esta categoría todavía no tiene entradas, salidas ni ajustes en este acopio.
        </EstadoVacio>
      )}
      {filas.length > 0 && (
        <ul aria-label="Movimientos" className="flex flex-col gap-space-xs">
          {filas.map((m) => (
            <Movimiento key={m.id} m={m} unidad={unidad} />
          ))}
        </ul>
      )}
      {historial.hasNextPage && (
        <Boton
          variante="secundario"
          className="w-full"
          disabled={historial.isFetchingNextPage}
          onClick={() => void historial.fetchNextPage()}
        >
          Cargar más
        </Boton>
      )}
    </div>
  );
}
