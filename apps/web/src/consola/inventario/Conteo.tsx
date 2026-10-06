import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import type { ResultadoBusqueda } from '../../api/catalogo';
import { useRegistrarAjuste, useSaldos } from '../../api/inventario';
import { useAcopio } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from './NecesitaRed';
import { BuscadorCategoria } from './BuscadorCategoria';
import { TarjetaSaldo } from './TarjetaSaldo';
import { aNumero, limpiarCantidad, TecladoCantidad, teclear } from './TecladoCantidad';

// El mismo mínimo que el CHECK de `movimiento` (§4 de la especificación)
const MINIMO_MOTIVO = 10;

/** C6 Conteo físico (RF-INV-004). Diseño: docs/03-diseno/stitch/C06-conteo-fisico. */
export function Conteo() {
  const { id } = useParams();
  const acopioId = id!;
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [cantidad, fijarCantidad] = useState('');
  const [motivo, fijarMotivo] = useState('');
  const [aviso, fijarAviso] = useState('');
  const busqueda = useRef<HTMLInputElement>(null);
  const { data: acopio } = useAcopio(acopioId);
  const saldos = useSaldos(acopioId);
  const enLinea = useEnLinea();
  const registrar = useRegistrarAjuste(acopioId);

  const decimales = categoria?.unidadBase !== 'UNIDAD';
  const contada = aNumero(cantidad);
  // Escrita con el teclado del equipo, la coma puede llegar donde no van decimales
  const fraccion = Boolean(categoria) && !decimales && cantidad.includes(',');
  const fila = saldos.data?.find((s) => s.categoriaId === categoria?.id);
  const saldoActual = fila?.cantidad ?? 0;
  const escrita = cantidad !== '';
  const diferencia = contada - saldoActual;
  const coincide = escrita && diferencia === 0;
  const faltan = MINIMO_MOTIVO - motivo.trim().length;
  // La API vio otro saldo: alguien registró entre la lectura y el ajuste (S-06)
  const sinDiferenciaApi = registrar.error?.codigo === 'SIN_DIFERENCIA';

  const limpiar = () => {
    fijarCantidad('');
    fijarMotivo('');
    registrar.reset();
  };

  const elegir = (c: ResultadoBusqueda) => {
    fijarCategoria(c);
    fijarAviso('');
    limpiar();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!categoria || !escrita || coincide || faltan > 0 || fraccion) return;
    const elegida = categoria;
    registrar.mutate(
      { categoriaId: elegida.id, cantidadContada: contada, motivo: motivo.trim() },
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
          titulo="Conteo físico"
          subtitulo={acopio?.nombre}
          volverA={`/consola/acopios/${acopioId}/inventario`}
        />
        <NecesitaRed titulo="El conteo necesita conexión" acopioId={acopioId}>
          El conteo se compara con el saldo del sistema, y sin red no se puede leer. Las entradas sí
          se guardan en el teléfono.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Conteo físico"
        subtitulo={acopio?.nombre}
        volverA={`/consola/acopios/${acopioId}/inventario`}
      />
      <p className="-mt-space-sm text-body-md text-on-surface-variant">
        Cuenta lo que hay y escribe el total. El sistema calcula la diferencia.
      </p>

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
              id="conteo-busqueda"
              q={q}
              onQ={fijarQ}
              onElegir={elegir}
            />
          ) : (
            <TarjetaSaldo
              categoria={categoria}
              saldo={saldoActual}
              etiqueta="En el sistema"
              onCambiar={() => fijarCategoria(null)}
            >
              {fila?.ultimoMovimiento && (
                <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                  <Icono nombre="schedule" className="text-[18px]" />
                  Último movimiento {haceCuanto(fila.ultimoMovimiento)}
                </span>
              )}
            </TarjetaSaldo>
          )}

          <label className="flex flex-col items-center gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
            <span className="text-label-md text-on-surface-variant">Cantidad contada</span>
            <span className="flex items-baseline gap-space-xs">
              <input
                id="conteo-cantidad"
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
          </label>

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

          {categoria && escrita && (
            <section
              aria-label="Diferencia"
              className="flex items-center gap-space-sm rounded-xl border border-outline bg-surface-container-low p-space-md"
            >
              <Icono
                nombre={coincide ? 'check' : diferencia < 0 ? 'arrow_downward' : 'arrow_upward'}
                className="text-[26px] text-primary-container"
              />
              {coincide ? (
                <span className="flex flex-col">
                  <b className="text-body-lg text-on-surface">Coincide con el sistema</b>
                  <span className="text-body-sm text-on-surface-variant">
                    No hay nada que ajustar.
                  </span>
                </span>
              ) : (
                <span className="flex flex-col tabular-nums">
                  <b className="text-body-lg text-on-surface">
                    Diferencia {diferencia < 0 ? '−' : '+'}
                    {formatearCantidad(Math.abs(diferencia), categoria.unidadBase)}
                  </b>
                  <span className="text-body-sm text-on-surface-variant">
                    El saldo pasará de {formatearCantidad(saldoActual, categoria.unidadBase)} a{' '}
                    {formatearCantidad(contada, categoria.unidadBase)}
                  </span>
                </span>
              )}
            </section>
          )}

          <div className="flex flex-col gap-space-xs">
            <label htmlFor="conteo-motivo" className="text-label-md font-bold text-on-surface">
              Motivo del ajuste{' '}
              <span aria-hidden="true" className="text-error">
                *
              </span>
            </label>
            <textarea
              id="conteo-motivo"
              value={motivo}
              onChange={(e) => fijarMotivo(e.target.value)}
              aria-describedby="conteo-motivo-ayuda"
              rows={2}
              className="rounded-xl border-[1.5px] border-outline bg-surface-container-lowest p-space-sm text-body-md text-on-surface"
            />
            <span id="conteo-motivo-ayuda" className="text-body-sm text-on-surface-variant">
              {faltan > 0 && `Faltan ${faltan} ${faltan === 1 ? 'carácter' : 'caracteres'}. `}
              Ej.: paquetes rotos por humedad en la estiba 3.
            </span>
          </div>

          <p className="flex gap-space-xs text-body-sm text-on-surface-variant">
            <Icono nombre="verified_user" className="text-[18px]" />
            Los ajustes no se borran ni se editan. Quedan en el historial y en la bitácora con tu
            nombre.
          </p>

          {registrar.error && (
            <p
              role="alert"
              className="rounded-xl bg-error-container p-space-sm text-on-error-container"
            >
              {sinDiferenciaApi
                ? 'Otra persona registró antes: ahora coincide con el sistema.'
                : registrar.error.message}
            </p>
          )}

          <Boton
            type="submit"
            className="min-h-[56px] w-full text-body-lg"
            disabled={
              !categoria || !escrita || coincide || faltan > 0 || fraccion || registrar.isPending
            }
          >
            <Icono nombre="fact_check" className="text-[22px]" />
            Registrar ajuste
          </Boton>
        </form>
      )}
    </div>
  );
}
