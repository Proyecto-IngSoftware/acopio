import { formatearCantidad, formatearNumero, SIMBOLO_UNIDAD } from '@acopio/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCorregirNecesidad, type CategoriaFicha, type FichaZona } from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Hoja } from '../../componentes/Hoja';

/** El cálculo de una categoría y, para el Administrador, su corrección (RF-MOT-002). */
export function HojaCategoria({
  ficha,
  categoria: c,
  puedeCorregir,
  alCerrar,
}: {
  ficha: FichaZona;
  categoria: CategoriaFicha;
  puedeCorregir: boolean;
  alCerrar: () => void;
}) {
  const corregir = useCorregirNecesidad(ficha.zona.id);
  const [cantidad, fijarCantidad] = useState('');
  const [motivo, fijarMotivo] = useState('');
  const [falta, fijarFalta] = useState<string | null>(null);
  const dias = ficha.zona.emergencia.horizonteDias;
  const simbolo = SIMBOLO_UNIDAD[c.unidad];

  function enviar(valor: number | null) {
    if (!motivo.trim()) return fijarFalta('Escribe el motivo');
    if (valor !== null && !(valor > 0)) return fijarFalta('Escribe la cantidad');
    fijarFalta(null);
    corregir.mutate(
      { categoriaId: c.categoriaId, cantidad: valor, motivo: motivo.trim() },
      { onSuccess: alCerrar },
    );
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    enviar(cantidad === '' ? Number.NaN : Number(cantidad.replace(',', '.')));
  }

  return (
    <Hoja titulo={c.categoria} alCerrar={alCerrar}>
      {c.origen === 'CANASTA' && c.cantidadPersonaDia !== null ? (
        <>
          <dl className="divide-y divide-outline-variant rounded-xl border border-outline-variant tabular-nums">
            {[
              [
                `Canasta ${c.fuenteCanasta ?? ''}`.trim(),
                `${formatearCantidad(c.cantidadPersonaDia, c.unidad)} por persona al día`,
              ],
              ['Población', formatearNumero(ficha.zona.poblacionEstimada)],
              ['Horizonte', `${dias} días`],
              ['Necesidad', formatearCantidad(c.necesidad, c.unidad)],
            ].map(([nombre, valor]) => (
              <div
                key={nombre}
                className="flex justify-between gap-space-sm px-space-md py-space-sm"
              >
                <dt className="text-body-md text-on-surface-variant">{nombre}</dt>
                <dd className="text-body-md font-semibold text-on-surface">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-body-sm text-on-surface-variant">
            {formatearCantidad(c.cantidadPersonaDia, c.unidad)} ×{' '}
            {formatearNumero(ficha.zona.poblacionEstimada)} personas × {dias} días.
          </p>
        </>
      ) : c.manual ? (
        <p className="text-body-md text-on-surface">
          Necesidad puesta a mano: {formatearCantidad(c.manual.cantidad, c.unidad)}. «
          {c.manual.motivo}».
        </p>
      ) : (
        <p className="text-body-md text-on-surface-variant">
          Esta categoría no tiene canasta ni corrección: el motor no le calcula necesidad.
        </p>
      )}
      {puedeCorregir && (
        <form className="flex flex-col gap-space-md" onSubmit={alEnviar} noValidate>
          <h3 className="text-label-md text-on-surface">Corregir la necesidad</h3>
          <Campo
            id="necesidad-cantidad"
            etiqueta={`Necesidad para ${dias} días (${simbolo})`}
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => fijarCantidad(e.target.value)}
          />
          <Campo
            id="necesidad-motivo"
            etiqueta="Motivo"
            ayuda="Queda en la ficha con tu nombre y la fecha."
            value={motivo}
            onChange={(e) => fijarMotivo(e.target.value)}
          />
          {(falta ?? corregir.error?.message) && (
            <p role="alert" className="text-body-sm text-error">
              {falta ?? corregir.error?.message}
            </p>
          )}
          <Boton type="submit" ocupado={corregir.isPending}>
            Guardar corrección
          </Boton>
          {c.origen === 'MANUAL' && (
            <Boton variante="terciario" onClick={() => enviar(null)} disabled={corregir.isPending}>
              Volver a la canasta
            </Boton>
          )}
        </form>
      )}
    </Hoja>
  );
}
