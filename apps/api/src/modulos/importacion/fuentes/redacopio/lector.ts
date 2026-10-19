import { z } from 'zod';
import { ErrorDominio } from '../../../../comun/errores/error-dominio';
import type { PlataformaFuente, PuntoFuente } from '../tipos';

const formato = (motivo: string) => new ErrorDominio('FORMATO_FUENTE', motivo, 502);

/** Un punto tal como lo serializa RedAcopio (I-003). Si cambia, la importación entera aborta. */
const puntoRedAcopio = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  lat: z.number(),
  lng: z.number(),
  status: z.string().min(1),
  verification_status: z.string().min(1),
  hours: z.string().nullish(),
  needs: z.array(z.object({ lvl: z.string(), item: z.string() })).nullish(),
  contact: z.record(z.string(), z.unknown()).nullish(),
  updated_at: z.string().nullish(),
});

/**
 * La portada de RedAcopio es una app de Next.js: los puntos viajan como JSON dentro de los
 * fragmentos `self.__next_f.push([1,"…"])`. Se juntan, se busca el arreglo que contiene
 * `verification_status` y se valida cada punto.
 */
export function leerPortada(html: string): PuntoFuente[] {
  const fragmentos = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)];
  if (!fragmentos.length) throw formato('La portada de RedAcopio no trae los datos de la página');
  const vuelo = fragmentos.map((m) => JSON.parse(m[1]!) as string).join('');
  const marca = vuelo.indexOf('"verification_status"');
  if (marca < 0) throw formato('La portada de RedAcopio no trae la lista de puntos');

  const crudos = arregloQueContiene(vuelo, marca);
  return crudos.map((crudo) => {
    const r = puntoRedAcopio.safeParse(crudo);
    if (!r.success) {
      const id = (crudo as { id?: unknown })?.id;
      const campo = r.error.issues[0]?.path.join('.') ?? '?';
      throw formato(`El punto ${String(id)} de RedAcopio no trae «${campo}» como se esperaba`);
    }
    const p = r.data;
    return {
      fuenteId: p.id,
      nombre: p.name.trim(),
      direccion: p.address.trim(),
      lat: p.lat,
      lng: p.lng,
      estado: p.status,
      horario: p.hours?.trim() || null,
      necesidades: (p.needs ?? []).map((n) => ({ nivel: n.lvl, texto: n.item })),
      contacto: Object.fromEntries(
        Object.entries(p.contact ?? {}).filter(
          (e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== '',
        ),
      ),
      actualizadoEn: p.updated_at ? new Date(p.updated_at) : null,
      verificado: p.verification_status === 'verificado',
    };
  });
}

/** Retrocede desde la marca hasta el `[{` que abre un arreglo de objetos que se pueda leer. */
function arregloQueContiene(vuelo: string, marca: number): unknown[] {
  for (let inicio = vuelo.lastIndexOf('[{', marca); inicio >= 0;) {
    const arreglo = leerJsonDesde(vuelo, inicio);
    if (Array.isArray(arreglo) && arreglo.length && typeof arreglo[0] === 'object') return arreglo;
    inicio = vuelo.lastIndexOf('[{', inicio - 1);
  }
  throw formato('La lista de puntos de RedAcopio no se pudo leer');
}

/** El valor JSON que empieza en `inicio`, o null si ahí no empieza uno completo. */
function leerJsonDesde(texto: string, inicio: number): unknown {
  let nivel = 0;
  let enCadena = false;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (enCadena) {
      if (c === '\\') i++;
      else if (c === '"') enCadena = false;
    } else if (c === '"') enCadena = true;
    else if (c === '[' || c === '{') nivel++;
    else if (c === ']' || c === '}') {
      nivel--;
      if (nivel === 0) {
        try {
          return JSON.parse(texto.slice(inicio, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

const ENTIDADES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};
const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#x27|#39);/g, (e) => ENTIDADES[e] ?? e)
    .trim();

/** Las tarjetas de `/herramientas`: categoría, nombre, descripción y el enlace «Ir al sitio». */
export function leerHerramientas(html: string): PlataformaFuente[] {
  const tarjetas = html.split('<div class="tool-card">').slice(1);
  if (!tarjetas.length) throw formato('La página de herramientas de RedAcopio no trae tarjetas');
  return tarjetas.map((t, i) => {
    const categoria = /<div class="tool-tag">([\s\S]*?)<\/div>/.exec(t)?.[1];
    const nombre = /<h3 class="tool-name">([\s\S]*?)<\/h3>/.exec(t)?.[1];
    const descripcion = /<p class="tool-desc">([\s\S]*?)<\/p>/.exec(t)?.[1];
    const url = /<a [^>]*href="(https?:\/\/[^"]+)"/.exec(t)?.[1];
    if (!categoria || !nombre || !descripcion || !url) {
      throw formato(`La tarjeta ${i + 1} de herramientas de RedAcopio no se pudo leer`);
    }
    return {
      categoria: texto(categoria),
      nombre: texto(nombre),
      descripcion: texto(descripcion),
      url: texto(url),
      orden: i + 1,
    };
  });
}
