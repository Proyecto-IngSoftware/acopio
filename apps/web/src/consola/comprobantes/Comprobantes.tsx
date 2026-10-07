import { Encabezado } from '../Encabezado';

/** C8: los comprobantes por conciliar (RF-CMP-003). Diseño: docs/03-diseno/stitch/C08-comprobantes. */
export function Comprobantes() {
  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Comprobantes" />
    </div>
  );
}
