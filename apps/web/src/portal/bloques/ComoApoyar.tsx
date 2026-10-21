import { Link } from 'react-router';
import { Icono } from '../../componentes/Icono';

const CANALES = [
  {
    a: '/mapa',
    texto: 'Donar productos',
    detalle: 'Busca el acopio más cercano',
    icono: 'package_2',
  },
  {
    a: '/causas',
    texto: 'Donar a una causa',
    detalle: 'Directo en el sitio de la entidad',
    icono: 'assured_workload',
  },
  {
    a: '/voluntariado',
    texto: 'Ser voluntario',
    detalle: 'Reserva un cupo en una jornada',
    icono: 'group_add',
  },
];

/** Tres canales del mismo peso (RF-HOM-001). */
export function ComoApoyar() {
  return (
    <section aria-labelledby="como-apoyar" className="flex flex-col gap-space-sm">
      <h2 id="como-apoyar" className="px-space-xs text-headline-sm font-bold text-on-surface">
        ¿Cómo apoyar?
      </h2>
      {CANALES.map(({ a, texto, detalle, icono }) => (
        <Link
          key={a}
          to={a}
          className="toque flex min-h-[60px] items-center justify-between rounded-[14px] bg-surface-container-lowest px-space-md py-space-sm shadow-sm active:bg-surface-container"
        >
          <span className="flex items-center gap-[14px]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary-container">
              <Icono nombre={icono} className="text-[22px]" />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold text-on-surface">{texto}</span>
              <span className="text-[13px] text-on-surface-variant">{detalle}</span>
            </span>
          </span>
          <Icono nombre="chevron_right" className="avanza text-[20px] text-outline" />
        </Link>
      ))}
    </section>
  );
}
