import type { JornadaPublica } from '../../api/turnos';
import { ESTILO_ESTADO } from '../mapa/marcador';

export type EstadoCupos = 'faltan' | 'cupos' | 'llena';

/** Orden de urgencia en voluntariado: primero donde falta gente, luego donde quedan cupos. */
const URGENCIA: Record<EstadoCupos, number> = { faltan: 0, cupos: 1, llena: 2 };

/** La etiqueta de una jornada en el mapa. Sin estado (`null`) si no acepta reservas por algo
 *  distinto de estar llena: cancelada, cerrada o fuera de plazo. */
export function estadoCupos(j: JornadaPublica): { estado: EstadoCupos; texto: string } | null {
  if (!j.aceptaReservas && j.motivoSinReserva !== 'LLENA') return null;
  if (j.libres <= 0) return { estado: 'llena', texto: 'LLENA' };
  const n = j.libres;
  if (j.ocupados + j.ajuste < j.cupoMaximo / 2)
    return { estado: 'faltan', texto: n === 1 ? 'FALTA 1 PERSONA' : `FALTAN ${n} PERSONAS` };
  return { estado: 'cupos', texto: n === 1 ? 'QUEDA 1 CUPO' : `QUEDAN ${n} CUPOS` };
}

const urgencia = (j: JornadaPublica) => URGENCIA[estadoCupos(j)!.estado];

/** Un grupo por lugar con coordenadas, con sus jornadas que tienen estado de cupos y la más
 *  urgente primero. Los lugares quedan en el orden en que aparecen. */
export function porLugar(jornadas: JornadaPublica[]): GrupoLugar[] {
  const grupos = new Map<string, GrupoLugar>();
  for (const j of jornadas) {
    if (j.lugar.lat === null || j.lugar.lng === null || !estadoCupos(j)) continue;
    const clave = `${j.lugar.tipo}:${j.lugar.id}`;
    const grupo = grupos.get(clave) ?? { lugar: j.lugar, jornadas: [] };
    grupo.jornadas.push(j);
    grupos.set(clave, grupo);
  }
  // sort es estable: entre dos igual de urgentes queda primero la que empieza antes
  return [...grupos.values()].map((g) => ({
    ...g,
    jornadas: g.jornadas.sort((a, b) => urgencia(a) - urgencia(b)),
  }));
}

export interface GrupoLugar {
  lugar: JornadaPublica['lugar'];
  jornadas: JornadaPublica[];
}

/** Los colores de falta, al día y no recibe del mapa de acopios, con su ícono (RNF-11). */
export const ESTILO_CUPOS: Record<EstadoCupos, { clases: string; icono: string; circulo: string }> =
  {
    faltan: { ...ESTILO_ESTADO.falta, icono: 'priority_high' },
    cupos: { ...ESTILO_ESTADO.aldia, icono: 'event_available' },
    llena: { ...ESTILO_ESTADO.norecibe, icono: 'block' },
  };

/** La etiqueta del punto: la jornada más urgente y, si hay más, «+N». */
export function textoPunto(g: GrupoLugar) {
  const e = estadoCupos(g.jornadas[0]!)!;
  const mas = g.jornadas.length - 1;
  return { estado: e.estado, texto: mas > 0 ? `${e.texto} +${mas}` : e.texto };
}
