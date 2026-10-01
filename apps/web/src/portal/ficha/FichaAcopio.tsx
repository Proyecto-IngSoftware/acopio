import { diaEnBogota, distanciaKm } from '@acopio/shared';
import type { ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAcopio, useNoRecibir, type AcopioPublico } from '../../api/red';
import { DIAS_SEMANA, NOMBRE_DIA } from '../../componentes/EditorHorario';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Icono } from '../../componentes/Icono';
import { TarjetaNoTraigan } from '../../componentes/TarjetaNoTraigan';
import { haceCuanto } from '../../formato';
import { AvisoSinDinero } from '../bloques/AvisoSinDinero';
import { aperturaPublica, km } from '../mapa/TarjetaAcopio';

const BOTON =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-space-xs rounded-xl px-space-md text-label-md';

/** P6 Ficha pública de un acopio (RF-RED-003). */
export function FichaAcopio() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const { data, isPending, error } = useAcopio(id!);
  const cerca = parametros.get('cerca');

  if (isPending) return <Esqueleto etiqueta="Cargando el acopio" className="m-margin h-64" />;
  if (error || !data) {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-lg">
        <h1 className="text-headline-lg-mobile text-on-surface">Este acopio ya no está activo</h1>
        <p className="text-body-md text-on-surface-variant">
          Puede que haya cerrado. En el mapa están los acopios que sí reciben donaciones.
        </p>
        <Link to="/mapa" className={`${BOTON} bg-primary-container text-on-primary`}>
          Ver el mapa de acopios
        </Link>
      </div>
    );
  }
  return <Contenido acopio={data} cerca={cerca} />;
}

function Tarjeta({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: string;
  children: ReactNode;
}) {
  const id = `ficha-${titulo.replace(/\W+/g, '-')}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
    >
      <h2 id={id} className="flex items-center gap-space-xs text-headline-sm text-on-surface">
        <Icono nombre={icono} className="text-[22px] text-primary-container" />
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Contenido({ acopio, cerca }: { acopio: AcopioPublico; cerca: string | null }) {
  const { data: marcas } = useNoRecibir(acopio.id);
  const [lat, lng] = (cerca ?? '').split(',').map(Number);
  const distancia =
    cerca && Number.isFinite(lat) && Number.isFinite(lng)
      ? distanciaKm({ lat: lat!, lng: lng! }, acopio)
      : null;
  const hoy = diaEnBogota(new Date());
  const ultimaMarca = marcas
    ?.map((m) => m.marcadoEn)
    .sort()
    .at(-1);
  const enlace = `${window.location.origin}/acopios/${acopio.id}`;
  const volver = `/mapa${cerca ? `?cerca=${encodeURIComponent(cerca)}` : ''}`;

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Link
        to={volver}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Volver al mapa
      </Link>

      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">{acopio.nombre}</h1>
        <p className="text-body-md text-on-surface-variant">{acopio.entidad.nombre}</p>
        <div className="flex flex-wrap items-center gap-space-xs text-body-sm text-on-surface">
          <EtiquetaEstado estado={acopio.estado} />
          <span>{aperturaPublica(acopio)}</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Datos del acopio actualizados {haceCuanto(acopio.actualizadoEn)}
        </p>
      </div>

      <Tarjeta titulo="Ubicación" icono="location_on">
        <p className="text-body-md text-on-surface">
          {acopio.direccion}
          <br />
          {acopio.municipio}
        </p>
        {distancia !== null && (
          <p className="text-label-md text-primary-container">A {km(distancia)} de ti</p>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${acopio.lat},${acopio.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BOTON} bg-primary-container text-on-primary`}
        >
          <Icono nombre="directions" className="text-[20px]" />
          Cómo llegar
        </a>
      </Tarjeta>

      {marcas && (
        <TarjetaNoTraigan
          items={marcas.map((m) => ({ categoria: m.categoria, hasta: m.hasta }))}
          actualizado={ultimaMarca ? haceCuanto(ultimaMarca) : undefined}
        />
      )}

      <Tarjeta titulo="Horario de atención" icono="schedule">
        <ul className="flex flex-col divide-y divide-outline-variant">
          {DIAS_SEMANA.map((dia) => {
            const tramos = acopio.horario[dia];
            const esHoy = dia === hoy;
            return (
              <li
                key={dia}
                className={`flex items-start justify-between gap-space-sm py-space-xs text-body-md ${esHoy ? '-mx-space-xs rounded-lg bg-primary-fixed px-space-xs font-semibold' : ''}`}
              >
                <span className="text-on-surface">
                  {NOMBRE_DIA[dia]}
                  {esHoy && ' (hoy)'}
                </span>
                <span className="text-right text-on-surface tabular-nums">
                  {tramos.length === 0
                    ? 'Cerrado'
                    : tramos.map((t) => `${t.abre} a ${t.cierra}`).join(' · ')}
                </span>
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      {(acopio.indicacionesAcceso || acopio.telefono) && (
        <Tarjeta titulo="Cómo entrar" icono="door_front">
          {acopio.indicacionesAcceso && (
            <p className="text-body-md text-on-surface">{acopio.indicacionesAcceso}</p>
          )}
          {acopio.telefono && (
            <div className="flex items-center justify-between gap-space-sm">
              <span className="text-body-md text-on-surface tabular-nums">{acopio.telefono}</span>
              <a
                href={`tel:${acopio.telefono.replace(/\s+/g, '')}`}
                className="inline-flex min-h-[48px] items-center gap-space-xs rounded-xl border-[1.5px] border-primary-container px-space-md text-label-md text-primary-container"
              >
                <Icono nombre="call" className="text-[20px]" />
                Llamar
              </a>
            </div>
          )}
        </Tarjeta>
      )}

      <Pronto titulo="Lo que urge" icono="inventory_2" texto="Llega pronto con el inventario." />
      <Pronto titulo="Voluntariado" icono="groups" texto="Llega pronto con los turnos." />

      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${acopio.nombre}: ${enlace}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${BOTON} border-[1.5px] border-primary-container bg-surface-container-lowest text-primary-container`}
      >
        <Icono nombre="share" className="text-[20px]" />
        Compartir por WhatsApp
      </a>

      <AvisoSinDinero />
    </div>
  );
}

function Pronto({ titulo, icono, texto }: { titulo: string; icono: string; texto: string }) {
  return (
    <section className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md">
      <Icono nombre={icono} className="text-[22px] text-on-surface-variant" />
      <div>
        <h2 className="text-label-md text-on-surface">{titulo}</h2>
        <p className="text-body-sm text-on-surface-variant">{texto}</p>
      </div>
    </section>
  );
}
