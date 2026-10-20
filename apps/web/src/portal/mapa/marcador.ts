import type { AcopioPublico } from '../../api/red';
import type { EstadoMapa, EtiquetaMapa } from './necesidad';

/** Lo que anuncia el lector de pantalla al llegar a un marcador del mapa. */
export const etiquetaMarcador = (a: AcopioPublico) =>
  a.fuente ? `Punto de ${a.fuente.nombre}: ${a.nombre}` : a.nombre;

/** «FALTA: Arroz» se lee «Falta: Arroz» y «FALTAN 18 PERSONAS», «Faltan 18 personas»: solo la parte
 *  en mayúsculas del comienzo baja a minúsculas. Un número cuenta si lo sigue un espacio, así
 *  «AGUA 5L» conserva su «5L». */
export const capitalizar = (t: string) =>
  t.replace(/^(?:[A-ZÁÉÍÓÚÑ ]|\d+(?= ))+/, (m) => m.charAt(0) + m.slice(1).toLowerCase());

const LARGO_PIN = 14;

/** El nombre que cabe en el pin: sin el «Acopio» del comienzo y cortado en una palabra entera. */
export function nombreCorto(nombre: string) {
  const limpio = nombre.replace(/^acopio\s+/i, '').trim();
  if (limpio.length <= LARGO_PIN) return limpio;
  let corto = '';
  for (const palabra of limpio.split(/\s+/)) {
    const siguiente = corto ? `${corto} ${palabra}` : palabra;
    if (siguiente.length > LARGO_PIN - 1) break;
    corto = siguiente;
  }
  return `${corto || limpio.slice(0, LARGO_PIN - 1)}…`;
}

// `rounded-full` del tema de Stitch vale 0.75rem; un círculo o una píldora necesitan el radio entero
const anillo = (elegido: boolean) => (elegido ? 'ring-4 ring-primary' : '');
const icono = (nombre: string) =>
  `<span aria-hidden="true" class="material-symbols-outlined text-[16px]">${nombre}</span>`;
const escapar = (texto: string) =>
  texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** La píldora de Stitch con su sombra debajo; el ancla del marcador es la punta de abajo.
 *  Va con aria-hidden: el lector de pantalla anuncia el title del marcador, no el texto corto. */
function pildora(clases: string, nombreIcono: string, texto: string, elegido: boolean) {
  return `<div aria-hidden="true" class="flex flex-col items-center"><div class="flex items-center gap-1 whitespace-nowrap rounded-[999px] px-2.5 py-1 text-label-sm font-semibold shadow-md ${clases} ${anillo(elegido)}">${icono(nombreIcono)}${escapar(texto)}</div><div class="mt-0.5 h-1.5 w-4 rounded-[999px] bg-on-surface/25 blur-[1px]"></div></div>`;
}

export interface OpcionesPunto {
  /** Clases del círculo: fondo y color del ícono. */
  circulo: string;
  icono: string;
  etiqueta?: { clases: string; icono: string; texto: string } | null;
  elegido: boolean;
  apagado?: boolean;
}

/** Largo máximo de la etiqueta del punto; el title del marcador lleva el texto completo. */
export const LARGO_ETIQUETA = 24;

// Lo que va al final y no se corta: el estado de «ARROZ DE SOBRA» y el «+2» de las demás
const COLA = /(?: (?:DE SOBRA|AL DÍA))?(?: \+\d+)?$/;

/** Acorta la etiqueta a `max` letras: corta la categoría con «…» y deja el final (el estado
 *  que va después de la categoría y el «+N»). */
export function etiquetaCorta(texto: string, max: number) {
  if (texto.length <= max) return texto;
  const cola = COLA.exec(texto)?.[0] ?? '';
  const cabe = Math.max(max - cola.length - 1, 1);
  return `${texto
    .slice(0, texto.length - cola.length)
    .slice(0, cabe)
    .trimEnd()}…${cola}`;
}

// Los números salen de las clases de htmlPunto. El círculo es size-8 (32 px) o size-10 (40 px)
// si está elegido; la etiqueta es h-9 (36 px) y va separada del círculo por gap-1 (4 px).
// El anillo (ring-4) es una sombra: no cambia el alto.
const CIRCULO = { normal: 32, elegido: 40 };
const ALTO_ETIQUETA = 36;
const GAP = 4;

/** Alto del punto en px, para que el ancla del marcador sea la base del círculo. */
export const altoPunto = (elegido: boolean, conEtiqueta: boolean) =>
  (elegido ? CIRCULO.elegido : CIRCULO.normal) + (conEtiqueta ? GAP + ALTO_ETIQUETA : 0);

// La etiqueta mide su borde (2 × 2), el px-2 (2 × 8), el ícono (24: la hoja de Material Symbols
// fija 24 px sobre el text-[16px]), el gap-1 y unos 8 px por letra en la letra de 12 px de Leaflet
const FIJO_ETIQUETA = 4 + 16 + 24 + 4;
const POR_LETRA = 8;

/** Ancho del ícono del marcador: el círculo con su anillo (40 px, 48 elegido) sin etiqueta, y lo
 *  que mida la etiqueta con ella. Sin etiqueta no queda una franja invisible que tape a otros. */
export function anchoPunto(elegido: boolean, texto: string | null) {
  const circulo = elegido ? 48 : 40;
  if (!texto) return circulo;
  const letras = etiquetaCorta(texto, LARGO_ETIQUETA).length;
  return Math.max(circulo, FIJO_ETIQUETA + letras * POR_LETRA);
}

/** Un círculo de 32 px (40 px con anillo si está elegido) con una etiqueta encima, de alto fijo
 *  para que altoPunto coincida. Va con
 *  aria-hidden: el lector de pantalla anuncia el title del marcador. */
export function htmlPunto(o: OpcionesPunto) {
  const etiqueta =
    o.etiqueta && !o.apagado
      ? `<div class="flex h-9 items-center gap-1 whitespace-nowrap rounded-[999px] border-2 border-surface-container-lowest px-2 text-label-sm font-bold shadow-md ${o.etiqueta.clases}">${icono(o.etiqueta.icono)}${escapar(etiquetaCorta(o.etiqueta.texto, LARGO_ETIQUETA))}</div>`
      : '';
  const tamano = o.elegido ? 'size-10' : 'size-8';
  return `<div aria-hidden="true" class="flex flex-col items-center gap-1${o.apagado ? ' opacity-45' : ''}">${etiqueta}<div class="flex ${tamano} items-center justify-center rounded-[999px] border-2 border-surface-container-lowest shadow-md ${o.circulo} ${anillo(o.elegido)}">${icono(o.icono)}</div></div>`;
}

/** Clases e ícono de cada estado: la etiqueta, y el círculo del punto. */
export const ESTILO_ESTADO: Record<EstadoMapa, { clases: string; icono: string; circulo: string }> =
  {
    falta: {
      clases: 'bg-secondary-container text-on-secondary',
      icono: 'priority_high',
      circulo: 'bg-secondary-container text-on-secondary',
    },
    sobra: {
      clases: 'bg-tertiary-container text-on-primary',
      icono: 'inventory_2',
      circulo: 'bg-tertiary-container text-on-primary',
    },
    aldia: {
      clases: 'bg-primary-fixed text-primary',
      icono: 'check',
      circulo: 'bg-primary-container text-on-primary',
    },
    norecibe: {
      clases: 'bg-surface-container-high text-on-surface-variant',
      icono: 'block',
      circulo: 'bg-on-surface-variant text-on-primary',
    },
  };

/** Cada punto se distingue por forma e ícono, no solo por color (RNF-11): el acopio activo es un
 *  círculo `warehouse` con la etiqueta de su estado, el pausado gris con `pause` y el de
 *  RedAcopio blanco con borde y `link`. */
export function htmlMarcador(
  a: AcopioPublico,
  elegido: boolean,
  etiqueta?: EtiquetaMapa | null,
  apagado = false,
) {
  const texto = nombreCorto(a.nombre);
  if (a.tipo === 'REFERENCIADO')
    return pildora(
      'border-2 border-primary-container bg-surface-container-lowest text-primary-container',
      'link',
      texto,
      elegido,
    );
  if (a.estado === 'PAUSADO')
    return pildora(
      'border-2 border-surface-container-lowest bg-outline text-on-primary',
      'pause',
      texto,
      elegido,
    );
  const e = etiqueta ? ESTILO_ESTADO[etiqueta.estado] : null;
  return htmlPunto({
    circulo: e?.circulo ?? 'bg-primary-container text-on-primary',
    icono: 'warehouse',
    etiqueta: etiqueta && e ? { clases: e.clases, icono: e.icono, texto: etiqueta.texto } : null,
    elegido,
    apagado,
  });
}

export type TipoGrupo = 'acopio' | 'referenciado';

/** Los grupos no mezclan tipos: cada tipo tiene su propia capa de agrupación. */
export const tipoDeGrupo = (a: AcopioPublico): TipoGrupo =>
  a.tipo === 'REFERENCIADO' ? 'referenciado' : 'acopio';

/** El círculo de un grupo con su número: verde lleno para Acopio, blanco con borde para RedAcopio. */
export function htmlGrupo(tipo: TipoGrupo, cantidad: number) {
  const clases =
    tipo === 'referenciado'
      ? 'border-2 border-primary-container bg-surface-container-lowest text-primary-container'
      : 'border-2 border-surface-container-lowest bg-primary-container text-on-primary';
  return `<div class="flex size-10 items-center justify-center rounded-[999px] text-label-md font-bold shadow-md ${clases}">${cantidad}</div>`;
}

/** La zona con necesidad: píldora punteada, el mismo trazo de su círculo, con cuánto falta. */
export function htmlZona(faltantes: number, elegida: boolean) {
  return pildora(
    'border-2 border-dashed border-primary-container bg-surface-container-lowest text-primary-container',
    'campaign',
    `${faltantes} ${faltantes === 1 ? 'faltante' : 'faltantes'}`,
    elegida,
  );
}
