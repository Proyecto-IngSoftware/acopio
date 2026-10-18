import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import type { JornadaPublica, Perfil } from '../../api/turnos';

export const NOMBRE_PERFIL: Record<Perfil, string> = {
  VETERINARIO: 'Veterinario',
  MEDICO: 'Médico',
  PSICOLOGO: 'Psicólogo',
  CUIDADOR_ADULTO_MAYOR: 'Cuidador de adultos mayores',
  CONDUCTOR_C2: 'Conductor C2',
};

type ConCupos = Pick<
  JornadaPublica,
  'cupoMaximo' | 'ocupados' | 'ajuste' | 'libres' | 'ajusteActualizadoEn' | 'motivoSinReserva'
>;

/** Siempre reservas, nunca personas presentes (RF-TUR-006); el ajuste manual va aparte. */
export const textoCupos = (j: Pick<ConCupos, 'cupoMaximo' | 'ocupados' | 'ajuste'>) =>
  `${j.ocupados} de ${j.cupoMaximo} cupos reservados` +
  (j.ajuste > 0 ? ` · ${j.ajuste} sin reserva` : '');

/** Por qué una jornada no acepta reservas, como lo ve el público; null si las acepta. */
export function marcaJornada(j: Pick<JornadaPublica, 'motivoSinReserva'>): string | null {
  switch (j.motivoSinReserva) {
    case 'LLENA':
      return 'Llena';
    case 'CANCELADA':
      return 'Cancelada';
    case null:
      return null;
    default:
      return 'Reservas cerradas';
  }
}

export function Marca({
  children,
  tono = 'neutro',
}: {
  children: string;
  tono?: 'neutro' | 'marca';
}) {
  return (
    <span
      className={`self-start rounded-full px-space-sm py-0.5 text-label-md ${
        tono === 'marca'
          ? 'bg-primary-fixed text-primary'
          : 'bg-surface-container text-on-surface-variant'
      }`}
    >
      {children}
    </span>
  );
}

/** Cupos reservados de los totales, con barra si quedan libres y la antigüedad del ajuste. */
export function EstadoCupos({ jornada }: { jornada: ConCupos }) {
  const abierta = jornada.motivoSinReserva === null;
  // La barra cuenta lo tomado: reservas y gente sin reserva
  const tomados = jornada.cupoMaximo - jornada.libres;
  const porcentaje = Math.min(100, Math.round((tomados / jornada.cupoMaximo) * 100));
  return (
    <div className="flex flex-col gap-space-xs border-t border-outline-variant pt-space-sm">
      <span className="text-body-md tabular-nums text-on-surface">{textoCupos(jornada)}</span>
      {abierta && (
        <span className="h-2 overflow-hidden rounded-full bg-surface-container" aria-hidden="true">
          <span
            className="block h-full rounded-full bg-primary-container"
            style={{ width: `${porcentaje}%` }}
          />
        </span>
      )}
      {jornada.ajusteActualizadoEn && (
        <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Icono nombre="edit_note" className="text-[16px]" />
          Ajustado {haceCuanto(jornada.ajusteActualizadoEn)}
        </span>
      )}
    </div>
  );
}

/** Una línea con ícono: lugar, hora, qué llevar. */
export function Dato({
  icono,
  children,
  relleno,
}: {
  icono: string;
  children: React.ReactNode;
  relleno?: boolean;
}) {
  return (
    <span className="flex items-start gap-space-sm text-body-md text-on-surface-variant">
      <Icono
        nombre={icono}
        relleno={relleno}
        className="mt-0.5 text-[20px] text-primary-container"
      />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/** Requisitos como texto: «Mayor de 16 años», «Ropa y calzado cerrados», «Trabajo con carga». */
export function requisitos(r: JornadaPublica['requisitos']): string[] {
  return [
    ...(r.edadMinima ? [`Mayor de ${r.edadMinima} años`] : []),
    ...(r.ropaCerrada ? ['Ropa y calzado cerrados'] : []),
    ...(r.carga ? ['Trabajo con carga'] : []),
  ];
}

/** Recuadro de aviso con ícono, título opcional y texto. */
export function Aviso({
  icono,
  titulo,
  children,
}: {
  icono: string;
  titulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
      <Icono nombre={icono} className="mt-0.5 text-[20px] text-primary-container" />
      <span>
        {titulo && <b className="block font-label-md">{titulo}</b>}
        {children}
      </span>
    </div>
  );
}
