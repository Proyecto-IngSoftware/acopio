import { useEffect, useState } from 'react';
import { formatearCantidad, formatearNumero } from '@acopio/shared';
import type { ErrorApi } from '../../api/cliente';
import {
  topeLinea,
  useExcedentes,
  type Excedente,
  type LineaNueva,
  type LineaRemision,
} from '../../api/remisiones';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { leerCantidad, simboloDe } from '../../componentes/cantidad-base';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';

/** Una remisión lleva de 1 a 40 categorías (CrearRemisionDto). */
const MAXIMO_LINEAS = 40;

interface Props {
  acopioId: string;
  /** Las líneas que ya tiene la remisión; vacío al crearla. */
  propias: LineaRemision[];
  /** El error de la última vez que se guardó, para marcar la fila de LINEA_EXCEDE_MOVIBLE. */
  error: ErrorApi | null;
  alGuardar: (lineas: LineaNueva[]) => void;
  etiqueta: string;
  ocupado: boolean;
  /** Avisa si hay cantidades distintas de las guardadas, para no despachar sin guardarlas. */
  alCambiarSucio?: (sucio: boolean) => void;
}

interface Fila {
  categoriaId: string;
  categoria: string;
  unidad: LineaRemision['unidad'];
  tope: number;
  diasParaVencer: number | null;
}

/** Las categorías que se pueden mandar, más las que ya tiene la remisión (I2-08). */
function filasDe(excedentes: Excedente[], propias: LineaRemision[]): Fila[] {
  const propia = new Map(propias.map((l) => [l.categoriaId, l]));
  const filas: Fila[] = excedentes
    .filter((e) => e.movible > 0 || propia.has(e.categoriaId))
    .map((e) => ({
      categoriaId: e.categoriaId,
      categoria: e.categoria,
      unidad: e.unidad,
      tope: topeLinea(e, propia.get(e.categoriaId)?.cantidadPlaneada ?? 0),
      diasParaVencer: e.diasParaVencer,
    }));
  const vistas = new Set(filas.map((f) => f.categoriaId));
  for (const l of propias) {
    if (!vistas.has(l.categoriaId)) {
      filas.push({
        categoriaId: l.categoriaId,
        categoria: l.categoria,
        unidad: l.unidad,
        tope: topeLinea(undefined, l.cantidadPlaneada),
        diasParaVencer: null,
      });
    }
  }
  return filas.sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
}

function maximoDe(error: ErrorApi | null): { categoriaId: string; maximo: number } | null {
  if (error?.codigo !== 'LINEA_EXCEDE_MOVIBLE') return null;
  const d = error.detalles as { categoriaId?: string; maximo?: number } | undefined;
  return d?.categoriaId && typeof d.maximo === 'number'
    ? { categoriaId: d.categoriaId, maximo: d.maximo }
    : null;
}

/** C12: qué se manda, contra lo que el acopio puede mover hoy. Lo usan «nueva» y el borrador. */
export function EditorLineas({
  acopioId,
  propias,
  error,
  alGuardar,
  etiqueta,
  ocupado,
  alCambiarSucio,
}: Props) {
  const excedentes = useExcedentes(acopioId);
  const [cantidades, fijarCantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(propias.map((l) => [l.categoriaId, String(l.cantidadPlaneada)])),
  );
  // En qué unidad se escribe cada fila: 1 es la unidad base (kg, L); 0,001 son g o ml
  const [factores, fijarFactores] = useState<Record<string, number>>({});
  const [busqueda, fijarBusqueda] = useState('');
  const guardadas = new Map(propias.map((l) => [l.categoriaId, l.cantidadPlaneada]));
  const sucio = Object.entries(cantidades).some(
    ([id, texto]) =>
      Math.round(Number(texto.replace(',', '.') || 0) * (factores[id] ?? 1) * 1000) / 1000 !==
      (guardadas.get(id) ?? 0),
  );
  useEffect(() => alCambiarSucio?.(sucio), [sucio, alCambiarSucio]);

  if (excedentes.isPending) return <Esqueleto etiqueta="Cargando el excedente" />;
  if (excedentes.error) {
    return (
      <EstadoError
        mensaje={excedentes.error.message}
        alReintentar={() => void excedentes.refetch()}
      />
    );
  }

  const filas = filasDe(excedentes.data, propias);
  if (filas.length === 0) {
    return (
      <EstadoVacio titulo="Este acopio no tiene excedente para mandar">
        El excedente aparece cuando el saldo pasa del máximo del umbral.
      </EstadoVacio>
    );
  }

  const leida = (f: Fila) =>
    leerCantidad(cantidades[f.categoriaId] ?? '', factores[f.categoriaId] ?? 1, f.unidad);
  const valor = (f: Fila) => leida(f).base;
  const lineas: LineaNueva[] = filas
    .filter((f) => valor(f) > 0)
    .map((f) => ({ categoriaId: f.categoriaId, cantidad: valor(f) }));
  const pasadas = new Set(filas.filter((f) => valor(f) > f.tope).map((f) => f.categoriaId));
  // Lo que la API rechazaría: CANTIDAD_ENTERA en unidades, más de 3 decimales y el tope de línea
  const problema = (f: Fila): string | null => {
    const texto = cantidades[f.categoriaId] ?? '';
    const v = Number(texto.replace(',', '.'));
    if (f.unidad === 'UNIDAD' && v > 0 && !Number.isInteger(v)) return 'Usa números enteros';
    return leida(f).error;
  };
  const invalidas = filas.filter((f) => problema(f) !== null).length;
  const demasiadas = lineas.length > MAXIMO_LINEAS;
  const maximo = maximoDe(error);
  const texto = busqueda.trim().toLocaleLowerCase('es');
  // La fila que la API rechazó se ve aunque el buscador la oculte
  const visibles = texto
    ? filas.filter(
        (f) =>
          f.categoria.toLocaleLowerCase('es').includes(texto) ||
          f.categoriaId === maximo?.categoriaId,
      )
    : filas;

  return (
    <div className="flex flex-col gap-space-sm">
      <Campo
        id="buscar-categoria"
        etiqueta="Buscar categoría"
        type="search"
        value={busqueda}
        onChange={(e) => fijarBusqueda(e.target.value)}
      />
      <ul className="flex flex-col gap-space-sm">
        {visibles.map((f) => {
          const id = `cantidad-${f.categoriaId}`;
          const pasada = pasadas.has(f.categoriaId);
          const sugerido = maximo?.categoriaId === f.categoriaId ? maximo.maximo : null;
          return (
            <li
              key={f.categoriaId}
              className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-space-xs">
                <span className="min-w-0 text-body-lg font-bold text-on-surface">
                  {f.categoria}
                </span>
                {f.diasParaVencer !== null && f.diasParaVencer >= 0 && f.diasParaVencer <= 30 && (
                  <span className="shrink-0 rounded-full border border-outline-variant bg-surface-container-low px-space-xs text-body-sm text-on-surface">
                    Vence en {f.diasParaVencer} {f.diasParaVencer === 1 ? 'día' : 'días'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-space-xs">
                <p className="min-w-0 text-body-sm text-on-surface-variant">
                  Se pueden mandar {formatearCantidad(f.tope, f.unidad)}
                </p>
                <div className="flex shrink-0 items-center gap-space-sm">
                  <label htmlFor={id} className="sr-only">
                    Cantidad de {f.categoria} ({simboloDe(f.unidad, factores[f.categoriaId] ?? 1)})
                  </label>
                  <input
                    id={id}
                    type="number"
                    inputMode={f.unidad === 'UNIDAD' ? 'numeric' : 'decimal'}
                    min={0}
                    step={f.unidad === 'UNIDAD' || (factores[f.categoriaId] ?? 1) < 1 ? 1 : 0.001}
                    max={f.tope / (factores[f.categoriaId] ?? 1)}
                    value={cantidades[f.categoriaId] ?? ''}
                    aria-invalid={pasada || undefined}
                    onChange={(e) =>
                      fijarCantidades((c) => ({ ...c, [f.categoriaId]: e.target.value }))
                    }
                    className={`min-h-[48px] w-24 rounded-xl border-[1.5px] bg-surface-container-lowest px-space-sm text-right text-body-md font-bold tabular-nums text-on-surface ${pasada ? 'border-error' : 'border-outline-variant'}`}
                  />
                  <SelectorUnidad
                    unidad={f.unidad}
                    factor={factores[f.categoriaId] ?? 1}
                    alCambiar={(factor) =>
                      fijarFactores((c) => ({ ...c, [f.categoriaId]: factor }))
                    }
                  />
                </div>
              </div>
              {pasada && <p className="text-body-sm text-error">Pasa de lo que se puede mandar</p>}
              {!pasada && problema(f) && <p className="text-body-sm text-error">{problema(f)}</p>}
              {sugerido !== null && (
                <div className="flex flex-wrap items-center gap-space-xs rounded-xl bg-error-container p-space-sm text-body-sm text-on-error-container">
                  <span>Hoy se pueden mandar hasta {formatearCantidad(sugerido, f.unidad)}</span>
                  <Boton
                    variante="terciario"
                    onClick={() => {
                      fijarFactores((c) => ({ ...c, [f.categoriaId]: 1 }));
                      fijarCantidades((c) => ({ ...c, [f.categoriaId]: String(sugerido) }));
                    }}
                  >
                    Usar {formatearNumero(sugerido)}
                  </Boton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {demasiadas && (
        <p className="text-body-sm text-error">Una remisión lleva hasta 40 categorías</p>
      )}
      <Boton
        disabled={ocupado || lineas.length === 0 || demasiadas || pasadas.size > 0 || invalidas > 0}
        onClick={() => alGuardar(lineas)}
      >
        {etiqueta}
      </Boton>
    </div>
  );
}
