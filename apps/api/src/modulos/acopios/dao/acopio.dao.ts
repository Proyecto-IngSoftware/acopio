import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `acopio` que necesitan otros módulos (ADR-0019). */
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
}
