import { formatearCantidad } from '@acopio/shared';
import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { ErrorApi } from '../../api/cliente';
import { enBase, useComprobante, useRecibir, type Comprobante } from '../../api/comprobantes';
import { ESTADOS_DONACION } from '../../api/donaciones';
import { useAcopio, useNoRecibir } from '../../api/red';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { VistaCamara } from '../inventario/Escaner';
import { NecesitaRed } from '../inventario/NecesitaRed';
import {
  cantidadDe,
  cuerpoRecepcion,
  entradas,
  faltaVencimiento,
  iniciar,
  listoParaRegistrar,
  recepcion,
  soloEnteros,
  type LineaRecepcion,
} from './recepcion';

const AVISO =
  'flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface';

const nEntradas = (n: number) => (n === 1 ? '1 entrada' : `${n} entradas`);

/** Recibir una donación por su folio (RF-CMP-002). Diseño: docs/03-diseno/stitch/C04-recibir-folio. */
export function RecibirFolio() {
  const { id } = useParams();
  const acopioId = id!;
  const enLinea = useEnLinea();
  const { data: acopio } = useAcopio(acopioId);
  const [texto, setTexto] = useState('');
  const [folio, setFolio] = useState<string | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [avisoCamara, setAvisoCamara] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ folio: string; lineas: LineaRecepcion[] } | null>(null);
  const consulta = useComprobante(folio);
  const comprobante = consulta.data;

  const vista = hecho ? 'hecho' : comprobante?.estado === 'PREPARADO' ? 'confirmar' : 'buscar';
  const titulo = useRef<HTMLHeadingElement>(null);
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    titulo.current?.focus();
  }, [vista]);

  const empezarDeNuevo = () => {
    setHecho(null);
    setFolio(null);
    setTexto('');
  };

  // Mientras confirma, una caída de señal no borra lo escrito: el formulario sigue y avisa
  if (!enLinea && vista !== 'confirmar') {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        <Encabezado titulo="Recibir por folio" volverA={`/consola/acopios/${acopioId}/entrada`} />
        <NecesitaRed titulo="Recibir por folio necesita conexión" acopioId={acopioId}>
          Registra lo que llegó en Entrada rápida; un auditor lo vincula al folio después.
        </NecesitaRed>
      </div>
    );
  }

  const buscar = (e: FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim().toUpperCase();
    if (limpio) setFolio(limpio);
  };

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado
        titulo="Recibir por folio"
        subtitulo={acopio?.nombre}
        volverA={`/consola/acopios/${acopioId}/entrada`}
      />

      {vista === 'buscar' && (
        <section className="flex flex-col gap-space-sm" aria-labelledby="titulo-buscar">
          <h2 id="titulo-buscar" ref={titulo} tabIndex={-1} className="sr-only">
            Buscar el folio
          </h2>
          {comprobante ? (
            <EstadoFolio comprobante={comprobante} alOtro={empezarDeNuevo} />
          ) : (
            <form onSubmit={buscar} className="flex flex-col gap-space-sm">
              <Campo
                id="folio"
                etiqueta="Folio"
                placeholder="Ej. ACO-2026-7KQ4M"
                autoComplete="off"
                autoCapitalize="characters"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-invalid={comprobante === null}
                aria-describedby={comprobante === null ? 'folio-error' : undefined}
              />
              {comprobante === null && (
                <p id="folio-error" role="alert" className="text-body-sm text-error">
                  No encontramos ese folio
                </p>
              )}
              {consulta.error && (
                <EstadoError
                  mensaje={consulta.error.message}
                  alReintentar={() => void consulta.refetch()}
                />
              )}
              <Boton type="submit" disabled={consulta.isFetching}>
                Buscar
              </Boton>
              <Boton
                variante="secundario"
                onClick={() => {
                  setAvisoCamara(null);
                  setEscaneando(true);
                }}
              >
                <Icono nombre="qr_code_scanner" className="text-[22px]" />
                Escanear QR
              </Boton>
              {avisoCamara && <p className={AVISO}>{avisoCamara}</p>}
              <p className="text-body-sm text-on-surface-variant">
                El folio está en el correo o en el teléfono de quien trae la donación.
              </p>
            </form>
          )}
        </section>
      )}

      {vista === 'confirmar' && comprobante && (
        <Confirmar
          key={comprobante.folio}
          comprobante={comprobante}
          acopioId={acopioId}
          titulo={titulo}
          sinRed={!enLinea}
          alRecargar={() => void consulta.refetch()}
          alRecibir={(lineas) => setHecho({ folio: comprobante.folio, lineas })}
        />
      )}

      {vista === 'hecho' && hecho && (
        <section className="flex flex-col gap-space-md" aria-labelledby="titulo-hecho">
          <span className="flex h-14 w-14 items-center justify-center self-center rounded-full bg-primary-fixed text-primary-container">
            <Icono nombre="check" className="text-[32px]" />
          </span>
          <div className="text-center">
            <h2
              id="titulo-hecho"
              ref={titulo}
              tabIndex={-1}
              className="text-headline-sm text-on-surface"
            >
              Recibido
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {hecho.folio} · {nEntradas(entradas(hecho.lineas))} en{' '}
              {acopio?.nombre ?? 'este acopio'}
            </p>
          </div>
          <ul className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest">
            {hecho.lineas
              .filter((l) => cantidadDe(l) > 0)
              .map((l) => (
                <li
                  key={l.id}
                  className="flex justify-between gap-space-sm border-t border-outline-variant p-space-sm first:border-t-0"
                >
                  <span>{l.categoria}</span>
                  <b className="tabular-nums">
                    {formatearCantidad(enBase(cantidadDe(l), l.contenido), l.unidad)}
                  </b>
                </li>
              ))}
          </ul>
          <p className="text-center text-body-md text-on-surface-variant">
            Un auditor revisa el comprobante y lo concilia.
          </p>
          <Boton onClick={empezarDeNuevo}>Recibir otro folio</Boton>
          <EnlaceBoton a={`/consola/acopios/${acopioId}/entrada`} variante="secundario">
            Volver a Entrada rápida
          </EnlaceBoton>
        </section>
      )}

      {escaneando && (
        <VistaCamara
          alLeer={(codigo) => {
            setEscaneando(false);
            const limpio = codigo.trim().toUpperCase();
            setTexto(limpio);
            setFolio(limpio);
          }}
          alCerrar={() => setEscaneando(false)}
          alFallar={() => {
            setEscaneando(false);
            setAvisoCamara('No pudimos abrir la cámara. Escribe el folio.');
          }}
        />
      )}
    </div>
  );
}

/** Un folio que ya no se puede recibir: su estado y la salida. */
function EstadoFolio({ comprobante, alOtro }: { comprobante: Comprobante; alOtro: () => void }) {
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="font-mono text-body-lg font-bold whitespace-nowrap">
            {comprobante.folio}
          </span>
          <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md">
            {ESTADOS_DONACION[comprobante.estado]}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant">Este folio ya no se puede recibir.</p>
      </div>
      <Boton variante="secundario" onClick={alOtro}>
        Buscar otro folio
      </Boton>
    </div>
  );
}

function Confirmar({
  comprobante,
  acopioId,
  titulo,
  sinRed,
  alRecargar,
  alRecibir,
}: {
  comprobante: Comprobante;
  acopioId: string;
  sinRed: boolean;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  alRecargar: () => void;
  alRecibir: (lineas: LineaRecepcion[]) => void;
}) {
  const [lineas, despachar] = useReducer(recepcion, comprobante, iniciar);
  const { data: noRecibe } = useNoRecibir(acopioId);
  const recibir = useRecibir(comprobante.folio);
  const bloqueadas = new Set(noRecibe?.map((n) => n.categoriaId));
  const n = entradas(lineas);
  const error = recibir.error;

  const registrar = () =>
    recibir.mutate(cuerpoRecepcion(lineas, acopioId), { onSuccess: () => alRecibir(lineas) });

  return (
    <section className="flex flex-col gap-space-md" aria-labelledby="titulo-confirmar">
      <div className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="font-mono text-body-lg font-bold whitespace-nowrap">
            {comprobante.folio}
          </span>
          <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md">
            Preparada
          </span>
        </div>
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="schedule" className="text-[18px]" />
          Preparada {haceCuanto(comprobante.creadoEn)}
        </p>
      </div>

      {comprobante.acopio.id !== acopioId && (
        <p className={AVISO}>
          <Icono nombre="info" className="text-[22px] text-on-surface-variant" />
          Este folio era para {comprobante.acopio.nombre}. Al recibirlo aquí queda en este acopio.
        </p>
      )}

      <h2
        id="titulo-confirmar"
        ref={titulo}
        tabIndex={-1}
        className="text-headline-sm text-on-surface"
      >
        Lo que trae
      </h2>
      <ul className="flex flex-col gap-space-sm">
        {lineas.map((l) => (
          <LineaFolio
            key={l.id}
            linea={l}
            noRecibe={bloqueadas.has(l.categoriaId)}
            despachar={despachar}
          />
        ))}
      </ul>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-space-sm rounded-xl bg-error-container p-space-sm text-on-error-container"
        >
          <p>{error.message}</p>
          {error instanceof ErrorApi && error.estado === 409 && (
            <Boton
              variante="secundario"
              onClick={() => {
                recibir.reset();
                alRecargar();
              }}
            >
              Volver a cargar
            </Boton>
          )}
        </div>
      )}

      {sinRed && (
        <p role="status" className={AVISO}>
          <Icono nombre="wifi_off" className="text-[22px] text-on-surface-variant" />
          Sin conexión. Lo que escribiste se queda aquí; registra cuando vuelva la señal.
        </p>
      )}
      <Boton
        onClick={registrar}
        disabled={sinRed || !listoParaRegistrar(lineas) || recibir.isPending}
        className="sticky bottom-space-sm min-h-[56px]"
      >
        {n > 0 ? `Registrar recepción (${nEntradas(n)})` : 'Registrar que no llegó nada'}
      </Boton>
    </section>
  );
}

function LineaFolio({
  linea: l,
  noRecibe,
  despachar,
}: {
  linea: LineaRecepcion;
  noRecibe: boolean;
  despachar: (a: Parameters<typeof recepcion>[1]) => void;
}) {
  const cantidad = cantidadDe(l);
  return (
    <li
      aria-label={l.categoria}
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <span className="text-body-lg font-bold text-on-surface">{l.categoria}</span>
      <span className="text-body-sm text-on-surface-variant">
        Declaró {formatearCantidad(enBase(l.declarada, l.contenido), l.unidad)}
      </span>
      <div className="flex items-center gap-space-sm">
        <span className="text-body-md text-on-surface-variant">Llegó</span>
        <div className="ml-auto flex items-center rounded-xl border-[1.5px] border-outline">
          <button
            type="button"
            aria-label={`Menos ${l.categoria}`}
            disabled={cantidad <= 0}
            onClick={() => despachar({ tipo: 'sumar', id: l.id, delta: -1 })}
            className="flex h-12 w-12 items-center justify-center text-on-surface disabled:opacity-40"
          >
            <Icono nombre="remove" className="text-[22px]" />
          </button>
          <input
            aria-label={`Llegó de ${l.categoria}`}
            inputMode={soloEnteros(l) ? 'numeric' : 'decimal'}
            value={l.texto}
            onChange={(e) => despachar({ tipo: 'escribir', id: l.id, texto: e.target.value })}
            className="h-12 w-16 border-x border-outline-variant bg-transparent text-center text-body-lg font-bold tabular-nums text-on-surface"
          />
          <button
            type="button"
            aria-label={`Más ${l.categoria}`}
            onClick={() => despachar({ tipo: 'sumar', id: l.id, delta: 1 })}
            className="flex h-12 w-12 items-center justify-center text-on-surface"
          >
            <Icono nombre="add" className="text-[22px]" />
          </button>
        </div>
      </div>
      {l.contenido !== 1 && cantidad > 0 && (
        <span className="text-right text-body-sm text-on-surface-variant">
          = {formatearCantidad(enBase(cantidad, l.contenido), l.unidad)}
        </span>
      )}
      {cantidad === 0 && (
        <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="block" className="text-[18px]" />
          No llegó
        </span>
      )}
      {cantidad > 0 && cantidad < l.declarada && (
        <Campo
          id={`motivo-${l.id}`}
          etiqueta="¿Qué pasó con la diferencia?"
          maxLength={280}
          value={l.motivo}
          onChange={(e) => despachar({ tipo: 'motivo', id: l.id, motivo: e.target.value })}
        />
      )}
      {(faltaVencimiento(l) || (l.venceEn && cantidad > 0)) && (
        <Campo
          id={`vence-${l.id}`}
          etiqueta="Vence"
          type="date"
          required
          ayuda="No trae fecha de vencimiento y es perecedera."
          value={l.venceEn}
          onChange={(e) => despachar({ tipo: 'vencer', id: l.id, venceEn: e.target.value })}
        />
      )}
      {noRecibe && cantidad > 0 && (
        <p className={AVISO}>
          <Icono nombre="block" className="text-[22px] text-on-surface-variant" />
          Este acopio no está recibiendo {l.categoria}. Puedes recibirla igual.
        </p>
      )}
    </li>
  );
}
