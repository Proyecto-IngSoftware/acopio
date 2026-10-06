import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { formatearCantidad, formatearNumero, SIMBOLO_UNIDAD } from '@acopio/shared';
import type { ResultadoBusqueda } from '../../api/catalogo';
import { useRegistrarEntrada, useSaldos, type DatosEntrada } from '../../api/inventario';
import { useAcopio, useNoRecibir } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { useSesion } from '../../sesion/Sesion';
import { encolar, listarCola } from '../../sin-conexion/cola';
import { leerNoRecibir, leerSaldos } from '../../sin-conexion/datos-locales';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { pedirEnvio } from '../../sin-conexion/Sincronizador';
import { useCopiaLocal } from '../../sin-conexion/useCopiaLocal';
import { Encabezado } from '../Encabezado';
import { BuscadorCategoria, type Leido } from './BuscadorCategoria';
import { TarjetaSaldo } from './TarjetaSaldo';
import { aNumero, limpiarCantidad, TecladoCantidad, teclear } from './TecladoCantidad';

const hoy = () => new Date().toISOString().slice(0, 10);
const EN_LA_UNIDAD = { LITRO: 'litros', KILOGRAMO: 'kilos', UNIDAD: 'unidades' } as const;
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** C4 Entrada rápida (RF-INV-001). Diseño: docs/03-diseno/stitch/C04-entrada-rapida. */
export function EntradaRapida() {
  const { id } = useParams();
  const acopioId = id!;
  const [q, fijarQ] = useState('');
  const [categoria, fijarCategoria] = useState<ResultadoBusqueda | null>(null);
  const [cantidad, fijarCantidad] = useState('');
  const [vence, fijarVence] = useState('');
  const [aviso, fijarAviso] = useState('');
  // Un código con contenido hace contar presentaciones: 12 × 0,6 L = 7,2 L
  const [leido, fijarLeido] = useState<Leido | null>(null);
  const busqueda = useRef<HTMLInputElement>(null);
  const { data: acopio } = useAcopio(acopioId);
  const saldos = useSaldos(acopioId);
  const noRecibir = useNoRecibir(acopioId);
  const registrar = useRegistrarEntrada(acopioId);
  useCopiaLocal(acopioId);
  const { usuario } = useSesion();
  const consultas = useQueryClient();
  const enLinea = useEnLinea();
  // El navegador puede creer que hay red (un portal cautivo): si la API no responde, tampoco
  const sinRed = !enLinea || saldos.error?.estado === 0;
  const local = (clave: string, leer: () => Promise<unknown>) => ({
    queryKey: ['local', clave, acopioId],
    queryFn: leer,
    enabled: sinRed,
    networkMode: 'always' as const,
  });
  const saldosLocales = useQuery({
    ...local('saldos', () => leerSaldos(acopioId)),
    queryFn: () => leerSaldos(acopioId),
  });
  const noRecibirLocal = useQuery({
    ...local('no-recibir', () => leerNoRecibir(acopioId)),
    queryFn: () => leerNoRecibir(acopioId),
  });
  const cola = useQuery({
    queryKey: ['cola', usuario?.id],
    queryFn: () => listarCola(usuario!.id),
    enabled: !!usuario,
    networkMode: 'always',
  });
  const [errorLocal, fijarErrorLocal] = useState('');

  // Lo que quedó de antes sale apenas se abre C4 con red (O-03)
  useEffect(() => pedirEnvio(), []);

  const porPresentacion = leido?.contenido ?? null;
  const decimales = !porPresentacion && categoria?.unidadBase !== 'UNIDAD';
  const tecleado = aNumero(cantidad);
  // Escrita con el teclado del equipo, la coma puede llegar donde no van decimales
  const fraccion = Boolean(categoria) && !decimales && cantidad.includes(',');
  const n = porPresentacion ? Math.round(tecleado * porPresentacion * 1000) / 1000 : tecleado;
  const falta = categoria?.perecedero && !vence;
  const noRecibe = sinRed ? noRecibirLocal.data : noRecibir.data;
  const noSeRecibe = categoria && noRecibe?.some((x) => x.categoriaId === categoria.id);
  // Sin red el saldo es estimado: el último conocido más lo que espera en la cola (O-07)
  const pendientes = (cola.data ?? []).filter(
    (e) =>
      e.estado === 'pendiente' && e.acopioId === acopioId && e.cuerpo.categoriaId === categoria?.id,
  );
  const saldoActual = sinRed
    ? (saldosLocales.data?.saldos.find((s) => s.categoriaId === categoria?.id)?.cantidad ?? 0) +
      pendientes.reduce((t, e) => t + e.cuerpo.cantidad, 0)
    : (saldos.data?.find((s) => s.categoriaId === categoria?.id)?.cantidad ?? 0);

  const elegir = (c: ResultadoBusqueda, l?: Leido) => {
    fijarCategoria(c);
    fijarLeido(l ?? null);
    fijarCantidad('');
    fijarAviso('');
    registrar.reset();
  };

  const listaParaOtra = (aviso: string) => {
    fijarAviso(aviso);
    fijarCategoria(null);
    fijarLeido(null);
    fijarQ('');
    fijarCantidad('');
    fijarVence('');
    busqueda.current?.focus();
  };

  const guardarEnTelefono = async (datos: DatosEntrada, elegida: ResultadoBusqueda) => {
    registrar.reset();
    fijarErrorLocal('');
    try {
      await encolar(usuario!.id, acopioId, datos);
    } catch {
      fijarErrorLocal(
        'No se pudo guardar en este teléfono. Revisa que el navegador no esté en modo privado.',
      );
      return;
    }
    void consultas.invalidateQueries({ queryKey: ['cola'] });
    listaParaOtra(
      `${elegida.nombre}: ${formatearCantidad(datos.cantidad, elegida.unidadBase)} guardadas en el teléfono`,
    );
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!categoria || n <= 0 || falta || fraccion) return;
    const elegida = categoria;
    const datos: DatosEntrada = {
      // Un doble toque o un reintento no duplica la entrada (E-04)
      id: crypto.randomUUID(),
      categoriaId: elegida.id,
      cantidad: n,
      ...(elegida.perecedero ? { venceEn: vence } : {}),
    };
    if (sinRed) return void guardarEnTelefono(datos, elegida);
    registrar.mutate(datos, {
      onSuccess: (r) =>
        listaParaOtra(`${elegida.nombre}: ${formatearCantidad(r.saldo, elegida.unidadBase)}`),
      // La red se cayó justo ahora: la entrada no se pierde, va a la cola
      onError: (error) => {
        if (error.estado === 0) void guardarEnTelefono(datos, elegida);
      },
    });
  };

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Entrada rápida"
        subtitulo={acopio?.nombre}
        volverA={`/consola/acopios/${acopioId}/inventario`}
      />

      {sinRed && (
        <p className="flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
          <Icono nombre="wifi_off" className="text-[22px] text-on-surface-variant" />
          Sin conexión. Las entradas se guardan en este teléfono y se envían solas cuando vuelva la
          señal.
        </p>
      )}

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
            sinRed={sinRed}
          />
        ) : (
          <TarjetaSaldo
            categoria={categoria}
            saldo={saldoActual}
            etiqueta={sinRed ? 'Saldo estimado' : undefined}
            onCambiar={() => {
              fijarCategoria(null);
              fijarLeido(null);
            }}
          >
            {sinRed && (
              <span className="text-body-sm text-on-surface-variant">
                {saldosLocales.data
                  ? `Último saldo conocido, de las ${hora(saldosLocales.data.guardadoEn)}`
                  : 'Sin saldo guardado en este teléfono'}
                {pendientes.length > 0 &&
                  `, más ${pendientes.length} ${pendientes.length === 1 ? 'entrada' : 'entradas'} sin enviar`}
                .
              </span>
            )}
            {leido && (
              <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                <Icono nombre="barcode" className="text-[18px]" />
                Leído: {leido.ean}
                {leido.contenido !== null &&
                  ` · cada una trae ${formatearCantidad(leido.contenido, categoria.unidadBase)}`}
              </span>
            )}
          </TarjetaSaldo>
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
          <span className="text-label-caps text-on-surface-variant uppercase">
            {porPresentacion ? 'Presentaciones' : 'Cantidad'}
          </span>
          <span className="flex items-baseline gap-space-xs">
            <input
              id="entrada-cantidad"
              aria-label="Cantidad"
              inputMode="decimal"
              autoComplete="off"
              value={cantidad}
              onChange={(e) => fijarCantidad(limpiarCantidad(e.target.value))}
              placeholder="0"
              // Crece con lo escrito: la unidad queda pegada al número
              style={{ width: `${Math.max(cantidad.length, 1) + 0.5}ch` }}
              className="max-w-[60vw] bg-transparent text-center text-display-hero-mobile font-bold text-on-surface tabular-nums"
            />
            {categoria && !porPresentacion && (
              <span className="text-headline-sm text-on-surface-variant">
                {SIMBOLO_UNIDAD[categoria.unidadBase]}
              </span>
            )}
          </span>
        </label>

        {categoria && porPresentacion && (
          <div className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-space-sm tabular-nums">
            {tecleado > 0 && (
              <b className="text-body-lg text-on-surface">
                {`${formatearNumero(tecleado)} × ${formatearCantidad(porPresentacion, categoria.unidadBase)} = ${formatearCantidad(n, categoria.unidadBase)}`}
              </b>
            )}
            <button
              type="button"
              onClick={() => {
                fijarLeido(null);
                fijarCantidad('');
              }}
              className="min-h-[44px] w-fit text-label-md text-primary-container"
            >
              Escribir en {EN_LA_UNIDAD[categoria.unidadBase]}
            </button>
          </div>
        )}

        <TecladoCantidad
          decimales={decimales}
          onTecla={(t) => fijarCantidad((c) => teclear(c, t, decimales))}
        />

        {fraccion && (
          <p
            role="alert"
            className="flex gap-space-xs rounded-xl bg-error-container p-space-sm text-on-error-container"
          >
            <Icono nombre="error" className="text-[20px]" />
            {porPresentacion
              ? 'Las presentaciones se cuentan enteras.'
              : 'En unidades, la cantidad va sin decimales.'}
          </p>
        )}

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

        {(errorLocal || (registrar.error && registrar.error.estado !== 0)) && (
          <p className="rounded-xl bg-error-container p-space-sm text-on-error-container">
            {errorLocal || registrar.error?.message}
          </p>
        )}

        <Boton
          type="submit"
          className="min-h-[56px] w-full text-body-lg"
          disabled={!categoria || n <= 0 || !!falta || fraccion || registrar.isPending}
        >
          <Icono nombre={sinRed ? 'save' : 'check'} className="text-[22px]" />
          {sinRed
            ? categoria && n > 0
              ? `Guardar ${formatearCantidad(n, categoria.unidadBase)} en el teléfono`
              : 'Guardar en el teléfono'
            : categoria && n > 0
              ? `Registrar ${formatearCantidad(n, categoria.unidadBase)}`
              : 'Registrar'}
        </Boton>
      </form>
    </div>
  );
}
