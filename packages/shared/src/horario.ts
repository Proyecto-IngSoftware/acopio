/** Días en el orden de `Date.getDay()`: 0 es domingo. */
export const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;
export type Dia = (typeof DIAS)[number];

/** Un tramo de atención en hora de Bogotá, «HH:MM». No cruza la medianoche. */
export interface Tramo {
  abre: string;
  cierra: string;
}
export type Horario = Record<Dia, Tramo[]>;

export const HORARIO_VACIO: Horario = {
  dom: [],
  lun: [],
  mar: [],
  mie: [],
  jue: [],
  vie: [],
  sab: [],
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Mensajes en español, uno por problema. Vacío si el horario sirve. */
export function erroresHorario(h: Horario): string[] {
  const errores: string[] = [];
  for (const dia of DIAS) {
    const validos: Tramo[] = [];
    for (const t of h[dia] ?? []) {
      const mala = [t.abre, t.cierra].find((x) => !HHMM.test(x));
      if (mala !== undefined) {
        errores.push(`${dia}: «${mala}» no es una hora válida (HH:MM, hasta 23:59)`);
      } else if (minutos(t.cierra) <= minutos(t.abre)) {
        errores.push(`${dia}: el tramo ${t.abre}–${t.cierra} cierra antes de abrir`);
      } else {
        validos.push(t);
      }
    }
    const orden = [...validos].sort((a, b) => minutos(a.abre) - minutos(b.abre));
    for (let i = 1; i < orden.length; i++) {
      const [a, b] = [orden[i - 1]!, orden[i]!];
      if (minutos(b.abre) < minutos(a.cierra)) {
        errores.push(`${dia}: los tramos ${a.abre}–${a.cierra} y ${b.abre}–${b.cierra} se cruzan`);
      }
    }
  }
  return errores;
}

const partesBogota = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Bogota',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const DIA_INGLES: Record<string, Dia> = {
  Sun: 'dom',
  Mon: 'lun',
  Tue: 'mar',
  Wed: 'mie',
  Thu: 'jue',
  Fri: 'vie',
  Sat: 'sab',
};

/** ¿Está abierto en ese instante, en hora de Bogotá? Abre incluido, cierra excluido. */
export function abiertoAhora(h: Horario, instante: Date): boolean {
  const partes = Object.fromEntries(
    partesBogota.formatToParts(instante).map((p) => [p.type, p.value]),
  );
  const dia = DIA_INGLES[partes.weekday ?? ''];
  if (!dia) return false;
  const ahora = Number(partes.hour) * 60 + Number(partes.minute);
  return (h[dia] ?? []).some((t) => minutos(t.abre) <= ahora && ahora < minutos(t.cierra));
}
