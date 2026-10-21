import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAjustarPoblacion, type FichaZona } from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { diaLargo } from '../../formato';

/** RF-MOT-012: un número nuevo pide fuente y una fecha de estimación nueva. */
export function HojaPoblacion({
  zona,
  alCerrar,
}: {
  zona: FichaZona['zona'];
  alCerrar: () => void;
}) {
  const ajustar = useAjustarPoblacion(zona.id);
  const [personas, fijarPersonas] = useState(String(zona.poblacionEstimada));
  const [fuente, fijarFuente] = useState(zona.poblacionFuente);
  const [fecha, fijarFecha] = useState('');
  const [falta, fijarFalta] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    // «1.500» como se escribe en Colombia; un campo vacío no es cero
    const limpio = personas.trim().replace(/\./g, '');
    const n = limpio === '' ? Number.NaN : Number(limpio);
    if (!Number.isInteger(n) || n < 0) return fijarFalta('Escribe un número entero de personas');
    if (!fuente.trim()) return fijarFalta('Escribe la fuente');
    if (!fecha) return fijarFalta('Escribe la fecha de la estimación');
    fijarFalta(null);
    ajustar.mutate(
      { poblacionEstimada: n, poblacionFuente: fuente.trim(), poblacionFecha: fecha },
      { onSuccess: alCerrar },
    );
  }

  return (
    <Hoja titulo="Ajustar población" alCerrar={alCerrar}>
      <p className="text-body-sm text-on-surface-variant">
        Hoy: {zona.poblacionEstimada.toLocaleString('es-CO')} personas · {zona.poblacionFuente},{' '}
        {diaLargo(zona.poblacionFecha)}
      </p>
      <form className="flex flex-col gap-space-md" onSubmit={enviar} noValidate>
        <Campo
          id="poblacion-personas"
          etiqueta="Personas"
          inputMode="numeric"
          value={personas}
          onChange={(e) => fijarPersonas(e.target.value)}
        />
        <Campo
          id="poblacion-fuente"
          etiqueta="Fuente"
          value={fuente}
          onChange={(e) => fijarFuente(e.target.value)}
        />
        <Campo
          id="poblacion-fecha"
          etiqueta="Fecha de la estimación"
          type="date"
          value={fecha}
          onChange={(e) => fijarFecha(e.target.value)}
        />
        <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
          <Icono nombre="info" className="text-[20px] text-on-surface-variant" />
          Un número nuevo necesita una fecha nueva. La fuente puede ser la misma.
        </p>
        {(falta ?? ajustar.error?.message) && (
          <p role="alert" className="text-body-sm text-error">
            {falta ?? ajustar.error?.message}
          </p>
        )}
        <Boton type="submit" ocupado={ajustar.isPending}>
          Guardar población
        </Boton>
      </form>
    </Hoja>
  );
}
