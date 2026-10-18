import { useState } from 'react';
import { Link } from 'react-router';
import { useCausasAtendidas, type CategoriaCausa } from '../../api/causas';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import { Chips, TarjetaCausa } from './piezas';

/** Causas atendidas: las archivadas, en pantalla aparte (C-06, RF-RED-010). */
export function Atendidas() {
  const [filtro, fijarFiltro] = useState<CategoriaCausa | 'TODAS'>('TODAS');
  const { data, isPending, error, refetch } = useCausasAtendidas(
    filtro === 'TODAS' ? undefined : filtro,
  );

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-lg">
      <Link
        to="/causas"
        className="flex min-h-[44px] items-center gap-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[22px]" />
        Causas
      </Link>
      <header className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile text-on-surface">Causas atendidas</h1>
        <p className="text-body-md text-on-surface-variant">
          Causas que ya cerraron, porque terminó su plazo o porque Acopio las archivó. Siguen aquí
          para que cualquiera pueda revisar a quién se dirigió la ayuda.
        </p>
      </header>
      <Chips
        activa={filtro}
        alElegir={(c) => c !== 'DESAPARECIDAS' && fijarFiltro(c)}
        desaparecidas={false}
      />
      {isPending ? (
        <Esqueleto etiqueta="Cargando las causas atendidas" className="h-64" />
      ) : error ? (
        <EstadoError
          mensaje="No se pudieron cargar las causas atendidas."
          alReintentar={() => void refetch()}
        />
      ) : data.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay causas atendidas">
          Aquí aparecen las causas cuando cierran.
        </EstadoVacio>
      ) : (
        data.map((c) => <TarjetaCausa key={c.id} causa={c} />)
      )}
    </div>
  );
}
