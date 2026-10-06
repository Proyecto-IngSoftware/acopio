import type { ReactNode } from 'react';
import { EnlaceBoton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { useSesion } from '../../sesion/Sesion';

/**
 * Salida, conteo y umbrales sin red (O-09): sin conexión una salida podría dejar un saldo
 * negativo que nadie ve hasta sincronizar (V-07). Al Operador le ofrece Entrada rápida,
 * que sí funciona sin red. Diseño: docs/03-diseno/stitch/C04-sin-conexion.
 */
export function NecesitaRed({
  titulo,
  acopioId,
  children,
}: {
  titulo: string;
  acopioId: string;
  children: ReactNode;
}) {
  const { usuario } = useSesion();
  return (
    <section className="flex flex-col items-center gap-space-sm px-space-sm py-space-lg text-center">
      <Icono nombre="wifi_off" className="text-[48px] text-outline" />
      <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
      <p className="max-w-[32ch] text-body-md text-on-surface-variant">{children}</p>
      {usuario?.rol === 'OPERADOR' && (
        <EnlaceBoton a={`/consola/acopios/${acopioId}/entrada`} variante="secundario">
          Ir a Entrada rápida
        </EnlaceBoton>
      )}
    </section>
  );
}
