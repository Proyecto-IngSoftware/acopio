import { useState } from 'react';
import { useMarcarAsistencia, type Inscrito, type Perfil } from '../../api/turnos';
import { Icono } from '../../componentes/Icono';
import { NOMBRE_PERFIL } from '../../portal/turnos/piezas';

/** Los inscritos de una jornada, con su contacto para llamarlos y la asistencia. */
export function Inscritos({
  inscritos,
  perfil,
  asistenciaAbierta,
}: {
  inscritos: Inscrito[];
  perfil: Perfil | null;
  asistenciaAbierta: boolean;
}) {
  const marcar = useMarcarAsistencia();
  const [copiado, fijarCopiado] = useState<string | null>(null);

  async function copiar(i: Inscrito) {
    const texto = [i.nombre, i.telefono ?? i.correo].filter(Boolean).join(' ');
    try {
      await navigator.clipboard.writeText(texto);
      fijarCopiado(i.id);
    } catch {
      fijarCopiado(null);
    }
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {!asistenciaAbierta && (
        <p className="text-body-sm text-on-surface-variant">
          La asistencia se marca desde 2 horas antes del inicio hasta 7 días después.
        </p>
      )}
      {marcar.error && (
        <p role="alert" className="text-body-sm text-on-surface">
          {marcar.error.message}
        </p>
      )}
      <ul className="flex flex-col gap-space-sm">
        {inscritos.map((i) => {
          const borrado = i.nombre === null;
          return (
            <li
              key={i.id}
              aria-label={i.nombre ?? `Reserva ${i.codigo}`}
              className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
            >
              <div className="flex items-start justify-between gap-space-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="text-body-md font-semibold text-on-surface">
                    {borrado ? 'Datos borrados (30 días)' : i.nombre}
                  </span>
                  {!borrado && (
                    <span className="break-words text-body-sm text-on-surface-variant">
                      {[i.correo, i.telefono ?? 'sin teléfono'].join(' · ')}
                    </span>
                  )}
                  {perfil && i.perfilDeclarado && (
                    <span className="text-body-sm text-on-surface-variant">
                      Declaró: {NOMBRE_PERFIL[perfil]}
                    </span>
                  )}
                </div>
                {!borrado && (
                  <button
                    type="button"
                    aria-label={`Copiar contacto de ${i.nombre}`}
                    onClick={() => void copiar(i)}
                    className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl bg-surface-container-high px-space-sm text-label-md text-primary"
                  >
                    <Icono nombre="content_copy" className="text-[18px]" />
                    {copiado === i.id ? 'Copiado' : 'Copiar'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-space-xs">
                {(
                  [
                    ['ASISTIO', 'Asistió', 'check'],
                    ['NO_ASISTIO', 'No asistió', 'close'],
                  ] as const
                ).map(([estado, texto, icono]) => (
                  <button
                    key={estado}
                    type="button"
                    aria-pressed={i.estado === estado}
                    disabled={!asistenciaAbierta || marcar.isPending}
                    onClick={() => marcar.mutate({ reservaId: i.id, estado })}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1 toque rounded-xl border text-label-md disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-container-high disabled:text-on-surface-variant ${
                      i.estado === estado
                        ? 'border-primary-container bg-primary-container text-on-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
                    }`}
                  >
                    {i.estado === estado && <Icono nombre={icono} className="text-[18px]" />}
                    {texto}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
