import { useParams } from 'react-router';
import { Encabezado } from '../Encabezado';

/** Conciliación de un comprobante (RF-CMP-004 y 005). Diseño: docs/03-diseno/stitch/C08-conciliacion. */
export function Conciliacion() {
  const { folio } = useParams();
  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo={folio!} volverA="/consola/comprobantes" />
    </div>
  );
}
