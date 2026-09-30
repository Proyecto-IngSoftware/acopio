import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Cada pantalla empieza arriba: la SPA no reinicia el desplazamiento al navegar. */
export function SubirAlNavegar() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
