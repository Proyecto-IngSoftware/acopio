import { useState } from 'react';
import { Icono } from '../../componentes/Icono';

/** Buscador de folio de Stitch. Sin el módulo de comprobantes, solo avisa que no está
 *  disponible: no simula un resultado. */
export function RastrearFolio() {
  const [aviso, fijarAviso] = useState(false);
  return (
    <section
      aria-labelledby="rastrear-folio"
      className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-md"
    >
      <div className="flex items-center gap-space-xs">
        <Icono nombre="quick_reference" className="text-[20px] text-primary" />
        <h2 id="rastrear-folio" className="text-label-md font-bold text-on-surface">
          Rastrear Folio de Donación
        </h2>
      </div>
      <form
        className="flex items-center gap-space-xs pt-space-xs"
        onSubmit={(e) => {
          e.preventDefault();
          fijarAviso(true);
        }}
      >
        <input
          id="folio"
          type="text"
          maxLength={16}
          placeholder="ACO-F-0142"
          aria-label="Número de folio"
          className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-surface-container-low px-space-md text-label-md text-on-surface placeholder:text-outline focus:bg-surface-container-lowest"
        />
        <button
          type="submit"
          className="flex min-h-[44px] items-center justify-center gap-space-xs rounded-xl bg-primary-container px-space-md text-label-md font-bold text-on-primary shadow-sm active:bg-primary"
        >
          <Icono nombre="search" className="text-[18px]" />
          Consultar
        </button>
      </form>
      {aviso && (
        <p
          role="status"
          className="rounded-lg bg-surface-container p-space-sm text-body-sm text-on-surface-variant"
        >
          El rastreo por folio todavía no está disponible.
        </p>
      )}
    </section>
  );
}
