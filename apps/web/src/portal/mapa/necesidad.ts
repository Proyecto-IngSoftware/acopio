import type { NecesidadAcopio } from '../../api/inventario';
import type { AcopioPublico } from '../../api/red';

export type EstadoMapa = 'falta' | 'sobra' | 'aldia' | 'norecibe';

export interface EtiquetaMapa {
  estado: EstadoMapa;
  texto: string;
}

const LISTA = {
  falta: 'faltan',
  sobra: 'sobran',
  aldia: 'alDia',
  norecibe: 'noRecibe',
} as const;

const PREFIJO = { falta: 'FALTA', sobra: 'DE SOBRA', norecibe: 'NO RECIBE' } as const;

const mayusculas = (t: string) => t.toLocaleUpperCase('es-CO');

const cuenta = (): Record<EstadoMapa, number> => ({ falta: 0, sobra: 0, aldia: 0, norecibe: 0 });

/** Solo los acopios operados y activos muestran etiqueta. */
const muestraEtiqueta = (a: AcopioPublico) => a.estado === 'ACTIVO' && a.tipo === 'OPERADO';

/** Estado de una categoría en un acopio: «no recibe» gana sobre las demás listas. */
export function estadoDeCategoria(
  n: NecesidadAcopio | undefined,
  categoriaId: string,
): EstadoMapa | null {
  if (!n) return null;
  const esta = (lista: { categoriaId: string }[]) =>
    lista.some((x) => x.categoriaId === categoriaId);
  if (esta(n.noRecibe)) return 'norecibe';
  if (esta(n.faltan)) return 'falta';
  if (esta(n.sobran)) return 'sobra';
  if (esta(n.alDia)) return 'aldia';
  return null;
}

/** Falta, sobra y no recibe: tener al menos una categoría en la lista. Al día: nada más que al día. */
export function tieneEstado(n: NecesidadAcopio | undefined, estado: EstadoMapa): boolean {
  if (!n) return false;
  if (estado === 'aldia') {
    return (
      n.alDia.length > 0 &&
      n.faltan.length === 0 &&
      n.sobran.length === 0 &&
      n.noRecibe.length === 0
    );
  }
  return n[LISTA[estado]].length > 0;
}

function textoLista(n: NecesidadAcopio, estado: Exclude<EstadoMapa, 'aldia'>): string {
  const nombres = n[LISTA[estado]]
    .map((x) => x.categoria)
    .sort((a, b) => a.localeCompare(b, 'es-CO'));
  const mas = nombres.length > 1 ? ` +${nombres.length - 1}` : '';
  return `${PREFIJO[estado]}: ${nombres[0]}${mas}`;
}

export function etiquetaAcopio(
  a: AcopioPublico,
  n: NecesidadAcopio | undefined,
  opciones: { categoria?: { id: string; nombre: string }; estado?: Exclude<EstadoMapa, 'aldia'> },
): EtiquetaMapa | null {
  if (!n || !muestraEtiqueta(a)) return null;
  const { categoria, estado: forzado } = opciones;
  if (categoria) {
    const estado = estadoDeCategoria(n, categoria.id);
    if (!estado) return null;
    const nombre = mayusculas(categoria.nombre);
    const texto = {
      falta: `FALTA ${nombre}`,
      sobra: `${nombre} DE SOBRA`,
      aldia: `${nombre} AL DÍA`,
      norecibe: `NO RECIBE ${nombre}`,
    }[estado];
    return { estado, texto };
  }
  let estado: EstadoMapa | null;
  if (forzado) {
    estado = n[LISTA[forzado]].length > 0 ? forzado : null;
  } else if (n.faltan.length > 0) estado = 'falta';
  else if (n.noRecibe.length > 0) estado = 'norecibe';
  else if (n.sobran.length > 0) estado = 'sobra';
  else if (n.alDia.length > 0) estado = 'aldia';
  else estado = null;
  if (!estado) return null;
  if (estado === 'aldia') return { estado, texto: 'AL DÍA' };
  return { estado, texto: textoLista(n, estado) };
}

export function contarEstados(
  acopios: AcopioPublico[],
  porId: Map<string, NecesidadAcopio>,
  categoriaId?: string,
): Record<EstadoMapa, number> & { todos: number } {
  const total = { ...cuenta(), todos: 0 };
  for (const a of acopios) {
    if (!muestraEtiqueta(a)) continue;
    total.todos += 1;
    const n = porId.get(a.id);
    if (categoriaId) {
      const estado = estadoDeCategoria(n, categoriaId);
      if (estado) total[estado] += 1;
      continue;
    }
    for (const estado of ['falta', 'sobra', 'norecibe', 'aldia'] as const) {
      if (tieneEstado(n, estado)) total[estado] += 1;
    }
  }
  return total;
}

export function fraseCategoria(nombre: string, c: Record<EstadoMapa, number>): string {
  const partes: [number, string][] = [
    [c.falta, 'falta en'],
    [c.aldia, 'está al día en'],
    [c.sobra, 'sobra en'],
  ];
  const activas = partes.filter(([k]) => k > 0);
  if (activas.length === 0)
    return `Ningún acopio tiene umbral para ${nombre.toLocaleLowerCase('es-CO')}.`;
  const textos = activas.map(([k, verbo], i) =>
    i === 0 ? `${verbo} ${k} ${k === 1 ? 'acopio' : 'acopios'}` : `${verbo} ${k}`,
  );
  const unidas =
    textos.length === 1
      ? textos[0]
      : `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`;
  return `${nombre}: ${unidas}.`;
}
