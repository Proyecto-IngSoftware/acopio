import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { ENTORNO, type Entorno } from '../../config/entorno';

export interface ResultadoGeo {
  etiqueta: string;
  lat: number;
  lng: number;
}

export interface Geocodificador {
  buscar(q: string): Promise<ResultadoGeo[]>;
}
export const GEOCODIFICADOR = Symbol('GEOCODIFICADOR');

export interface Reloj {
  ahora(): number;
  esperar(ms: number): Promise<void>;
}
export const RELOJ = Symbol('RELOJ');
export const relojReal: Reloj = {
  ahora: () => Date.now(),
  esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
};

const INTERVALO_MS = 1000;
const VIGENCIA_MS = 24 * 60 * 60 * 1000;

/** Cuántas consultas distintas esperan turno y cuántas respuestas se guardan. */
export interface LimitesGeo {
  cola: number;
  cache: number;
}
export const LIMITES_GEO = Symbol('LIMITES_GEO');
const LIMITES_POR_DEFECTO: LimitesGeo = { cola: 10, cache: 500 };

/**
 * Dirección a coordenadas (RF-RED-002). Siempre desde la API, nunca desde el navegador:
 * caché de 24 horas y una consulta por segundo como máximo, como pide Nominatim.
 * La cola y la caché tienen tope, y las consultas iguales que llegan juntas comparten
 * una sola llamada: el endpoint es público (revisión final, I-2).
 */
@Injectable()
export class GeocodificacionService {
  private readonly cache = new Map<string, { en: number; resultados: ResultadoGeo[] }>();
  private readonly enCurso = new Map<string, Promise<ResultadoGeo[]>>();
  private cola: Promise<unknown> = Promise.resolve();
  private ultima = Number.NEGATIVE_INFINITY;

  constructor(
    @Inject(GEOCODIFICADOR) private readonly geocodificador: Geocodificador,
    @Inject(RELOJ) private readonly reloj: Reloj,
    @Optional() @Inject(LIMITES_GEO) private readonly limites: LimitesGeo = LIMITES_POR_DEFECTO,
  ) {}

  async buscar(q: string): Promise<ResultadoGeo[]> {
    const clave = q.trim().toLocaleLowerCase('es-CO').replace(/\s+/g, ' ');
    const guardado = this.cache.get(clave);
    if (guardado && this.reloj.ahora() - guardado.en < VIGENCIA_MS) {
      // Al usarla pasa al final: la que se descarta es la menos usada
      this.cache.delete(clave);
      this.cache.set(clave, guardado);
      return guardado.resultados;
    }
    const pendiente = this.enCurso.get(clave);
    if (pendiente) return pendiente;
    if (this.enCurso.size >= this.limites.cola) throw noDisponible();

    const turno = this.cola.then(async () => {
      const falta = this.ultima + INTERVALO_MS - this.reloj.ahora();
      if (falta > 0) await this.reloj.esperar(falta);
      this.ultima = this.reloj.ahora();
      return this.geocodificador.buscar(clave);
    });
    this.cola = turno.catch(() => undefined);
    this.enCurso.set(clave, turno);
    try {
      const resultados = await turno;
      this.guardar(clave, resultados);
      return resultados;
    } finally {
      this.enCurso.delete(clave);
    }
  }

  private guardar(clave: string, resultados: ResultadoGeo[]) {
    this.cache.delete(clave);
    this.cache.set(clave, { en: this.reloj.ahora(), resultados });
    while (this.cache.size > this.limites.cache) {
      const masVieja = this.cache.keys().next().value;
      if (masVieja === undefined) break;
      this.cache.delete(masVieja);
    }
  }
}

/** Adaptador real: Nominatim de OpenStreetMap, solo Colombia. */
@Injectable()
export class GeocodificadorNominatim implements Geocodificador {
  private readonly log = new Logger(GeocodificadorNominatim.name);

  constructor(@Inject(ENTORNO) private readonly entorno: Entorno) {}

  async buscar(q: string): Promise<ResultadoGeo[]> {
    const url = new URL('/search', this.entorno.NOMINATIM_URL);
    url.search = new URLSearchParams({
      q,
      format: 'jsonv2',
      countrycodes: 'co',
      limit: '5',
    }).toString();
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        headers: {
          'User-Agent': `Acopio/0.1 (${this.entorno.CORREO_REMITENTE})`,
          'Accept-Language': 'es',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.log.warn(`Nominatim no respondió: ${String(error)}`);
      throw noDisponible();
    }
    if (!respuesta.ok) {
      this.log.warn(`Nominatim respondió ${respuesta.status}`);
      throw noDisponible();
    }
    const filas = (await respuesta.json()) as { display_name: string; lat: string; lon: string }[];
    return filas.map((f) => ({ etiqueta: f.display_name, lat: Number(f.lat), lng: Number(f.lon) }));
  }
}

function noDisponible() {
  return new ErrorDominio(
    'GEOCODIFICACION_NO_DISPONIBLE',
    'No pudimos buscar la dirección ahora. Intenta de nuevo o usa «cerca de mí»',
    503,
  );
}

/** Para pruebas: responde siempre lo mismo y cuenta las consultas. CI no sale a internet. */
export class GeocodificadorFalso implements Geocodificador {
  consultas = 0;

  async buscar(q: string): Promise<ResultadoGeo[]> {
    this.consultas += 1;
    if (q.includes('sin resultados')) return [];
    return [{ etiqueta: `Resultado para ${q}`, lat: 4.60971, lng: -74.08175 }];
  }
}
