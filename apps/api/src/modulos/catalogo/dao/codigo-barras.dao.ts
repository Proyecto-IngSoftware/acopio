import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `codigo_barras` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class CodigoBarrasDao {
  constructor(private readonly prisma: PrismaService) {}

  buscar(ean: string, bd: ClienteBd = this.prisma) {
    return bd.codigoBarras.findUnique({ where: { ean } });
  }

  /** Con lo que el escáner del Donador muestra de la categoría. */
  conCategoria(ean: string, bd: ClienteBd = this.prisma) {
    return bd.codigoBarras.findUnique({
      where: { ean },
      include: {
        categoria: {
          select: {
            nombre: true,
            unidad_base: true,
            perecedero: true,
            grupo: true,
            archivada: true,
          },
        },
      },
    });
  }
}
