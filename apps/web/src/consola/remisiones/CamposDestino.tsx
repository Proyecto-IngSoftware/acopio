import type { ErrorApi } from '../../api/cliente';
import { useAcopiosGestion } from '../../api/red';
import { useZonasVigentes } from '../../api/remisiones';
import { Campo, Selector } from '../../componentes/Campo';

export interface Destino {
  acopioId: string | null;
  /** null: despacho general. */
  zonaId: string | null;
  responsable: string;
}

/** Los errores de la API que se explican junto al selector de destino. */
const ERRORES_ZONA = new Set(['ZONA_SOLO_LECTURA', 'ZONA_NO_ENCONTRADA']);

export const errorDeZona = (e: ErrorApi | null) => (e && ERRORES_ZONA.has(e.codigo) ? e : null);

interface Props {
  valor: Destino;
  alCambiar: (d: Destino) => void;
  /** Solo el Administrador elige el acopio de origen. */
  conAcopio: boolean;
  error: ErrorApi | null;
}

/** C12: de dónde sale, a dónde va y quién lo lleva (I2-05). */
export function CamposDestino({ valor, alCambiar, conAcopio, error }: Props) {
  const acopios = useAcopiosGestion(conAcopio);
  const zonas = useZonasVigentes();
  const deZona = errorDeZona(error);
  return (
    <div className="flex flex-col gap-space-sm">
      {conAcopio && (
        <Selector
          id="acopio-origen"
          etiqueta="Acopio de origen"
          value={valor.acopioId ?? ''}
          onChange={(e) => alCambiar({ ...valor, acopioId: e.target.value || null })}
        >
          <option value="">Elige un acopio</option>
          {acopios.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </Selector>
      )}
      <Selector
        id="destino"
        etiqueta="Destino"
        ayuda={valor.zonaId === null ? 'Sin zona: la toma un Receptor cuando llega.' : undefined}
        value={valor.zonaId ?? ''}
        onChange={(e) => alCambiar({ ...valor, zonaId: e.target.value || null })}
      >
        <option value="">Despacho general</option>
        {zonas.data?.map((z) => (
          <option key={z.id} value={z.id}>
            {z.nombre} · {z.municipio}
          </option>
        ))}
      </Selector>
      {deZona && (
        <p role="alert" className="text-body-sm text-error">
          {deZona.message}
        </p>
      )}
      <Campo
        id="responsable"
        etiqueta="Quién lleva el envío"
        ayuda="Hace falta para despachar."
        maxLength={120}
        value={valor.responsable}
        onChange={(e) => alCambiar({ ...valor, responsable: e.target.value })}
      />
    </div>
  );
}
