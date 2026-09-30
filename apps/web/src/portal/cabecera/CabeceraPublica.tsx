import { Link } from 'react-router';
import { CabeceraBase } from './Marca';

/** Portal sin sesión: marca y «Entrar». */
export function CabeceraPublica() {
  return (
    <CabeceraBase>
      <Link
        to="/entrar"
        className="flex min-h-[44px] items-center justify-center rounded-xl bg-surface-container-high px-space-md py-space-xs text-label-md text-primary"
      >
        Entrar
      </Link>
    </CabeceraBase>
  );
}
