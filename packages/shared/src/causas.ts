/**
 * Reglas puras de las causas (pieza C del Bloque 1): fechas en Bogotá y enlaces oficiales.
 * Las usan la API, para validar, y la web, para limitar el formulario.
 */

export const CATEGORIAS_CAUSA = ['PERSONAS', 'ANIMALES', 'ADULTOS_MAYORES', 'RESCATISTAS'] as const;
export type CategoriaCausa = (typeof CATEGORIAS_CAUSA)[number];

/** Personas desaparecidas no admite causas: solo enlaza a estas entidades (C-07). */
export const ENLACES_DESAPARECIDOS = [
  {
    nombre: 'Unidad de Búsqueda de Personas dadas por Desaparecidas (UBPD)',
    url: 'https://ubpdbusquedadesaparecidos.co',
  },
  { nombre: 'Cruz Roja Colombiana', url: 'https://www.cruzrojacolombiana.org' },
  { nombre: 'Medicina Legal', url: 'https://www.medicinalegal.gov.co' },
] as const;

const MESES_TOPE = 6;
const DIAS_POR_CERRAR = 15;
const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_HORA = 3_600_000;

/** La fecha `AAAA-MM-DD` en Bogotá, que está en UTC−5 todo el año. */
export function hoyBogota(instante: Date): string {
  return new Date(instante.getTime() - 5 * MS_HORA).toISOString().slice(0, 10);
}

/** Suma meses de calendario; si el día no existe en el mes destino, toma el último. */
export function sumarMeses(fecha: string, meses: number): string {
  const [a, m, d] = partes(fecha);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${dos(mes)}-${dos(Math.min(d, ultimo))}`;
}

export function topeCierre(hoy: string): string {
  return sumarMeses(hoy, MESES_TOPE);
}

/** De hoy al tope, ambos incluidos. Las fechas ISO se comparan como texto. */
export function cierreValido(cierraEl: string, hoy: string): boolean {
  return FECHA.test(cierraEl) && cierraEl >= hoy && cierraEl <= topeCierre(hoy);
}

export function porCerrar(cierraEl: string, hoy: string): boolean {
  return cierraEl >= hoy && cierraEl <= sumarDias(hoy, DIAS_POR_CERRAR);
}

/** El enlace de una causa: solo `https`, sin credenciales y con un dominio de verdad. */
export function validarUrlOficial(url: string): { dominio: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) {
    return null;
  }
  return { dominio: sinWww(u.hostname) };
}

export function dominioDe(url: string): string | null {
  try {
    return sinWww(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** El enlace va al sitio de la entidad o a uno de sus subdominios. */
export function mismoDominio(urlOficial: string, sitioWeb: string): boolean {
  const a = dominioDe(urlOficial);
  const b = dominioDe(sitioWeb);
  return a !== null && b !== null && (a === b || a.endsWith(`.${b}`));
}

function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = partes(fecha);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

function partes(fecha: string): [number, number, number] {
  const r = FECHA.exec(fecha);
  if (!r) throw new RangeError(`Fecha inválida: ${fecha}`);
  return [Number(r[1]), Number(r[2]), Number(r[3])];
}

const dos = (n: number) => String(n).padStart(2, '0');
const sinWww = (h: string) => h.toLowerCase().replace(/^www\./, '');
