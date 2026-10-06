import { useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { formatearCantidad, SIMBOLO_UNIDAD, formatearNumero } from '@acopio/shared';
import type { ResultadoBusqueda } from '../api/catalogo';
import { consultarCodigoDonador, useMisDonaciones, type Donacion } from '../api/donaciones';
import { Boton, EnlaceBoton } from '../componentes/Boton';
import { EstadoError } from '../componentes/EstadoError';
import { Esqueleto } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import { BuscadorCategoria, type ResolverCodigo } from '../consola/inventario/BuscadorCategoria';
import { BarraPasos, NOMBRES_PASOS } from './BarraPasos';
import { PasoEntrega } from './PasoEntrega';
import { PasoFolio, type FalloFactura } from './PasoFolio';
import { cantidadBase, estadoInicial, reducir, type Linea } from './preparacion';

/** Lo máximo de donaciones preparadas a la vez (RF-DON). */
const LIMITE_PREPARADAS = 5;

/** El Donador lee códigos de su propio endpoint: no aprende códigos nuevos. */
const resolverCodigo: ResolverCodigo = async (ean) => {
  const c = await consultarCodigoDonador(ean);
  if (!c) return null;
  // El contrato tipa el contenido nullable como arreglo (P-031)
  const contenido = Array.isArray(c.contenido) ? (c.contenido[0] ?? null) : (c.contenido ?? null);
  return {
    categoria: {
      id: c.categoriaId,
      nombre: c.categoria,
      grupo: c.grupo,
      unidadBase: c.unidad,
      perecedero: c.perecedero,
      puntaje: 1,
    },
    contenido,
  };
};

function LineaDonacion({
  linea,
  alCambiar,
  alVencer,
  alQuitar,
}: {
  linea: Linea;
  alCambiar: (cantidad: number) => void;
  alVencer: (venceEn: string) => void;
  alQuitar: () => void;
}) {
  const conPresentacion = linea.contenido !== null;
  return (
    <li
      aria-label={linea.nombre}
      className="flex flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
    >
      <div className="flex items-center gap-space-xs">
        <span className="min-w-0 flex-1 text-body-lg font-bold text-on-surface">
          {linea.nombre}
        </span>
        <button
          type="button"
          aria-label={`Quitar ${linea.nombre}`}
          onClick={alQuitar}
          className="flex h-12 w-12 items-center justify-center rounded-full text-on-surface-variant"
        >
          <Icono nombre="delete" className="text-[22px]" />
        </button>
      </div>
      {(linea.ean || conPresentacion) && (
        <p className="flex flex-wrap gap-x-space-xs text-body-sm text-on-surface-variant">
          {conPresentacion && (
            <span>Cada una trae {formatearCantidad(linea.contenido!, linea.unidad)}</span>
          )}
          {linea.ean && <code>{linea.ean}</code>}
        </p>
      )}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center rounded-xl border-[1.5px] border-outline">
          <button
            type="button"
            aria-label={`Menos ${linea.nombre}`}
            disabled={linea.cantidad <= 1}
            onClick={() => alCambiar(linea.cantidad - 1)}
            className="flex h-12 w-12 items-center justify-center text-title-lg text-on-surface disabled:opacity-40"
          >
            <Icono nombre="remove" className="text-[22px]" />
          </button>
          <span className="min-w-10 text-center text-body-lg font-bold text-on-surface">
            {formatearNumero(linea.cantidad)}
          </span>
          <button
            type="button"
            aria-label={`Más ${linea.nombre}`}
            onClick={() => alCambiar(linea.cantidad + 1)}
            className="flex h-12 w-12 items-center justify-center text-on-surface"
          >
            <Icono nombre="add" className="text-[22px]" />
          </button>
        </div>
        <span className="text-body-md text-on-surface-variant">
          {conPresentacion ? (
            <>= {formatearCantidad(cantidadBase(linea), linea.unidad)}</>
          ) : (
            SIMBOLO_UNIDAD[linea.unidad]
          )}
        </span>
      </div>
      {linea.perecedero && (
        <label className="flex flex-col gap-space-2xs text-label-md text-on-surface-variant">
          Vence (opcional)
          <input
            type="date"
            value={linea.venceEn}
            onChange={(e) => alVencer(e.target.value)}
            className="min-h-[48px] rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-md text-body-lg text-on-surface"
          />
        </label>
      )}
    </li>
  );
}

/** El cuerpo de un paso. Al cambiar de paso el botón tocado desaparece, así que el foco
 *  pasa a este contenedor: el lector de pantalla anuncia el paso nuevo por su nombre. */
function ContenidoPaso({ paso, children }: { paso: 1 | 2 | 3; children: ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const anterior = useRef(paso);
  useEffect(() => {
    if (anterior.current !== paso) caja.current?.focus();
    anterior.current = paso;
  }, [paso]);
  return (
    <div
      ref={caja}
      role="region"
      tabIndex={-1}
      aria-label={`Paso ${paso} de 3: ${NOMBRES_PASOS[paso - 1]}`}
      className="flex flex-col gap-space-md outline-none"
    >
      {children}
    </div>
  );
}

/** P9: preparar una donación en tres pasos con estado local; recargar empieza de nuevo.
 *  Pasos 2 y 3 en PasoEntrega y PasoFolio. Diseño: docs/03-diseno/stitch/P09-preparar. */
export function Preparar() {
  const [estado, enviar] = useReducer(reducir, estadoInicial);
  const [q, fijarQ] = useState('');
  const preparadas = useMisDonaciones('PREPARADO');
  const folioPedido = useSearchParams()[0].get('folio');
  const [creada, fijarCreada] = useState<{ donacion: Donacion; fallo: FalloFactura | null } | null>(
    null,
  );

  const elegir = (c: ResultadoBusqueda, leido?: { ean: string; contenido: number | null }) => {
    enviar({ tipo: 'agregar', categoria: c, leido });
    fijarQ('');
  };

  let cuerpo;
  let paso = estado.paso;
  if (creada) {
    paso = 3;
    cuerpo = (
      <PasoFolio donacion={creada.donacion} archivo={estado.factura} falloInicial={creada.fallo} />
    );
  } else if (folioPedido) {
    paso = 3;
    const abierta = preparadas.data?.find((d) => d.folio === folioPedido);
    if (preparadas.isPending) {
      cuerpo = <Esqueleto etiqueta="Cargando" className="h-32" />;
    } else if (preparadas.isError) {
      cuerpo = (
        <EstadoError
          mensaje="No pudimos cargar tu donación."
          alReintentar={() => void preparadas.refetch()}
        />
      );
    } else if (abierta) {
      cuerpo = <PasoFolio donacion={abierta} />;
    } else {
      cuerpo = (
        <div className="flex flex-col gap-space-sm">
          <p role="status" className="text-body-lg text-on-surface">
            No encontramos esa donación entre tus preparadas.
          </p>
          <Link to="/donador" className="font-label-md text-label-md text-primary underline">
            Mis donaciones
          </Link>
        </div>
      );
    }
  } else if (estado.paso === 2) {
    cuerpo = (
      <PasoEntrega
        lineas={estado.lineas}
        acopioId={estado.acopioId}
        factura={estado.factura}
        alElegir={(acopioId) => enviar({ tipo: 'acopio', acopioId })}
        alFactura={(factura) => enviar({ tipo: 'factura', factura })}
        alCrear={(donacion, fallo) => fijarCreada({ donacion, fallo })}
      />
    );
  } else if (preparadas.isPending) {
    cuerpo = <Esqueleto etiqueta="Cargando" className="h-32" />;
  } else if (preparadas.isError) {
    cuerpo = (
      <EstadoError
        mensaje="No pudimos revisar tus donaciones preparadas."
        alReintentar={() => void preparadas.refetch()}
      />
    );
  } else if (preparadas.data.length >= LIMITE_PREPARADAS) {
    cuerpo = (
      <div className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md">
        <p role="status" className="flex gap-space-xs text-body-lg text-on-surface">
          <Icono nombre="info" className="text-[22px]" />
          Ya tienes {LIMITE_PREPARADAS} donaciones preparadas. Entrega o cancela una para preparar
          otra
        </p>
        <EnlaceBoton a="/donador" variante="secundario">
          Mis donaciones
        </EnlaceBoton>
      </div>
    );
  } else {
    cuerpo = (
      <>
        <BuscadorCategoria
          id="buscar-donacion"
          q={q}
          onQ={fijarQ}
          onElegir={elegir}
          resolverCodigo={resolverCodigo}
        />
        {estado.lineas.length > 0 && (
          <ul aria-label="Lo que llevas" className="flex flex-col gap-space-sm">
            {estado.lineas.map((l) => (
              <LineaDonacion
                key={l.id}
                linea={l}
                alCambiar={(cantidad) => enviar({ tipo: 'cantidad', id: l.id, cantidad })}
                alVencer={(venceEn) => enviar({ tipo: 'vence', id: l.id, venceEn })}
                alQuitar={() => enviar({ tipo: 'quitar', id: l.id })}
              />
            ))}
          </ul>
        )}
        <Boton
          disabled={estado.lineas.length === 0}
          onClick={() => enviar({ tipo: 'paso', paso: 2 })}
        >
          Siguiente: dónde entregar
        </Boton>
      </>
    );
  }

  return (
    <section className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Preparar donación</h1>
      {paso === 2 && (
        <button
          type="button"
          aria-label="Volver"
          onClick={() => enviar({ tipo: 'paso', paso: 1 })}
          className="flex h-12 w-12 items-center justify-center self-start rounded-full text-on-surface"
        >
          <Icono nombre="arrow_back" className="text-[24px]" />
        </button>
      )}
      <BarraPasos paso={paso} />
      <ContenidoPaso paso={paso}>{cuerpo}</ContenidoPaso>
    </section>
  );
}
