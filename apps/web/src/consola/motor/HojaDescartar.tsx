import { formatearCantidad } from '@acopio/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useDescartar, type Sugerencia } from '../../api/motor';
import { Campo } from '../../componentes/Campo';
import { Boton } from '../../componentes/Boton';
import { Hoja } from '../../componentes/Hoja';
import { YA_NO_SE_PUEDE } from './HojaAprobar';

const ATAJOS = [
  'La vía está cerrada',
  'El acopio ya comprometió ese insumo',
  'La zona ya recibió por otro lado',
];

/** Descartar pide un motivo de 10 caracteres o más; el par no vuelve en 24 horas. */
export function HojaDescartar({
  sugerencia: s,
  alDescartar,
  alDecidida,
  alCerrar,
}: {
  sugerencia: Sugerencia;
  alDescartar: () => void;
  alDecidida: (codigo: string) => void;
  alCerrar: () => void;
}) {
  const descartar = useDescartar();
  const [motivo, fijarMotivo] = useState('');
  const [corto, fijarCorto] = useState(false);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = motivo.trim();
    if (texto.length < 10) return fijarCorto(true);
    fijarCorto(false);
    descartar.mutate(
      { id: s.id, motivo: texto },
      {
        onSuccess: alDescartar,
        onError: (err) => {
          if (YA_NO_SE_PUEDE.includes(err.codigo)) alDecidida(err.codigo);
        },
      },
    );
  }

  return (
    <Hoja titulo="Descartar traslado" alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface">
        <strong>
          {s.acopio.nombre} → {s.zona.nombre}
        </strong>{' '}
        · {s.categoria.nombre} · {formatearCantidad(s.cantidad, s.categoria.unidad)}
      </p>
      <form className="flex flex-col gap-space-md" onSubmit={enviar} noValidate>
        <div className="flex flex-wrap gap-space-xs">
          {ATAJOS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={motivo === a}
              onClick={() => fijarMotivo(a)}
              className={`min-h-[40px] rounded-full border px-space-sm text-body-sm ${
                motivo === a
                  ? 'border-primary-container text-primary-container'
                  : 'border-outline-variant text-on-surface'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
        <Campo
          id="descartar-motivo"
          etiqueta="Motivo"
          ayuda="Al menos 10 caracteres. Este par no se vuelve a sugerir en 24 horas."
          value={motivo}
          onChange={(e) => fijarMotivo(e.target.value)}
        />
        {(corto || descartar.error) && (
          <p role="alert" className="text-body-sm text-error">
            {corto ? 'Escribe al menos 10 caracteres' : descartar.error?.message}
          </p>
        )}
        <Boton
          type="submit"
          variante="secundario"
          ocupado={descartar.isPending}
          className="border-error! text-error!"
        >
          Descartar
        </Boton>
      </form>
    </Hoja>
  );
}
