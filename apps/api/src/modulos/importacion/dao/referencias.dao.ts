import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';

/**
 * Lecturas para la carga por CSV (pieza E): el archivo nombra las cosas por su nombre y la
 * base las guarda por id. Cada método devuelve un mapa `nombre en minúsculas → fila`.
 */
@Injectable()
export class ReferenciasDao {
  async entidades(nombres: string[], bd: ClienteBd) {
    const filas = await bd.entidad.findMany({
      where: { nombre: { in: nombres } },
      select: { id: true, nombre: true, verificacion: true },
    });
    return porNombre(filas);
  }

  async emergencias(nombres: string[], bd: ClienteBd) {
    const filas = await bd.emergencia.findMany({
      where: { OR: nombres.map((n) => ({ nombre: { equals: n, mode: 'insensitive' as const } })) },
      select: { id: true, nombre: true, estado: true },
    });
    return porNombre(filas);
  }

  async acopiosOperados(nombres: string[], bd: ClienteBd) {
    const filas = await bd.acopio.findMany({
      where: {
        tipo: 'OPERADO',
        OR: nombres.map((n) => ({ nombre: { equals: n, mode: 'insensitive' as const } })),
      },
      select: { id: true, nombre: true },
    });
    return porNombre(filas);
  }

  async categorias(nombres: string[], bd: ClienteBd) {
    const filas = await bd.categoria.findMany({
      where: { nombre: { in: nombres } },
      select: { id: true, nombre: true, archivada: true },
    });
    return porNombre(filas);
  }
}

const porNombre = <F extends { nombre: string }>(filas: F[]) =>
  new Map(filas.map((f) => [f.nombre.toLocaleLowerCase('es-CO'), f]));

/** La clave de los mapas de `ReferenciasDao`. */
export const clave = (nombre: string) => nombre.trim().toLocaleLowerCase('es-CO');
