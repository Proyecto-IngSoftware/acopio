import { Boton } from './Boton';
import { Icono } from './Icono';

interface Props {
  mensaje: string;
  alReintentar: () => void;
}

/** Qué pasó y qué hacer. */
export function EstadoError({ mensaje, alReintentar }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-md"
    >
      <div className="flex items-center gap-space-xs">
        <Icono nombre="error" className="text-[22px] text-error" />
        <p className="font-label-md text-label-md text-on-surface">{mensaje}</p>
      </div>
      <Boton variante="secundario" onClick={alReintentar}>
        Reintentar
      </Boton>
    </div>
  );
}
