import { distanciaKm } from '../distancia.js';
import { PESOS_POR_DEFECTO } from './calculo.js';
import { emparejar, type EntradaMotor } from './emparejar.js';

/**
 * RF-MOT-010 y M-08: un escenario generado con semilla, repartido tres veces (el motor, en
 * partes iguales y al más cercano) para comparar la cobertura entre zonas y lo que se vence.
 * Todo es puro: nada de Date.now() ni Math.random(), así la misma semilla da el mismo informe.
 */

export interface ParametrosSimulacion {
  semilla: number;
  zonas: number;
  acopios: number;
  categorias: number;
  dias: number;
}

export interface ResultadoEstrategia {
  /** Desviación estándar, entre zonas, de la cobertura promedio de cada una. */
  desviacionCobertura: number;
  coberturaPromedio: number;
  /** Lo que se venció en los acopios sobre todo lo que entró. */
  proporcionVencida: number;
  totalEntrado: number;
}

export type Estrategia = 'motor' | 'igualitario' | 'cercania';

export interface InformeSimulacion {
  parametros: ParametrosSimulacion;
  estrategias: Record<Estrategia, ResultadoEstrategia>;
}

/** mulberry32: un generador pequeño y reproducible, en [0, 1). */
export function generador(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Lugar {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
}
interface Categoria {
  id: string;
  porPersonaDia: number;
  perecedera: boolean;
}
interface Llegada {
  dia: number;
  acopioId: string;
  categoriaId: string;
  cantidad: number;
  /** Último día utilizable; null en las no perecederas. */
  vence: number | null;
}
interface Escenario {
  zonas: (Lugar & { poblacion: number })[];
  acopios: Lugar[];
  categorias: Categoria[];
  llegadas: Llegada[];
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r4 = (n: number) => Math.round(n * 10_000) / 10_000;

function generar(p: ParametrosSimulacion): Escenario {
  const azar = generador(p.semilla);
  const entre = (min: number, max: number) => min + azar() * (max - min);
  // Un área parecida a Bogotá y sus alrededores
  const lugar = (prefijo: string, i: number): Lugar => ({
    id: `${prefijo}${i}`,
    nombre: `${prefijo === 'z' ? 'Zona' : 'Acopio'} ${i + 1}`,
    lat: r4(entre(4.45, 4.85)),
    lng: r4(entre(-74.25, -73.95)),
  });
  const zonas = Array.from({ length: p.zonas }, (_, i) => ({
    ...lugar('z', i),
    poblacion: Math.round(entre(100, 2000)),
  }));
  const acopios = Array.from({ length: p.acopios }, (_, i) => lugar('a', i));
  const categorias = Array.from({ length: p.categorias }, (_, i) => ({
    id: `c${i}`,
    porPersonaDia: r3(entre(0.05, 0.6)),
    perecedera: azar() < 0.5,
  }));
  // La oferta total ronda la demanda total, para que repartir bien importe
  const poblacion = zonas.reduce((s, z) => s + z.poblacion, 0);
  const llegadas: Llegada[] = [];
  for (let dia = 0; dia < p.dias; dia++)
    for (const a of acopios)
      for (const c of categorias) {
        if (azar() < 0.5) continue;
        const media = (c.porPersonaDia * poblacion * 2) / p.acopios;
        llegadas.push({
          dia,
          acopioId: a.id,
          categoriaId: c.id,
          cantidad: r3(entre(0.2, 1.8) * media),
          vence: c.perecedera ? dia + Math.round(entre(2, 20)) : null,
        });
      }
  return { zonas, acopios, categorias, llegadas };
}

interface Lote {
  cantidad: number;
  vence: number | null;
}
type Traslado = { acopioId: string; zonaId: string; categoriaId: string; cantidad: number };
type Contexto = {
  e: Escenario;
  dia: number;
  movible: (a: string, c: string) => number;
  proximo: (a: string, c: string) => number | null;
  deficit: (z: string, c: string) => number;
};

const clave = (x: string, y: string) => `${x}:${y}`;

function repartirMotor(x: Contexto): Traslado[] {
  const entrada: EntradaMotor = {
    zonas: x.e.zonas,
    acopios: x.e.acopios,
    categorias: x.e.categorias.map((c) => ({ id: c.id, nombre: c.id, unidad: 'KILOGRAMO' })),
    demandas: x.e.zonas.flatMap((z) =>
      x.e.categorias.map((c) => ({
        zonaId: z.id,
        categoriaId: c.id,
        necesidad: x.deficit(z.id, c.id),
        recibido: 0,
        enCamino: 0,
      })),
    ),
    ofertas: x.e.acopios.flatMap((a) =>
      x.e.categorias.map((c) => {
        const movible = x.movible(a.id, c.id);
        const vence = x.proximo(a.id, c.id);
        return {
          acopioId: a.id,
          categoriaId: c.id,
          movible,
          superavit: movible,
          noRecibe: false,
          diasParaVencer: vence === null ? null : Math.max(0, vence - x.dia),
        };
      }),
    ),
  };
  return emparejar(entrada, PESOS_POR_DEFECTO, 1).map((s) => ({
    acopioId: s.acopioId,
    zonaId: s.zonaId,
    categoriaId: s.categoriaId,
    cantidad: s.cantidad,
  }));
}

/** Cada acopio divide su movible en partes iguales entre las zonas con déficit. */
function repartirIgualitario(x: Contexto): Traslado[] {
  const traslados: Traslado[] = [];
  const pendiente = new Map<string, number>();
  for (const z of x.e.zonas)
    for (const c of x.e.categorias) pendiente.set(clave(z.id, c.id), x.deficit(z.id, c.id));
  for (const c of x.e.categorias)
    for (const a of x.e.acopios) {
      let movible = x.movible(a.id, c.id);
      const conDeficit = x.e.zonas.filter((z) => pendiente.get(clave(z.id, c.id))! > 0);
      if (movible <= 0 || conDeficit.length === 0) continue;
      const parte = movible / conDeficit.length;
      for (const z of conDeficit) {
        const k = clave(z.id, c.id);
        const cantidad = r3(Math.min(parte, pendiente.get(k)!, movible));
        if (cantidad <= 0) continue;
        traslados.push({ acopioId: a.id, zonaId: z.id, categoriaId: c.id, cantidad });
        pendiente.set(k, pendiente.get(k)! - cantidad);
        movible -= cantidad;
      }
    }
  return traslados;
}

/** Cada zona pide al acopio más cercano que tenga, y sigue con el siguiente. */
function repartirCercania(x: Contexto): Traslado[] {
  const traslados: Traslado[] = [];
  const queda = new Map<string, number>();
  for (const a of x.e.acopios)
    for (const c of x.e.categorias) queda.set(clave(a.id, c.id), x.movible(a.id, c.id));
  for (const z of x.e.zonas) {
    const cercanos = [...x.e.acopios].sort(
      (p, q) => distanciaKm(p, z) - distanciaKm(q, z) || p.id.localeCompare(q.id),
    );
    for (const c of x.e.categorias) {
      let falta = x.deficit(z.id, c.id);
      for (const a of cercanos) {
        if (falta <= 0) break;
        const k = clave(a.id, c.id);
        const cantidad = r3(Math.min(falta, queda.get(k)!));
        if (cantidad <= 0) continue;
        traslados.push({ acopioId: a.id, zonaId: z.id, categoriaId: c.id, cantidad });
        queda.set(k, queda.get(k)! - cantidad);
        falta -= cantidad;
      }
    }
  }
  return traslados;
}

const REPARTOS: Record<Estrategia, (x: Contexto) => Traslado[]> = {
  motor: repartirMotor,
  igualitario: repartirIgualitario,
  cercania: repartirCercania,
};

function correr(e: Escenario, dias: number, repartir: (x: Contexto) => Traslado[]) {
  const lotes = new Map<string, Lote[]>();
  const enZona = new Map<string, number>();
  const cobertura = new Map(e.zonas.map((z) => [z.id, [] as number[]]));
  let entrado = 0;
  let vencido = 0;
  const necesidadDia = (z: { poblacion: number }, c: Categoria) => z.poblacion * c.porPersonaDia;

  for (let dia = 0; dia < dias; dia++) {
    for (const l of e.llegadas.filter((x) => x.dia === dia)) {
      const k = clave(l.acopioId, l.categoriaId);
      lotes.set(k, [...(lotes.get(k) ?? []), { cantidad: l.cantidad, vence: l.vence }]);
      entrado += l.cantidad;
    }
    // Lo que pasó su fecha se pierde en el acopio
    for (const [k, ls] of lotes) {
      const vivos = ls.filter((l) => l.vence === null || l.vence >= dia);
      vencido += ls.filter((l) => !vivos.includes(l)).reduce((s, l) => s + l.cantidad, 0);
      lotes.set(k, vivos);
    }
    const contexto: Contexto = {
      e,
      dia,
      movible: (a, c) => r3((lotes.get(clave(a, c)) ?? []).reduce((s, l) => s + l.cantidad, 0)),
      proximo: (a, c) => {
        const fechas = (lotes.get(clave(a, c)) ?? [])
          .map((l) => l.vence)
          .filter((v): v is number => v !== null);
        return fechas.length ? Math.min(...fechas) : null;
      },
      deficit: (z, c) => {
        const zona = e.zonas.find((x) => x.id === z)!;
        const cat = e.categorias.find((x) => x.id === c)!;
        return r3(Math.max(0, necesidadDia(zona, cat) - (enZona.get(clave(z, c)) ?? 0)));
      },
    };
    for (const t of repartir(contexto)) {
      // Sale primero lo que vence antes
      const ls = (lotes.get(clave(t.acopioId, t.categoriaId)) ?? []).sort(
        (p, q) => (p.vence ?? Infinity) - (q.vence ?? Infinity),
      );
      let falta = t.cantidad;
      for (const l of ls) {
        const toma = Math.min(l.cantidad, falta);
        l.cantidad = r3(l.cantidad - toma);
        falta = r3(falta - toma);
        if (falta <= 0) break;
      }
      const enviado = r3(t.cantidad - falta);
      lotes.set(
        clave(t.acopioId, t.categoriaId),
        ls.filter((l) => l.cantidad > 0),
      );
      const kz = clave(t.zonaId, t.categoriaId);
      enZona.set(kz, r3((enZona.get(kz) ?? 0) + enviado));
    }
    // Cada zona consume lo del día y anota qué parte cubrió
    for (const z of e.zonas)
      for (const c of e.categorias) {
        const k = clave(z.id, c.id);
        const necesidad = necesidadDia(z, c);
        const hay = enZona.get(k) ?? 0;
        cobertura.get(z.id)!.push(necesidad > 0 ? Math.min(1, hay / necesidad) : 1);
        enZona.set(k, r3(Math.max(0, hay - necesidad)));
      }
  }

  const promedios = e.zonas.map((z) => {
    const v = cobertura.get(z.id)!;
    return v.reduce((s, x) => s + x, 0) / v.length;
  });
  const media = promedios.reduce((s, x) => s + x, 0) / promedios.length;
  const varianza = promedios.reduce((s, x) => s + (x - media) ** 2, 0) / promedios.length;
  return {
    desviacionCobertura: r4(Math.sqrt(varianza)),
    coberturaPromedio: r4(media),
    proporcionVencida: r4(entrado > 0 ? vencido / entrado : 0),
    totalEntrado: r3(entrado),
  };
}

export function simular(p: ParametrosSimulacion): InformeSimulacion {
  const escenario = generar(p);
  const estrategias = Object.fromEntries(
    (Object.keys(REPARTOS) as Estrategia[]).map((nombre) => [
      nombre,
      correr(escenario, p.dias, REPARTOS[nombre]),
    ]),
  ) as Record<Estrategia, ResultadoEstrategia>;
  return { parametros: p, estrategias };
}
