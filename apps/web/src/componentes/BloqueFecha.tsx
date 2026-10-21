import { diaSemana, partesFecha } from '../formato';

interface Props {
  fecha: string;
  tamano?: 'fila' | 'detalle';
  /** Evento que ya no admite acción: llena, cerrada, cancelada o pasada. */
  apagado?: boolean;
  hoy?: Date;
}

const TAMANO = {
  fila: { caja: 'h-14 w-[52px]', numero: 'text-[21px]' },
  detalle: { caja: 'h-[68px] w-16', numero: 'text-[26px]' },
};

/** Recuadro de un día de agenda: «jue / 22», o «nov / 2» si está a más de una semana. Solo
 *  para días a los que alguien tiene que ir; las fechas de registro van en texto. */
export function BloqueFecha({ fecha, tamano = 'fila', apagado = false, hoy }: Props) {
  const { semana, dia, mes, lejana } = partesFecha(fecha, hoy);
  const t = TAMANO[tamano];
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl ${t.caja} ${
        apagado
          ? 'bg-surface-container text-on-surface-variant'
          : 'bg-primary-fixed text-on-primary-fixed'
      }`}
    >
      <span aria-hidden="true" className="text-[12px] font-semibold">
        {lejana ? mes : semana}
      </span>
      <span aria-hidden="true" className={`leading-none font-extrabold tabular-nums ${t.numero}`}>
        {dia}
      </span>
      <span className="sr-only">{diaSemana(fecha)}</span>
    </span>
  );
}
