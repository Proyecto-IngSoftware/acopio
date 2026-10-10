import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

const clave = (acopioId: string, categoriaId: string) => ({
  acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId },
});

/** Mínimo y máximo por acopio y categoría. */
@Injectable()
export class UmbralDao {
  constructor(private readonly prisma: PrismaService) {}

  delAcopio(acopioId: string, bd: ClienteBd = this.prisma) {
    return bd.umbral.findMany({ where: { acopio_id: acopioId } });
  }

  buscar(acopioId: string, categoriaId: string, bd: ClienteBd = this.prisma) {
    return bd.umbral.findUnique({
      where: clave(acopioId, categoriaId),
      include: { categoria: { select: { nombre: true } } },
    });
  }

  guardar(
    tx: ClienteBd,
    acopioId: string,
    categoriaId: string,
    datos: { minimo: number; maximo: number; usuarioId: string },
  ) {
    const { usuarioId, ...limites } = datos;
    return tx.umbral.upsert({
      where: clave(acopioId, categoriaId),
      update: { ...limites, actualizado_por: usuarioId, actualizado_en: new Date() },
      create: {
        acopio_id: acopioId,
        categoria_id: categoriaId,
        ...limites,
        actualizado_por: usuarioId,
      },
    });
  }

  borrar(tx: ClienteBd, acopioId: string, categoriaId: string) {
    return tx.umbral.delete({ where: clave(acopioId, categoriaId) });
  }
}
