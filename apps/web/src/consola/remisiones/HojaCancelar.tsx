import { useState } from 'react';
import { ErrorApi } from '../../api/cliente';
import { useCancelar, type Remision } from '../../api/remisiones';
import { Campo } from '../../componentes/Campo';
import { Hoja } from '../../componentes/Hoja';

interface Props {
  remision: Remision;
  alCerrar: () => void;
  alCancelar: (r: Remision) => void;
  alError: (e: ErrorApi) => void;
}

/** Cancelar con motivo (CancelarDto: 10 a 280 caracteres). En tránsito, M-07 devuelve lo
 *  despachado con un ajuste. */
export function HojaCancelar({ remision, alCerrar, alCancelar, alError }: Props) {
  const cancelar = useCancelar(remision.codigo);
  const [motivo, fijarMotivo] = useState('');
  const [corto, fijarCorto] = useState(false);

  function enviar() {
    if (motivo.trim().length < 10) {
      fijarCorto(true);
      return;
    }
    cancelar.mutate(motivo.trim(), {
      onSuccess: alCancelar,
      onError: (e) => {
        if (e instanceof ErrorApi && e.codigo === 'REMISION_ESTADO_INVALIDO') alError(e);
      },
    });
  }

  const otroError =
    cancelar.error && cancelar.error.codigo !== 'REMISION_ESTADO_INVALIDO' ? cancelar.error : null;
  return (
    <Hoja titulo={`Cancelar ${remision.codigo}`} alCerrar={alCerrar}>
      <Campo
        id="cancelar-motivo"
        etiqueta="Motivo"
        ayuda="Al menos 10 caracteres. Queda en la bitácora."
        maxLength={280}
        value={motivo}
        onChange={(e) => {
          fijarMotivo(e.target.value);
          fijarCorto(false);
        }}
      />
      {remision.estado === 'EN_TRANSITO' && (
        <p className="rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface">
          Lo despachado vuelve al inventario del acopio con un ajuste.
        </p>
      )}
      {(corto || otroError) && (
        <p role="alert" className="text-body-sm text-error">
          {corto ? 'Escribe al menos 10 caracteres' : otroError?.message}
        </p>
      )}
      <button
        type="button"
        disabled={cancelar.isPending}
        onClick={enviar}
        className="min-h-[48px] rounded-lg border-[1.5px] border-error bg-surface-container-lowest px-space-lg text-label-md text-error"
      >
        Cancelar remisión
      </button>
    </Hoja>
  );
}
