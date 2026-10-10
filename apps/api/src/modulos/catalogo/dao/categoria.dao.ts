import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `categoria` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class CategoriaDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Lo que hace falta para validar un movimiento. */
  paraMovimiento(id: string, bd: ClienteBd = this.prisma) {
    return bd.categoria.findUnique({
      where: { id },
      select: { id: true, nombre: true, unidad_base: true, perecedero: true, archivada: true },
    });
  }

  buscar(id: string, bd: ClienteBd = this.prisma) {
    return bd.categoria.findUnique({ where: { id } });
  }

  /** Nombre, unidad y si es perecedera, ordenadas por nombre. */
  basicas(ids: string[], bd: ClienteBd = this.prisma) {
    return bd.categoria.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, nombre: true, unidad_base: true, perecedero: true },
      orderBy: { nombre: 'asc' },
    });
  }

  varias(ids: string[], bd: ClienteBd = this.prisma) {
    return bd.categoria.findMany({ where: { id: { in: ids } } });
  }
}
