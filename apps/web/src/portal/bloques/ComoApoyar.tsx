import { Link } from 'react-router';
import { Icono } from '../../componentes/Icono';

const CANALES = [
  { a: '/mapa', texto: 'Donar Productos', icono: 'package_2' },
  { a: '/causas', texto: 'Donar a una Causa', icono: 'assured_workload' },
  { a: '/voluntariado', texto: 'Ser voluntario', icono: 'group_add' },
];

/** Tres canales del mismo peso (RF-HOM-001). */
export function ComoApoyar() {
  return (
    <section aria-labelledby="como-apoyar" className="flex flex-col gap-space-sm">
      <h2 id="como-apoyar" className="px-space-xs text-headline-sm font-bold text-on-surface">
        ¿Cómo apoyar?
      </h2>
      {CANALES.map(({ a, texto, icono }) => (
        <Link
          key={a}
          to={a}
          className="group flex min-h-[56px] items-center justify-between rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-colors active:bg-surface-container"
        >
          <span className="flex items-center gap-space-md">
            <Icono nombre={icono} className="text-[24px] text-primary" />
            <span className="text-label-md font-bold text-on-surface">{texto}</span>
          </span>
          <Icono
            nombre="chevron_right"
            className="text-[20px] text-outline transition-colors group-hover:text-primary"
          />
        </Link>
      ))}
    </section>
  );
}
