import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { formatearCantidad } from '@acopio/shared';
import { useSaldos, type Saldo } from '../../api/inventario';
import { useAcopio } from '../../api/red';
import { EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import {
  EtiquetaSemaforo,
  ORDEN_URGENCIA,
  SEMAFORO,
  type EstadoSemaforo,
} from '../../componentes/EtiquetaSemaforo';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { diaLargo, haceCuanto } from '../../formato';
import { useSesion } from '../../sesion/Sesion';
import { Encabezado } from '../Encabezado';

type Orden = 'urgencia' | 'nombre' | 'antiguedad';

const porNombre = (a: Saldo, b: Saldo) => a.categoria.localeCompare(b.categoria, 'es-CO');
const momento = (s: Saldo) => (s.ultimoMovimiento ? new Date(s.ultimoMovimiento).getTime() : 0);

const ORDENES: Record<Orden, (a: Saldo, b: Saldo) => number> = {
  urgencia: (a, b) =>
    ORDEN_URGENCIA.indexOf(a.semaforo) - ORDEN_URGENCIA.indexOf(b.semaforo) || porNombre(a, b),
  nombre: porNombre,
  // Lo que lleva más tiempo quieto primero; sin movimientos, antes que todo
  antiguedad: (a, b) => momento(a) - momento(b) || porNombre(a, b),
};

const RESUMEN: { estado: EstadoSemaforo; texto: (n: number) => string }[] = [
  { estado: 'BAJO', texto: (n) => `${n} bajo el mínimo` },
  { estado: 'CERCA', texto: (n) => `${n} cerca del mínimo` },
  { estado: 'SOBRE', texto: (n) => `${n} sobre el máximo` },
];

function Fila({ s, acopioId }: { s: Saldo; acopioId: string }) {
  const primero = s.vencimientos[0];
  return (
    <li>
      <Link
        to={`/consola/acopios/${acopioId}/inventario/${s.categoriaId}`}
        className="flex items-center gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm active:bg-surface-container"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span data-categoria className="text-body-lg font-bold text-on-surface">
            {s.categoria}
          </span>
          <EtiquetaSemaforo estado={s.semaforo} />
          <span className="text-body-sm text-on-surface-variant">
            {s.ultimoMovimiento
              ? `Último movimiento ${haceCuanto(s.ultimoMovimiento)}`
              : 'Sin movimientos'}
            {primero?.venceEn &&
              ` · Vence primero: ${formatearCantidad(primero.cantidad, s.unidad)} el ${diaLargo(primero.venceEn)}`}
          </span>
        </span>
        <span className="shrink-0 text-right text-headline-sm font-bold text-on-surface tabular-nums">
          {formatearCantidad(s.cantidad, s.unidad)}
        </span>
        <Icono nombre="chevron_right" className="text-[22px] text-outline" />
      </Link>
    </li>
  );
}

/** C3 Inventario (RF-INV-005). Diseño: docs/03-diseno/stitch/C03-inventario. */
export function Inventario() {
  const { id } = useParams();
  const acopioId = id!;
  const { usuario } = useSesion();
  const [orden, fijarOrden] = useState<Orden>('urgencia');
  const saldos = useSaldos(acopioId);
  const { data: acopio } = useAcopio(acopioId);
  const esOperador = usuario?.rol === 'OPERADOR';
  const lista = [...(saldos.data ?? [])].sort(ORDENES[orden]);

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Inventario"
        subtitulo={
          acopio && saldos.data ? `${acopio.nombre} · ${saldos.data.length} categorías` : undefined
        }
      />

      {saldos.isPending && <Esqueleto etiqueta="Cargando el inventario" className="h-48" />}
      {saldos.error && (
        <EstadoError mensaje={saldos.error.message} alReintentar={() => void saldos.refetch()} />
      )}
      {saldos.data && saldos.data.length === 0 && (
        <EstadoVacio titulo="Todavía no hay inventario">
          Aquí aparecerá cada categoría con su saldo y su estado en cuanto se registre la primera
          entrada.
        </EstadoVacio>
      )}

      {lista.length > 0 && (
        <>
          <Segmentado
            etiqueta="Ordenar"
            valor={orden}
            alCambiar={fijarOrden}
            opciones={[
              { valor: 'urgencia', texto: 'Más urgente' },
              { valor: 'nombre', texto: 'Nombre' },
              { valor: 'antiguedad', texto: 'Sin movimiento' },
            ]}
          />
          <ul aria-label="Resumen" className="flex flex-wrap gap-space-xs">
            {RESUMEN.map(({ estado, texto }) => {
              const n = lista.filter((s) => s.semaforo === estado).length;
              if (n === 0) return null;
              return (
                <li
                  key={estado}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-md ${SEMAFORO[estado].clases}`}
                >
                  <Icono nombre={SEMAFORO[estado].icono} className="text-[16px]" />
                  {texto(n)}
                </li>
              );
            })}
          </ul>
          <ul aria-label="Categorías" className="flex flex-col gap-space-xs">
            {lista.map((s) => (
              <Fila key={s.categoriaId} s={s} acopioId={acopioId} />
            ))}
          </ul>
        </>
      )}

      {esOperador && (
        <EnlaceBoton a={`/consola/acopios/${acopioId}/entrada`} className="min-h-[56px] w-full">
          <Icono nombre="add" className="text-[20px]" />
          Entrada rápida
        </EnlaceBoton>
      )}
    </div>
  );
}
