import { Link } from 'react-router';
import type { JornadaPublica } from '../../api/turnos';
import { rangoHoras } from '../../formato';
import { Dato, EstadoCupos, Marca, NOMBRE_PERFIL, marcaJornada } from './piezas';

/** Una jornada en P7. Toda la tarjeta abre la jornada; las llenas y cerradas se ven marcadas. */
export function TarjetaJornada({ jornada }: { jornada: JornadaPublica }) {
  const marca = marcaJornada(jornada);
  return (
    <Link
      to={`/voluntariado/${jornada.id}`}
      className={`flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md ${
        marca ? 'opacity-80' : ''
      }`}
    >
      {(marca || jornada.perfilRequerido) && (
        <span className="flex flex-wrap gap-space-xs">
          {marca && <Marca>{marca}</Marca>}
          {jornada.perfilRequerido && (
            <Marca tono="marca">{NOMBRE_PERFIL[jornada.perfilRequerido]}</Marca>
          )}
        </span>
      )}
      <h3 className="text-headline-sm text-on-surface">{jornada.titulo}</h3>
      <Dato
        icono={jornada.lugar.tipo === 'ENTIDAD' ? 'verified' : 'warehouse'}
        relleno={jornada.lugar.tipo === 'ENTIDAD'}
      >
        {jornada.lugar.nombre} · {jornada.lugar.municipio}
      </Dato>
      <Dato icono="schedule">{rangoHoras(jornada.inicio, jornada.fin)}</Dato>
      <EstadoCupos jornada={jornada} />
      {!marca && (
        <span className="flex min-h-[48px] items-center justify-center rounded-xl bg-primary-container text-label-md text-on-primary">
          Reservar cupo
        </span>
      )}
    </Link>
  );
}
