import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, SIMBOLO_UNIDAD } from '@acopio/shared';
import type { ResultadoBusqueda } from '../../api/catalogo';
import { useRegistrarEntrada, useSaldos } from '../../api/inventario';
import { useAcopio, useNoRecibir } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { Encabezado } from '../Encabezado';
import { BuscadorCategoria } from './BuscadorCategoria';
import { TarjetaSaldo } from './TarjetaSaldo';
import { aNumero, TecladoCantidad, teclear } from './TecladoCantidad';

const hoy = () => new Date().toISOString().slice(0, 10);

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
  const saldos = useSaldos(acopioId);
  const noRecibir = useNoRecibir(acopioId);
  const registrar = useRegistrarEntrada(acopioId);

  const decimales = categoria?.unidadBase !== 'UNIDAD';
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
          <BuscadorCategoria
            ref={busqueda}
            id="entrada-busqueda"
            q={q}
            onQ={fijarQ}
            onElegir={elegir}
          />
        ) : (
          <TarjetaSaldo
            categoria={categoria}
            saldo={saldoActual}
            onCambiar={() => fijarCategoria(null)}
          />
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
              onChange={(e) =>
                fijarCantidad(e.target.value.replace(decimales ? /[^\d,]/g : /\D/g, ''))
              }
              placeholder="0"
              // Crece con lo escrito: la unidad queda pegada al número
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

        <TecladoCantidad
          decimales={decimales}
          onTecla={(t) => fijarCantidad((c) => teclear(c, t, decimales))}
        />

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
