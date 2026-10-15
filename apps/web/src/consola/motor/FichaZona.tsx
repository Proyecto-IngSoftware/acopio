import { formatearCantidad, formatearNumero } from '@acopio/shared';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useFichaZona, type CategoriaFicha, type FichaZona as Ficha } from '../../api/motor';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { diaLargo, haceCuanto } from '../../formato';
import { useSesion } from '../../sesion/Sesion';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { BarraCobertura } from './BarraCobertura';
import { HojaCategoria } from './HojaCategoria';
import { HojaPoblacion } from './HojaPoblacion';

const ESTADO_EMERGENCIA: Record<Ficha['zona']['emergencia']['estado'], string> = {
  ACTIVA: 'Activa',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADA: 'Cerrada',
};

const pct = (cobertura: number) => `${Math.round(cobertura * 100)} %`;

/** De menor a mayor cobertura; las que no tienen necesidad, al final. */
function ordenadas(categorias: CategoriaFicha[]) {
  return [...categorias].sort(
    (a, b) => (a.cobertura ?? Number.POSITIVE_INFINITY) - (b.cobertura ?? Number.POSITIVE_INFINITY),
  );
}

/** C10 Ficha de zona (RF-MOT-002, RF-MOT-003). Diseño: docs/03-diseno/stitch/C10-ficha-zona. */
export function FichaZona() {
  const { id = '' } = useParams();
  const enLinea = useEnLinea();
  const { usuario } = useSesion();
  const consulta = useFichaZona(id);
  const ficha = consulta.data?.zona ? consulta.data : undefined;
  const volverA = usuario?.rol === 'ADMIN' ? '/consola/zonas' : '/mas';

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Ficha de zona" volverA={volverA} />
        <NecesitaRed titulo="La ficha de zona necesita conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo={ficha?.zona.nombre ?? 'Ficha de zona'} volverA={volverA} />
      {consulta.isPending && <Esqueleto etiqueta="Cargando la ficha" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {ficha && <Contenido ficha={ficha} administra={usuario?.rol === 'ADMIN'} />}
    </div>
  );
}

function Contenido({ ficha, administra }: { ficha: Ficha; administra: boolean }) {
  const [abierta, fijarAbierta] = useState<CategoriaFicha | null>(null);
  const [poblacion, fijarPoblacion] = useState(false);
  const { zona } = ficha;
  const cerrada = zona.emergencia.estado === 'CERRADA';
  const puedeCorregir = administra && !cerrada;

  return (
    <>
      {cerrada && (
        <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md text-body-md text-on-surface">
          <Icono nombre="info" className="text-[20px] text-primary-container" />
          Esta emergencia está cerrada. La ficha queda en solo lectura.
        </p>
      )}
      <section className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <p className="flex flex-wrap items-center gap-space-sm text-body-sm text-on-surface-variant">
          <span className="rounded-full bg-surface-container px-space-sm py-0.5 text-label-md text-on-surface">
            {ESTADO_EMERGENCIA[zona.emergencia.estado]}
          </span>
          {zona.emergencia.nombre}
        </p>
        <p className="text-body-md text-on-surface-variant">{zona.municipio}</p>
        <p className="flex items-center gap-space-xs text-body-lg font-semibold text-on-surface">
          <Icono nombre="groups" className="text-[20px]" />
          <span>{zona.poblacionEstimada.toLocaleString('es-CO')} personas</span>
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {zona.poblacionFuente} · estimado el {diaLargo(zona.poblacionFecha)}
        </p>
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="event" className="text-[18px]" />
          <span>Horizonte: {zona.emergencia.horizonteDias} días</span>
        </p>
        {puedeCorregir && (
          <button
            type="button"
            className="min-h-[44px] w-fit text-label-md text-primary-container"
            onClick={() => fijarPoblacion(true)}
          >
            Ajustar población
          </button>
        )}
      </section>

      <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <h2 className="text-label-caps uppercase text-on-surface-variant">Cobertura de la zona</h2>
        {ficha.coberturaGlobal === null ? (
          <p className="text-body-md text-on-surface-variant">Sin necesidad calculada</p>
        ) : (
          <>
            <p className="text-display-hero-mobile text-on-surface tabular-nums">
              {pct(ficha.coberturaGlobal)}
            </p>
            <BarraCobertura valor={ficha.coberturaGlobal} etiqueta="Cobertura de la zona" gruesa />
          </>
        )}
        {ficha.categoriaMasBaja && (
          <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
            <Icono nombre="info" className="text-[18px]" />
            <span>
              Lo más bajo:{' '}
              <strong className="text-on-surface">
                {ficha.categoriaMasBaja.categoria} · {pct(ficha.categoriaMasBaja.cobertura)}
              </strong>
            </span>
          </p>
        )}
      </section>

      <div className="flex items-baseline justify-between gap-space-sm">
        <h2 id="por-categoria" className="text-headline-sm text-on-surface">
          Por categoría
        </h2>
        <span className="text-body-sm text-on-surface-variant">De menor a mayor cobertura</span>
      </div>
      <ul aria-labelledby="por-categoria" className="flex flex-col gap-space-sm">
        {ordenadas(ficha.categorias).map((c) => (
          <li key={c.categoriaId}>
            <FilaCategoria categoria={c} alTocar={() => fijarAbierta(c)} />
          </li>
        ))}
      </ul>

      {ficha.reportes.length > 0 && (
        <section aria-labelledby="reportes" className="flex flex-col gap-space-sm">
          <h2
            id="reportes"
            className="flex items-center gap-space-xs text-headline-sm text-on-surface"
          >
            <Icono nombre="campaign" className="text-[22px]" />
            Lo que reporta el Receptor
          </h2>
          {ficha.reportes.map((r, i) => (
            <article
              key={`${r.categoriaId}-${i}`}
              className="flex flex-col gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <p className="flex justify-between gap-space-sm">
                <strong className="text-body-md text-on-surface">{r.categoria}</strong>
                <span className="text-body-sm text-on-surface-variant">
                  {haceCuanto(r.reportadoEn)}
                </span>
              </p>
              <p className="text-body-md italic text-on-surface">
                {r.nota ? `«${r.nota}»` : 'Sin nota'}
              </p>
            </article>
          ))}
        </section>
      )}

      <p className="text-body-sm text-on-surface-variant">
        Recibido cuenta los últimos 7 días. «En camino» son las remisiones despachadas que aún no
        llegan.
      </p>

      {abierta && (
        <HojaCategoria
          ficha={ficha}
          categoria={abierta}
          puedeCorregir={puedeCorregir}
          alCerrar={() => fijarAbierta(null)}
        />
      )}
      {poblacion && <HojaPoblacion zona={zona} alCerrar={() => fijarPoblacion(false)} />}
    </>
  );
}

function FilaCategoria({
  categoria: c,
  alTocar,
}: {
  categoria: CategoriaFicha;
  alTocar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={alTocar}
      className="flex w-full flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left"
    >
      <span className="flex w-full items-center gap-space-sm">
        <span className="text-body-lg font-semibold text-on-surface">{c.categoria}</span>
        <span className="ml-auto text-body-lg font-semibold text-on-surface tabular-nums">
          {c.cobertura === null ? '' : pct(c.cobertura)}
        </span>
        <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
      </span>
      {c.cobertura === null ? (
        <span className="text-body-sm text-on-surface-variant">Sin necesidad calculada</span>
      ) : (
        <>
          <BarraCobertura valor={c.cobertura} etiqueta={`Cobertura de ${c.categoria}`} />
          <span className="text-body-sm text-on-surface-variant tabular-nums">
            Necesita {formatearCantidad(c.necesidad, c.unidad)} · Recibido{' '}
            {formatearNumero(c.recibido)} · En camino {formatearNumero(c.enCamino)} · Faltan{' '}
            {formatearNumero(c.deficit)}
          </span>
        </>
      )}
      <span className="flex w-full items-center gap-space-xs border-t border-outline-variant pt-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre={c.origen === 'MANUAL' ? 'edit_note' : 'menu_book'} className="text-[16px]" />
        {c.origen === 'MANUAL' && c.manual
          ? `Manual · «${c.manual.motivo}» · ${c.manual.puestaPor}, ${diaLargo(c.manual.puestaEn)}`
          : `Canasta ${c.fuenteCanasta ?? ''}`.trim()}
      </span>
    </button>
  );
}
