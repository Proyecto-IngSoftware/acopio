/** Lo que la API le pide al almacenamiento de objetos (ADR-0012). */
export interface Almacen {
  guardar(clave: string, datos: Buffer, tipo: string): Promise<void>;
  urlFirmada(clave: string, segundos: number): Promise<string>;
  borrar(clave: string): Promise<void>;
  /** Los bytes y el tipo del objeto, para que la API lo sirva (ADR-0017). */
  leer(clave: string): Promise<{ datos: Buffer; tipo: string }>;
}

export const ALMACEN = Symbol('ALMACEN');
