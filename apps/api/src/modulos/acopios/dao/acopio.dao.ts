import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

export const conEntidad = { entidad: { select: { id: true, nombre: true } } } as const;
export type FilaAcopio = Prisma.AcopioGetPayload<{ include: typeof conEntidad }>;

/** Consultas de `acopio` (ADR-0019). */
@Injectable()
export class AcopioDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Los activos, con lo que hace falta para sugerirlos a un Donador. */
  activos() {
    return this.prisma.acopio.findMany({
      where: { estado: 'ACTIVO' },
      select: { id: true, nombre: true, direccion: true, lat: true, lng: true, horario: true },
    });
  }

  /** Los que pueden despachar (ACTIVO y PAUSADO), o los pedidos. */
  paraMotor(bd: ClienteBd, acopioIds?: string[]) {
    return bd.acopio.findMany({
      where: acopioIds ? { id: { in: acopioIds } } : { estado: { in: ['ACTIVO', 'PAUSADO'] } },
      select: { id: true, nombre: true, lat: true, lng: true },
      orderBy: { nombre: 'asc' },
    });
  }

  nombres(ids: string[]) {
    return this.prisma.acopio.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true },
    });
  }

  /** Para el mapa: los que no están cerrados, con su entidad. */
  publicos() {
    return this.prisma.acopio.findMany({
      where: { estado: { in: ['ACTIVO', 'PAUSADO'] } },
      include: conEntidad,
      orderBy: { nombre: 'asc' },
    });
  }

  conEntidad(id: string, bd: ClienteBd = this.prisma) {
    return bd.acopio.findUnique({ where: { id }, include: conEntidad });
  }

  /** Todos (`ids` nulo) o los pedidos, cerrados incluidos. */
  paraGestion(ids: string[] | null) {
    return this.prisma.acopio.findMany({
      where: ids === null ? {} : { id: { in: ids } },
      include: conEntidad,
      orderBy: { nombre: 'asc' },
    });
  }

  /** Acopios cuyo nombre cumple el filtro, para el buscador de ubicaciones. */
  buscar(filtro: Prisma.AcopioWhereInput) {
    return this.prisma.acopio.findMany({ where: filtro, orderBy: { nombre: 'asc' } });
  }

  crear(datos: Prisma.AcopioUncheckedCreateInput, bd: ClienteBd) {
    return bd.acopio.create({ data: datos, include: conEntidad });
  }

  actualizar(id: string, datos: Prisma.AcopioUncheckedUpdateInput, bd: ClienteBd) {
    return bd.acopio.update({ where: { id }, data: datos, include: conEntidad });
  }

  /** Bloquea la fila hasta el fin de la transacción (revisión final del Bloque 1, I-1). */
  async bloquear(id: string, bd: ClienteBd) {
    await bd.$queryRaw`SELECT id FROM acopio WHERE id = ${id}::uuid FOR UPDATE`;
  }

  estado(id: string, bd: ClienteBd = this.prisma) {
    return bd.acopio.findUnique({ where: { id }, select: { estado: true } });
  }
}
