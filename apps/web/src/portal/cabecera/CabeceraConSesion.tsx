import { useEffect, useRef, useState } from 'react';
import type { UsuarioSesion } from '../../sesion/cliente-auth';
import { iniciales, nombreRol } from '../../sesion/roles';
import { useSalida } from '../../sesion/useSalida';
import { PastillaCola } from '../../sin-conexion/PastillaCola';
import { useCola } from '../../sin-conexion/useCola';
import { useUbicacionActiva } from '../../sesion/ubicacion-activa';
import { CabeceraBase } from './Marca';
import { SelectorUbicacion } from './SelectorUbicacion';

/** Con sesión: marca, conmutador de ubicación y botón con las iniciales, que abre el
 *  menú de la cuenta. */
export function CabeceraConSesion({ usuario }: { usuario: UsuarioSesion }) {
  const { pedirSalida, hoja } = useSalida();
  const { ubicaciones } = useUbicacionActiva();
  // Con la pastilla, a 360 px la marca queda solo con el logo: si no, el botón de la cuenta no cabe
  const { data: cola = [] } = useCola(usuario.id);
  const [abierto, fijarAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) fijarAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  return (
    <CabeceraBase compacta={ubicaciones.length >= 2 || cola.length > 0}>
      <div className="flex min-w-0 items-center gap-space-xs">
        <SelectorUbicacion />
        <PastillaCola />
        <div
          ref={contenedor}
          className="relative shrink-0"
          onKeyDown={(e) => e.key === 'Escape' && fijarAbierto(false)}
        >
          <button
            type="button"
            aria-label={`Cuenta de ${usuario.nombre}`}
            aria-haspopup="menu"
            aria-expanded={abierto}
            onClick={() => fijarAbierto(!abierto)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary shadow-sm"
          >
            {iniciales(usuario.nombre)}
          </button>
          {abierto && (
            <div
              role="menu"
              aria-label="Cuenta"
              className="absolute right-0 mt-space-xs flex w-64 flex-col gap-space-xs rounded-xl bg-surface-container-lowest p-space-sm text-on-surface shadow-lg"
            >
              <div className="p-space-xs">
                <p className="text-label-md font-bold">{usuario.nombre}</p>
                <p className="text-body-sm text-on-surface-variant">{nombreRol(usuario.rol)}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fijarAbierto(false);
                  void pedirSalida();
                }}
                className="flex min-h-[48px] items-center rounded-lg px-space-sm text-left text-label-md text-primary hover:bg-surface-container"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      {hoja}
    </CabeceraBase>
  );
}
