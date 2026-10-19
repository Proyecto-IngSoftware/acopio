import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

const conCategoria = {
  categoria: {
    select: { nombre: true, unidad_base: true, archivada: true, grupo: true, perecedero: true },
  },
} as const;

/** Consultas de `codigo_barras` (ADR-0019). */
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

  listar(revisado: boolean | undefined) {
    return this.prisma.codigoBarras.findMany({
      where: { revisado },
      include: conCategoria,
      orderBy: { creado_en: 'desc' },
    });
  }

  crear(datos: Prisma.CodigoBarrasUncheckedCreateInput, bd: ClienteBd) {
    return bd.codigoBarras.create({ data: datos, include: conCategoria });
  }

  actualizar(ean: string, datos: Prisma.CodigoBarrasUncheckedUpdateInput, bd: ClienteBd) {
    return bd.codigoBarras.update({ where: { ean }, data: datos, include: conCategoria });
  }

  /** El nombre de quien asoció cada código, en una sola consulta (C18). */
  autores(ids: string[], bd: ClienteBd = this.prisma) {
    return bd.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
  }
}
