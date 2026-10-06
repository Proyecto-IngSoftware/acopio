import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import type { ResultadoBusqueda } from '../../api/catalogo';
import { useRegistrarSalida, useSaldos, type DatosSalida } from '../../api/inventario';
import { useAcopio } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EtiquetaSemaforo } from '../../componentes/EtiquetaSemaforo';
import { Icono } from '../../componentes/Icono';
import { diaLargo } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from './NecesitaRed';
import { BuscadorCategoria } from './BuscadorCategoria';
import { TarjetaSaldo } from './TarjetaSaldo';
import { aNumero, limpiarCantidad, TecladoCantidad, teclear } from './TecladoCantidad';

type Motivo = DatosSalida['motivoSalida'];

// Los cuatro motivos de V-05; Traslado y Otro piden nota
const MOTIVOS: { valor: Motivo; texto: string }[] = [
  { valor: 'ENTREGA_FAMILIAS', texto: 'Entrega directa a familias' },
  { valor: 'TRASLADO', texto: 'Traslado a otra organización' },
  { valor: 'VENCIDO', texto: 'Vencido o dañado' },
  { valor: 'OTRO', texto: 'Otro' },
];
const PIDEN_NOTA: Motivo[] = ['TRASLADO', 'OTRO'];
// «312 und.» ya termina en punto
const conPunto = (texto: string) => (texto.endsWith('.') ? texto : `${texto}.`);

/** C5 Salida (RF-INV-003). Diseño: docs/03-diseno/stitch/C05-salida. */
export function Salida() {
  const { id } = useParams();
  const acopioId = id!;
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [cantidad, fijarCantidad] = useState('');
  const [motivo, fijarMotivo] = useState<Motivo>('ENTREGA_FAMILIAS');
  const [nota, fijarNota] = useState('');
  const [aviso, fijarAviso] = useState('');
  const busqueda = useRef<HTMLInputElement>(null);
  const { data: acopio } = useAcopio(acopioId);
  const saldos = useSaldos(acopioId);
  const enLinea = useEnLinea();
  const registrar = useRegistrarSalida(acopioId);

  const decimales = categoria?.unidadBase !== 'UNIDAD';
  const n = aNumero(cantidad);
  // Escrita con el teclado del equipo, la coma puede llegar donde no van decimales
  const fraccion = Boolean(categoria) && !decimales && cantidad.includes(',');
  const fila = saldos.data?.find((s) => s.categoriaId === categoria?.id);
  const saldoActual = fila?.cantidad ?? 0;
  const vencimientos = (fila?.vencimientos ?? []).filter((v) => v.venceEn);
  const pideNota = PIDEN_NOTA.includes(motivo);
  // Un 409 trae el saldo que la API vio al registrar (S-04)
  const saldoApi =
    registrar.error?.codigo === 'SALDO_INSUFICIENTE'
      ? (registrar.error.detalles as { saldo?: number } | undefined)?.saldo
      : undefined;
  const excede = n > saldoActual;
  const sinSaldo = saldoApi ?? (categoria && excede ? saldoActual : undefined);

  const limpiar = () => {
    fijarCantidad('');
    fijarMotivo('ENTREGA_FAMILIAS');
    fijarNota('');
    registrar.reset();
  };

  const elegir = (c: ResultadoBusqueda) => {
    fijarCategoria(c);
    fijarAviso('');
    limpiar();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!categoria || n <= 0 || excede || fraccion || (pideNota && !nota.trim())) return;
    const elegida = categoria;
    registrar.mutate(
      {
        categoriaId: elegida.id,
        cantidad: n,
        motivoSalida: motivo,
        ...(pideNota ? { nota: nota.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          fijarAviso(`${elegida.nombre}: ${formatearCantidad(r.saldo, elegida.unidadBase)}`);
          fijarCategoria(null);
          fijarQ('');
          limpiar();
          busqueda.current?.focus();
        },
      },
    );
  };

  // Sin red, o si la API no responde, esto no se registra (O-09)
  const sinRed = !enLinea || saldos.error?.estado === 0;
  if (sinRed) {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        <Encabezado
          titulo="Registrar salida"
          subtitulo={acopio?.nombre}
          volverA={`/consola/acopios/${acopioId}/inventario`}
        />
        <NecesitaRed titulo="La salida necesita conexión" acopioId={acopioId}>
          Sin red, una salida podría dejar un saldo negativo que nadie vea. Las entradas sí se
          guardan en el teléfono.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Registrar salida"
        subtitulo={acopio?.nombre}
        volverA={`/consola/acopios/${acopioId}/inventario`}
      />

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

      {/* Sin saldos, la pantalla mostraría 0 como si fuera cierto */}
      {saldos.error ? (
        <EstadoError mensaje={saldos.error.message} alReintentar={() => void saldos.refetch()} />
      ) : saldos.isPending ? (
        <Esqueleto etiqueta="Cargando el inventario" />
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-space-md">
          {!categoria ? (
            <BuscadorCategoria
              ref={busqueda}
              id="salida-busqueda"
              q={q}
              onQ={fijarQ}
              onElegir={elegir}
            />
          ) : (
            <TarjetaSaldo
              categoria={categoria}
              saldo={saldoActual}
              onCambiar={() => fijarCategoria(null)}
            >
              {fila && <EtiquetaSemaforo estado={fila.semaforo} />}
            </TarjetaSaldo>
          )}

          {categoria && vencimientos.length > 0 && (
            <section
              aria-label="Sale primero"
              className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-md"
            >
              <span className="flex items-center gap-space-xs font-bold text-on-surface">
                <Icono nombre="event" className="text-[20px]" />
                Sale primero
              </span>
              <span className="text-body-md text-on-surface tabular-nums">
                {vencimientos
                  .map(
                    (v) =>
                      `${formatearCantidad(v.cantidad, categoria.unidadBase)} vencen el ${diaLargo(v.venceEn!)}`,
                  )
                  .join(' · ')}
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Entrega primero lo que vence antes. Es un estimado.
              </span>
            </section>
          )}

          <label
            className={`flex flex-col items-center gap-space-xs rounded-xl bg-surface-container-lowest p-space-md ${
              sinSaldo !== undefined ? 'border-2 border-error' : 'border border-outline-variant'
            }`}
          >
            <span className="text-label-md text-on-surface-variant">Cantidad que sale</span>
            <span className="flex items-baseline gap-space-xs">
              <input
                id="salida-cantidad"
                aria-label="Cantidad"
                inputMode={decimales ? 'decimal' : 'numeric'}
                autoComplete="off"
                value={cantidad}
                onChange={(e) => {
                  registrar.reset();
                  fijarCantidad(limpiarCantidad(e.target.value));
                }}
                placeholder="0"
                style={{ width: `${Math.max(cantidad.length, 1) + 0.5}ch` }}
                className="max-w-[60vw] bg-transparent text-center text-display-hero-mobile font-bold text-on-surface tabular-nums"
              />
              {categoria && (
                <span className="text-headline-sm text-on-surface-variant">
                  {SIMBOLO_UNIDAD[categoria.unidadBase]}
                </span>
              )}
            </span>
            {categoria && n > 0 && sinSaldo === undefined && (
              <span className="text-body-sm text-on-surface-variant tabular-nums">
                Quedan {formatearCantidad(saldoActual - n, categoria.unidadBase)}
              </span>
            )}
          </label>

          {categoria && sinSaldo !== undefined && (
            <p
              role="alert"
              className="flex gap-space-xs rounded-xl bg-error-container p-space-sm text-on-error-container"
            >
              <Icono nombre="error" className="text-[20px]" />
              {conPunto(`Solo hay ${formatearCantidad(sinSaldo, categoria.unidadBase)}`)} Escribe
              una cantidad igual o menor.
            </p>
          )}

          {fraccion && (
            <p
              role="alert"
              className="flex gap-space-xs rounded-xl bg-error-container p-space-sm text-on-error-container"
            >
              <Icono nombre="error" className="text-[20px]" />
              En unidades, la cantidad va sin decimales.
            </p>
          )}

          <TecladoCantidad
            decimales={decimales}
            onTecla={(t) => {
              registrar.reset();
              fijarCantidad((c) => teclear(c, t, decimales));
            }}
          />

          <fieldset className="flex flex-col gap-space-xs">
            <legend className="mb-space-xs text-label-md font-bold text-on-surface">
              Motivo{' '}
              <span aria-hidden="true" className="text-error">
                *
              </span>
            </legend>
            <div className="grid grid-cols-2 gap-space-xs">
              {MOTIVOS.map((m) => (
                <label
                  key={m.valor}
                  className={`flex min-h-[56px] items-center gap-space-xs rounded-xl p-space-sm text-label-md text-on-surface ${
                    motivo === m.valor
                      ? 'border-2 border-primary-container bg-primary-fixed'
                      : 'border border-outline-variant bg-surface-container-lowest'
                  }`}
                >
                  <input
                    type="radio"
                    name="salida-motivo"
                    value={m.valor}
                    checked={motivo === m.valor}
                    onChange={() => fijarMotivo(m.valor)}
                    className="size-5 accent-primary-container"
                  />
                  {m.texto}
                </label>
              ))}
            </div>
          </fieldset>

          {pideNota && (
            <div className="flex flex-col gap-space-xs">
              <label htmlFor="salida-nota" className="text-label-md font-bold text-on-surface">
                Nota{' '}
                <span aria-hidden="true" className="text-error">
                  *
                </span>
              </label>
              <textarea
                id="salida-nota"
                value={nota}
                onChange={(e) => fijarNota(e.target.value)}
                aria-describedby="salida-nota-ayuda"
                rows={2}
                className="rounded-xl border-[1.5px] border-outline bg-surface-container-lowest p-space-sm text-body-md text-on-surface"
              />
              <span id="salida-nota-ayuda" className="text-body-sm text-on-surface-variant">
                A quién va o por qué sale.
              </span>
            </div>
          )}

          {registrar.error && saldoApi === undefined && (
            <p className="rounded-xl bg-error-container p-space-sm text-on-error-container">
              {registrar.error.message}
            </p>
          )}

          <Boton
            type="submit"
            className="min-h-[56px] w-full text-body-lg"
            disabled={
              !categoria ||
              n <= 0 ||
              sinSaldo !== undefined ||
              fraccion ||
              (pideNota && !nota.trim()) ||
              registrar.isPending
            }
          >
            <Icono nombre="output" className="text-[22px]" />
            Registrar salida
          </Boton>
        </form>
      )}
    </div>
  );
}
