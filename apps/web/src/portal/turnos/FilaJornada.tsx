import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { JornadaPublica } from '../../api/turnos';
import { Barra } from '../../componentes/Barra';
import { BloqueFecha } from '../../componentes/BloqueFecha';
import { EnlaceBoton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { rangoHoras } from '../../formato';
import { NOMBRE_PERFIL, marcaJornada, textoCuposFila } from './piezas';

interface Props {
  jornada: JornadaPublica;
  className?: string;
  style?: CSSProperties;
}

/** Una jornada en una lista (P1 y P7): la fecha primero y los cupos abajo. El título cubre toda
 *  la fila, así tocar cualquier parte abre la jornada; «Reservar» es un enlace aparte encima. */
export function FilaJornada({ jornada, className = '', style }: Props) {
  const marca = marcaJornada(jornada);
  const ruta = `/voluntariado/${jornada.id}`;
  const pocos = jornada.libres <= 2;
  return (
    <article
      style={style}
      className={`toque relative flex min-h-[72px] items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-sm shadow-sm ${className}`}
    >
      <BloqueFecha fecha={jornada.inicio} apagado={marca !== null} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {jornada.perfilRequerido && (
          <span className="self-start rounded-full bg-primary-fixed px-space-sm py-0.5 text-label-md text-primary">
            {NOMBRE_PERFIL[jornada.perfilRequerido]}
          </span>
        )}
        <h3 className="text-[15px] leading-tight font-bold text-on-surface">
          <Link to={ruta} className="after:absolute after:inset-0 after:rounded-2xl">
            {jornada.titulo}
          </Link>
        </h3>
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono
            nombre={jornada.lugar.tipo === 'ENTIDAD' ? 'verified' : 'warehouse'}
            relleno={jornada.lugar.tipo === 'ENTIDAD'}
            className="text-[15px] text-surface-tint"
          />
          <span className="min-w-0 truncate">
            {jornada.lugar.nombre} · {jornada.lugar.municipio}
          </span>
        </span>
        <span className="text-body-sm text-on-surface-variant tabular-nums">
          {rangoHoras(jornada.inicio, jornada.fin)}
        </span>
        {!marca && (
          <span className="mt-0.5 flex items-center gap-space-xs">
            <Barra
              valor={jornada.cupoMaximo - jornada.libres}
              total={jornada.cupoMaximo}
              etiqueta={`Cupos tomados de ${jornada.titulo}`}
              tono={pocos ? 'aviso' : 'marca'}
              className="w-16 shrink-0"
            />
            <span
              className={`text-[12px] font-semibold whitespace-nowrap tabular-nums ${
                pocos ? 'text-tertiary-container' : 'text-on-surface-variant'
              }`}
            >
              {textoCuposFila(jornada)}
            </span>
          </span>
        )}
      </div>
      {marca ? (
        <span className="shrink-0 rounded-lg bg-surface-container-high px-space-sm py-1.5 text-label-md text-on-surface-variant">
          {marca}
        </span>
      ) : (
        <EnlaceBoton a={ruta} tamano="compacto" className="relative z-10 shrink-0">
          <span aria-hidden="true">Reservar</span>
          <span className="sr-only">Reservar en {jornada.titulo}</span>
        </EnlaceBoton>
      )}
    </article>
  );
}
