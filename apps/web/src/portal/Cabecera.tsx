import { Link } from 'react-router';
import { Icono } from '../componentes/Icono';

/** Cabecera del portal, como la de Stitch. Sin el indicador «Sincronizado»: el portal
 *  no sincroniza nada y afirmaría algo falso. */
export function Cabecera() {
  return (
    <header className="fixed top-0 z-50 w-full bg-surface/90 pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-md items-center justify-between px-margin">
        <Link to="/" className="flex items-center gap-space-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container">
            <Icono nombre="inventory_2" className="text-[22px] text-on-primary" />
          </span>
          <span className="flex items-center gap-space-xs">
            <span className="text-headline-sm font-bold tracking-tight text-on-surface">
              Acopio
            </span>
            <span className="rounded bg-primary-fixed px-1 py-0.5 text-label-caps text-primary-container">
              CO
            </span>
          </span>
        </Link>
        <Link
          to="/entrar"
          className="flex min-h-[44px] items-center justify-center rounded-xl bg-surface-container-high px-space-md py-space-xs text-label-md text-primary"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
