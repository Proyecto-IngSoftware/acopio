import { Link } from 'react-router';
import { useJornadas } from '../../api/turnos';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import { TarjetaJornada } from '../turnos/TarjetaJornada';

/** P01: las próximas tres jornadas de voluntariado (RF-TUR-002), con el enlace a P7. */
export function JornadasPortada() {
  const { data, isPending, error } = useJornadas();
  const proximas = (data ?? []).slice(0, 3);
  return (
    <section aria-labelledby="jornadas" className="flex flex-col gap-space-sm">
      <h2 id="jornadas" className="px-space-xs text-headline-sm font-bold text-on-surface">
        Jornadas de voluntariado
      </h2>
      {isPending && <Esqueleto etiqueta="Cargando las jornadas" className="h-32" />}
      {(error || (data && proximas.length === 0)) && (
        <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant">
          <Icono nombre="groups" className="text-[22px] text-primary-container" />
          {error
            ? 'No se pudieron cargar las jornadas.'
            : 'Todavía no hay jornadas publicadas. Aquí podrás reservar un cupo.'}
        </p>
      )}
      {proximas.map((j) => (
        <TarjetaJornada key={j.id} jornada={j} />
      ))}
      {proximas.length > 0 && (
        <Link
          to="/voluntariado"
          className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
        >
          Ver todas las jornadas
          <Icono nombre="chevron_right" className="text-[20px]" />
        </Link>
      )}
    </section>
  );
}
