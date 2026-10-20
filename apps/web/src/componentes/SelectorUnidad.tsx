import { SIMBOLO_UNIDAD, UNIDADES_DE_ENTRADA, type UnidadBase } from '@acopio/shared';
import { Segmentado } from './Segmentado';

interface Props {
  unidad: UnidadBase;
  /** Factor hacia la unidad base de la opción elegida: 1 para kg y L, 0,001 para g y ml. */
  factor: number;
  alCambiar: (factor: number) => void;
}

/** Elige en qué unidad se escribe una cantidad (kg o g, L o ml). En `UNIDAD` muestra el símbolo
 *  sin opciones. La API y el saldo siguen en unidad base: quien llama convierte con
 *  `leerCantidad`. Botones de 48 px, para tocar con guantes. */
export function SelectorUnidad({ unidad, factor, alCambiar }: Props) {
  const opciones = UNIDADES_DE_ENTRADA[unidad];
  if (opciones.length < 2) {
    return (
      <span className="shrink-0 text-headline-sm text-on-surface-variant">
        {SIMBOLO_UNIDAD[unidad]}
      </span>
    );
  }
  const actual = opciones.find((o) => o.factor === factor) ?? opciones[0]!;
  return (
    <div className="w-28 shrink-0">
      <Segmentado
        etiqueta="Unidad de la cantidad"
        valor={actual.simbolo}
        alCambiar={(simbolo) => alCambiar(opciones.find((o) => o.simbolo === simbolo)!.factor)}
        opciones={opciones.map((o) => ({ valor: o.simbolo, texto: o.simbolo }))}
      />
    </div>
  );
}
