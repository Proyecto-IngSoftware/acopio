import { useCallback, useState } from 'react';
import { Boton } from '../componentes/Boton';
import { Hoja } from '../componentes/Hoja';
import { listarCola } from '../sin-conexion/cola';
import { useSesion } from './Sesion';

/**
 * «Cerrar sesión» con entradas sin enviar pide confirmar (O-12). Al salir se olvida el
 * usuario recordado, pero la cola se queda en el teléfono y se envía cuando esa misma
 * persona vuelva a entrar. Diseño: docs/03-diseno/stitch/C04-sin-conexion.
 */
export function useSalida() {
  const { usuario, salir } = useSesion();
  const [pendientes, fijarPendientes] = useState(0);

  const pedirSalida = useCallback(async () => {
    const cola = usuario ? await listarCola(usuario.id).catch(() => []) : [];
    if (cola.length === 0) return salir();
    fijarPendientes(cola.length);
  }, [usuario, salir]);

  const cerrar = useCallback(() => fijarPendientes(0), []);
  const una = pendientes === 1;

  const hoja =
    pendientes > 0 ? (
      <Hoja
        titulo={una ? 'Tienes 1 entrada sin enviar' : `Tienes ${pendientes} entradas sin enviar`}
        alCerrar={cerrar}
      >
        <p className="text-body-md text-on-surface-variant">
          {una
            ? 'Si sales, queda guardada en este teléfono y se envía cuando vuelvas a entrar con tu usuario y haya señal. Nadie más la ve ni la envía.'
            : 'Si sales, quedan guardadas en este teléfono y se envían cuando vuelvas a entrar con tu usuario y haya señal. Nadie más las ve ni las envía.'}
        </p>
        <div className="flex flex-col gap-space-sm">
          <Boton className="w-full" onClick={cerrar}>
            Seguir en la consola
          </Boton>
          <Boton
            variante="secundario"
            className="w-full"
            onClick={() => {
              cerrar();
              void salir();
            }}
          >
            Salir de todas formas
          </Boton>
        </div>
      </Hoja>
    ) : null;

  return { pedirSalida, hoja };
}
