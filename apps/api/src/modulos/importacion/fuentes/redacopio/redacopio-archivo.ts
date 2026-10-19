import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { datosFuente } from '@acopio/shared';
import type { FuenteAcopios } from '../fuente-acopios';
import type { LecturaFuente } from '../tipos';
import { leerHerramientas, leerPortada } from './lector';

const REDACOPIO = datosFuente('redacopio');

/** RedAcopio desde la copia guardada en el repositorio: la base de desarrollo y de pruebas. */
export class RedAcopioArchivo implements FuenteAcopios {
  readonly nombre = 'redacopio';
  readonly etiqueta = REDACOPIO.etiqueta;
  readonly url = REDACOPIO.url!;
  readonly municipio = REDACOPIO.municipio!;
  readonly origen = 'ARCHIVO' as const;

  constructor(private readonly carpeta = join(__dirname, 'copia')) {}

  async leer(): Promise<LecturaFuente> {
    const [portada, herramientas] = await Promise.all([
      readFile(join(this.carpeta, 'portada.html'), 'utf8'),
      readFile(join(this.carpeta, 'herramientas.html'), 'utf8'),
    ]);
    return { puntos: leerPortada(portada), plataformas: leerHerramientas(herramientas) };
  }
}
