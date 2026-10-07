import { useParams } from 'react-router';
import { Encabezado } from '../Encabezado';

/** Recibir una donación por su folio (RF-CMP-002). Diseño: docs/03-diseno/stitch/C04-recibir-folio. */
export function RecibirFolio() {
  const { id } = useParams();
  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Recibir por folio" volverA={`/consola/acopios/${id}/entrada`} />
    </div>
  );
}
