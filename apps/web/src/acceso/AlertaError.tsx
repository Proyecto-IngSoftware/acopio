import { Icono } from '../componentes/Icono';

/** Error de un formulario de acceso, como en el diseño de C01. */
export function AlertaError({ mensaje }: { mensaje: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-space-xs rounded-xl border border-error bg-error-container p-space-sm text-body-sm text-on-error-container"
    >
      <Icono nombre="error" className="text-[20px] text-error" />
      {mensaje}
    </p>
  );
}
