import { useState } from 'react';
import { MOTIVOS_RECHAZO, useRechazar, type MotivoRechazo } from '../../api/comprobantes';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';

const MOTIVOS = Object.entries(MOTIVOS_RECHAZO) as [MotivoRechazo, string][];

/** Rechazar con motivo y nota. Con «Otro» la nota es obligatoria (RF-CMP-005). */
export function HojaRechazo({ folio, alCerrar }: { folio: string; alCerrar: () => void }) {
  const rechazar = useRechazar(folio);
  const [motivo, setMotivo] = useState<MotivoRechazo | null>(null);
  const [nota, setNota] = useState('');
  const listo = motivo !== null && (motivo !== 'OTRO' || nota.trim().length > 0);

  const confirmar = () => {
    if (!motivo) return;
    const texto = nota.trim();
    rechazar.mutate({ motivo, ...(texto ? { nota: texto } : {}) }, { onSuccess: alCerrar });
  };

  return (
    <Hoja titulo={`Rechazar ${folio}`} alCerrar={alCerrar}>
      <fieldset className="flex flex-col">
        <legend className="mb-space-xs text-label-md text-on-surface">Motivo</legend>
        {MOTIVOS.map(([valor, texto]) => (
          <label key={valor} className="flex min-h-[48px] items-center gap-space-sm text-body-md">
            <input
              type="radio"
              name="motivo"
              value={valor}
              checked={motivo === valor}
              onChange={() => setMotivo(valor)}
              className="h-5 w-5 accent-primary-container"
            />
            {texto}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
        {motivo === 'OTRO' ? 'Nota' : 'Nota (opcional)'}
        <textarea
          value={nota}
          maxLength={500}
          rows={3}
          required={motivo === 'OTRO'}
          onChange={(e) => setNota(e.target.value)}
          className="rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-sm text-body-md text-on-surface"
        />
      </label>
      <p className="flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
        <Icono nombre="mail" className="text-[22px] text-on-surface-variant" />
        Le escribimos al Donador con el motivo. Las entradas siguen en el inventario.
      </p>
      {rechazar.error && (
        <p role="alert" className="text-body-sm text-error">
          {rechazar.error.message}
        </p>
      )}
      <button
        type="button"
        disabled={!listo || rechazar.isPending}
        onClick={confirmar}
        className="min-h-[56px] rounded-xl bg-error text-label-md text-on-primary disabled:opacity-60"
      >
        Rechazar comprobante
      </button>
      <button
        type="button"
        onClick={alCerrar}
        className="min-h-[48px] text-label-md text-primary-container"
      >
        Cancelar
      </button>
    </Hoja>
  );
}
