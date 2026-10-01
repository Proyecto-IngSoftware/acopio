import { Link, NavLink, useLocation } from 'react-router';
import { Icono } from '../componentes/Icono';

const DESTINOS = [
  { a: '/', texto: 'Inicio', icono: 'home' },
  { a: '/mapa', texto: 'Mapa', icono: 'map' },
  { a: '/causas', texto: 'Causas', icono: 'volunteer_activism' },
  { a: '/voluntariado', texto: 'Voluntariado', icono: 'groups' },
  { a: '/mas', texto: 'Más', icono: 'more_horiz' },
];

/** Barra fija al pie, al alcance del pulgar. */
export function BarraNavegacion() {
  // La consola se abre desde «Más» y la ficha de un acopio desde «Mapa»: esas
  // secciones quedan marcadas aunque la ruta no sea la suya
  const ruta = useLocation().pathname;
  const marcadaPor: Record<string, boolean> = {
    '/mas': ruta.startsWith('/consola'),
    '/mapa': ruta.startsWith('/acopios/'),
  };
  const clases = (activo: boolean) =>
    `flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 px-1 text-[0.65rem] font-bold transition-colors ${
      activo ? 'text-primary-container' : 'font-normal text-on-surface-variant'
    }`;
  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 z-50 w-full bg-surface/90 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex h-20 max-w-md items-center justify-around px-margin">
        {DESTINOS.map(({ a, texto, icono }) => {
          const forzado = marcadaPor[a] ?? false;
          return (
            <li key={a}>
              {forzado ? (
                // NavLink solo marca aria-current cuando la ruta coincide
                <Link to={a} aria-current="page" className={clases(true)}>
                  <Icono nombre={icono} relleno className="text-[24px]" />
                  {texto}
                </Link>
              ) : (
                <NavLink to={a} end={a === '/'} className={({ isActive }) => clases(isActive)}>
                  {({ isActive }) => (
                    <>
                      <Icono nombre={icono} relleno={isActive} className="text-[24px]" />
                      {texto}
                    </>
                  )}
                </NavLink>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
