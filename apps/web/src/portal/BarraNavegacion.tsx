import { Link, useLocation } from 'react-router';
import { Icono } from '../componentes/Icono';
import { DESTINOS, seccionDe } from './secciones';

/** Barra fija al pie, al alcance del pulgar. La píldora se desliza a la sección activa. */
export function BarraNavegacion() {
  const activa = seccionDe(useLocation().pathname);
  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 z-50 w-full bg-surface/90 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <div className="relative mx-auto h-20 max-w-md px-margin">
        <div className="relative h-full">
          {activa >= 0 && (
            <span
              aria-hidden="true"
              data-posicion={activa}
              className="absolute top-4 h-8 w-14 rounded-full bg-primary-fixed transition-[left] duration-300 ease-[var(--curva)]"
              style={{ left: `calc(${activa} * 20% + (20% - 3.5rem) / 2)` }}
            />
          )}
          <ul className="relative grid h-full grid-cols-5 items-center">
            {DESTINOS.map(({ a, texto, icono }, i) => {
              const actual = i === activa;
              return (
                <li key={a} className="flex justify-center">
                  <Link
                    to={a}
                    aria-current={actual ? 'page' : undefined}
                    className={`flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-1 text-[0.65rem] transition-colors ${
                      actual
                        ? 'font-bold text-primary-container'
                        : 'font-normal text-on-surface-variant'
                    }`}
                  >
                    <span className="flex h-8 w-14 items-center justify-center">
                      <Icono nombre={icono} relleno={actual} className="text-[24px]" />
                    </span>
                    {texto}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
