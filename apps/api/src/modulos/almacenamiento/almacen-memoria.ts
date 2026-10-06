import type { Almacen } from './almacen';

/** Para las pruebas: CI no levanta Garage. */
export class AlmacenMemoria implements Almacen {
  readonly objetos = new Map<string, { datos: Buffer; tipo: string }>();

  async guardar(clave: string, datos: Buffer, tipo: string) {
    this.objetos.set(clave, { datos, tipo });
  }

  async urlFirmada(clave: string, segundos: number) {
    return `memoria://${clave}?vence=${segundos}`;
  }

  async borrar(clave: string) {
    this.objetos.delete(clave);
  }
}
