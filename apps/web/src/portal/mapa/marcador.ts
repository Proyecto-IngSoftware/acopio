import type { AcopioPublico } from '../../api/red';

/** Lo que anuncia el lector de pantalla al llegar a un marcador del mapa. */
export const etiquetaMarcador = (a: AcopioPublico) =>
  a.fuente ? `Punto de ${a.fuente.nombre}: ${a.nombre}` : a.nombre;

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

/** Cada punto se distingue por forma e ícono, no solo por color (RNF-11): el acopio verde con
 *  `warehouse`, el pausado gris con `pause` y el de RedAcopio blanco con borde y `link`. */
export function htmlMarcador(a: AcopioPublico, elegido: boolean) {
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
  return pildora(
    'border-2 border-surface-container-lowest bg-primary-container text-on-primary',
    'warehouse',
    texto,
    elegido,
  );
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
