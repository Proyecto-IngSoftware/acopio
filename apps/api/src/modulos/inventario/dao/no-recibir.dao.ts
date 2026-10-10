import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

const clave = (acopioId: string, categoriaId: string) => ({
  acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId },
});
/** Vigente: sin fecha de reapertura, o con una que no ha pasado. */
const vigente = (hoy: Date) => ({ OR: [{ hasta: null }, { hasta: { gte: hoy } }] });

/** Marcas de «no recibir» por acopio y categoría. */
@Injectable()
export class NoRecibirDao {
  constructor(private readonly prisma: PrismaService) {}

  vigentesDelAcopio(acopioId: string, hoy: Date, bd: ClienteBd = this.prisma) {
    return bd.noRecibir.findMany({
      where: { acopio_id: acopioId, ...vigente(hoy) },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { categoria: { nombre: 'asc' } },
    });
  }

  /** Las marcas vigentes de una categoría en acopios que no están cerrados. */
  vigentesPorCategoria(categoriaId: string, hoy: Date, bd: ClienteBd = this.prisma) {
    return bd.noRecibir.findMany({
      where: { categoria_id: categoriaId, ...vigente(hoy), acopio: { estado: { not: 'CERRADO' } } },
      select: { acopio_id: true, hasta: true },
    });
  }

  buscar(acopioId: string, categoriaId: string, bd: ClienteBd = this.prisma) {
    return bd.noRecibir.findUnique({
      where: clave(acopioId, categoriaId),
      include: { categoria: { select: { nombre: true } } },
    });
  }

  guardar(
    tx: ClienteBd,
    acopioId: string,
    categoriaId: string,
    datos: { hasta: Date | null; usuarioId: string },
  ) {
    return tx.noRecibir.upsert({
      where: clave(acopioId, categoriaId),
      update: { hasta: datos.hasta, marcado_por: datos.usuarioId, marcado_en: new Date() },
      create: {
        acopio_id: acopioId,
        categoria_id: categoriaId,
        hasta: datos.hasta,
        marcado_por: datos.usuarioId,
      },
    });
  }

  borrar(tx: ClienteBd, acopioId: string, categoriaId: string) {
    return tx.noRecibir.delete({ where: clave(acopioId, categoriaId) });
  }
}
