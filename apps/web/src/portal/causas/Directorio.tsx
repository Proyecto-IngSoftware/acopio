import { useState } from 'react';
import { Link } from 'react-router';
import { useCausas, type CategoriaCausa } from '../../api/causas';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import {
  AvisoNoRecibeDinero,
  Chips,
  Desaparecidas,
  NOMBRE_CATEGORIA,
  TarjetaCausa,
} from './piezas';
import { OtrasPlataformas } from './OtrasPlataformas';

type Filtro = CategoriaCausa | 'TODAS' | 'DESAPARECIDAS';

/** P3 Directorio de causas (RF-RED-008, HU-02). Solo causas de entidades verificadas; al final,
 *  las otras plataformas que ayudan, aparte y sin sello (pieza E). */
export function Directorio() {
  const [filtro, fijarFiltro] = useState<Filtro>('TODAS');
  const categoria = filtro === 'TODAS' || filtro === 'DESAPARECIDAS' ? undefined : filtro;

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-lg">
      <header className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface">Causas</h1>
        <p className="text-body-md text-on-surface-variant">
          Entidades verificadas por Acopio. Cada causa explica paso a paso cómo donar en su sitio
          oficial.
        </p>
      </header>
      <AvisoNoRecibeDinero>
        Acopio no recibe dinero. Las donaciones se hacen en el sitio oficial de cada entidad.
      </AvisoNoRecibeDinero>
      <Chips activa={filtro} alElegir={fijarFiltro} desaparecidas />
      {filtro === 'DESAPARECIDAS' ? <Desaparecidas /> : <Lista categoria={categoria} />}
      {filtro === 'TODAS' && <OtrasPlataformas />}
      <Link
        to="/causas/atendidas"
        className="flex min-h-[56px] items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest px-space-md py-space-sm"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-primary-container">
          <Icono nombre="inventory" className="text-[22px]" />
        </span>
        <span className="flex flex-col">
          <span className="text-label-md text-on-surface">Causas atendidas</span>
          <span className="text-body-sm text-on-surface-variant">
            Las que ya cerraron, visibles por transparencia
          </span>
        </span>
        <Icono nombre="chevron_right" className="ml-auto text-[22px] text-on-surface-variant" />
      </Link>
    </div>
  );
}

function Lista({ categoria }: { categoria?: CategoriaCausa }) {
  const { data, isPending, error, refetch } = useCausas(categoria);
  if (isPending) return <Esqueleto etiqueta="Cargando las causas" className="h-64" />;
  if (error)
    return (
      <EstadoError
        mensaje="No se pudieron cargar las causas."
        alReintentar={() => void refetch()}
      />
    );
  return (
    <>
      {data.length === 0 ? (
        <EstadoVacio
          titulo={
            categoria
              ? `Aún no hay causas de ${NOMBRE_CATEGORIA[categoria].toLowerCase()}`
              : 'Aún no hay causas'
          }
        >
          Solo se publican causas de entidades que el equipo de Acopio verificó.
        </EstadoVacio>
      ) : (
        data.map((c) => <TarjetaCausa key={c.id} causa={c} />)
      )}
      {!categoria && <Desaparecidas />}
    </>
  );
}
