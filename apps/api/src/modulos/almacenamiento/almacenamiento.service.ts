import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ALMACEN, type Almacen } from './almacen';
import { procesarImagen } from './imagenes';

export interface ImagenGuardada {
  clave: string;
  miniatura: string;
  tipo: 'image/webp';
  bytes: number;
}

/** Hoja del grafo: no conoce comprobantes ni remisiones, solo claves e imágenes. */
@Injectable()
export class AlmacenamientoService {
  constructor(@Inject(ALMACEN) private readonly almacen: Almacen) {}

  async guardarImagen(prefijo: string, datos: Buffer): Promise<ImagenGuardada> {
    const { imagen, miniatura } = await procesarImagen(datos);
    const id = randomUUID();
    const clave = `${prefijo}/${id}.webp`;
    const claveMini = `${prefijo}/${id}-mini.webp`;
    await this.almacen.guardar(clave, imagen, 'image/webp');
    try {
      await this.almacen.guardar(claveMini, miniatura, 'image/webp');
    } catch (error) {
      // no dejar el principal huérfano
      await this.almacen.borrar(clave).catch(() => undefined);
      throw error;
    }
    return { clave, miniatura: claveMini, tipo: 'image/webp', bytes: imagen.length };
  }

  /** ADR-0017: la API entrega los bytes y Garage nunca se expone. */
  leerImagen(clave: string): Promise<{ datos: Buffer; tipo: string }> {
    return this.almacen.leer(clave);
  }

  borrar(clave: string) {
    return this.almacen.borrar(clave);
  }
}
