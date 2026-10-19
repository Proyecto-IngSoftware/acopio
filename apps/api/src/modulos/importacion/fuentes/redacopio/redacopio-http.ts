import { ErrorDominio } from '../../../../comun/errores/error-dominio';
import type { FuenteAcopios } from '../fuente-acopios';
import type { LecturaFuente } from '../tipos';
import { leerHerramientas, leerPortada } from './lector';

/** Identifica a Acopio ante el operador del sitio, con un contacto (P-022). */
export const AGENTE = 'Acopio/1.0 (proyecto académico ETITC; +https://acopio.josephqaz.dev)';
export const TIEMPO_LIMITE_MS = 15_000;
const BASE = 'https://redacopiobogota.com';

/** RedAcopio leído de la página. Apagado por defecto: lo enciende `IMPORTACION_ORIGEN=http`. */
export class RedAcopioHttp implements FuenteAcopios {
  readonly nombre = 'redacopio';
  readonly origen = 'HTTP' as const;

  constructor(private readonly pedir: typeof fetch = fetch) {}

  async leer(): Promise<LecturaFuente> {
    const portada = await this.pagina(`${BASE}/`);
    const herramientas = await this.pagina(`${BASE}/herramientas`);
    return { puntos: leerPortada(portada), plataformas: leerHerramientas(herramientas) };
  }

  private async pagina(url: string): Promise<string> {
    let r: Response;
    try {
      r = await this.pedir(url, {
        headers: { 'user-agent': AGENTE },
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
    } catch (e) {
      throw new ErrorDominio(
        'FORMATO_FUENTE',
        `No se pudo leer ${url}: ${(e as Error).message}`,
        502,
      );
    }
    if (!r.ok) throw new ErrorDominio('FORMATO_FUENTE', `${url} respondió ${r.status}`, 502);
    return r.text();
  }
}
