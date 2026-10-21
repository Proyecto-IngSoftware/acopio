import { Link } from 'react-router';
import { useJornadas } from '../../api/turnos';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import { FilaJornada } from '../turnos/FilaJornada';

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
      {error && (
        <EstadoVacio titulo="Sin jornadas por ahora" ilustracion="calendario">
          No se pudieron cargar las jornadas.
        </EstadoVacio>
      )}
      {data && proximas.length === 0 && (
        <EstadoVacio titulo="Sin jornadas publicadas" ilustracion="calendario">
          Todavía no hay jornadas publicadas. Aquí podrás reservar un cupo.
        </EstadoVacio>
      )}
      {proximas.map((j) => (
        <FilaJornada key={j.id} jornada={j} />
      ))}
      {proximas.length > 0 && (
        <Link
          to="/voluntariado"
          className="toque flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
        >
          Ver todas las jornadas
          <Icono nombre="chevron_right" className="avanza text-[20px]" />
        </Link>
      )}
    </section>
  );
}
