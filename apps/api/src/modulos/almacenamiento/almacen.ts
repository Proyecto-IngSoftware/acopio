/** Lo que la API le pide al almacenamiento de objetos (ADR-0012). */
export interface Almacen {
  guardar(clave: string, datos: Buffer, tipo: string): Promise<void>;
  urlFirmada(clave: string, segundos: number): Promise<string>;
  borrar(clave: string): Promise<void>;
}

export const ALMACEN = Symbol('ALMACEN');
