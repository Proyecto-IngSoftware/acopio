import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { useSesion } from '../../sesion/Sesion';
import { CabeceraBase } from './Marca';

/** Con un Donador: su nombre y «Salir». Sin selector de ubicación ni cola sin enviar,
 *  que son de quien opera un acopio. */
export function CabeceraDonador({ usuario }: { usuario: UsuarioSesion }) {
  const { salir } = useSesion();
  return (
    <CabeceraBase compacta>
      <div className="flex min-w-0 items-center gap-space-sm">
        <span className="min-w-0 truncate text-label-md font-bold text-on-surface">
          {usuario.nombre}
        </span>
        <button
          type="button"
          onClick={() => void salir()}
          className="flex min-h-[44px] shrink-0 items-center rounded-lg px-space-sm text-label-md font-bold text-primary hover:bg-surface-container"
        >
          Salir
        </button>
      </div>
    </CabeceraBase>
  );
}
