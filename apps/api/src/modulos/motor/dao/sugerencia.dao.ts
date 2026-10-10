import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoSugerencia, Prisma } from '../../../generado/prisma/client';
import { INCLUIR_SUGERENCIA } from '../vistas';

/** Las sugerencias del motor (ADR-0019). Una decisión solo cambia una PROPUESTA (M-04). */
@Injectable()
export class SugerenciaDao {
  constructor(private readonly prisma: PrismaService) {}

  buscarConCategoria(tx: ClienteBd, id: string) {
    return tx.sugerencia.findUnique({
      where: { id },
      include: { categoria: { select: { nombre: true, unidad_base: true } } },
    });
  }

  async existe(tx: ClienteBd, id: string) {
    return Boolean(await tx.sugerencia.findUnique({ where: { id }, select: { id: true } }));
  }

  /** Pares descartados desde esa fecha: el motor no los vuelve a proponer (M-04). */
  descartadasDesde(tx: ClienteBd, desde: Date) {
    return tx.sugerencia.findMany({
      where: { estado: 'DESCARTADA', decidida_en: { gt: desde } },
      select: { acopio_id: true, zona_id: true, categoria_id: true },
    });
  }

  async reemplazarPropuestas(tx: ClienteBd, ronda: Prisma.SugerenciaCreateManyInput[]) {
    await tx.sugerencia.deleteMany({ where: { estado: 'PROPUESTA' } });
    await tx.sugerencia.createMany({ data: ronda });
  }

  async decidirSiPropuesta(
    tx: ClienteBd,
    id: string,
    data: Prisma.SugerenciaUncheckedUpdateManyInput,
  ): Promise<number> {
    const { count } = await tx.sugerencia.updateMany({ where: { id, estado: 'PROPUESTA' }, data });
    return count;
  }

  listar(filtro: {
    zonaId?: string;
    acopioId?: string;
    categoriaId?: string;
    estado?: EstadoSugerencia;
  }) {
    return this.prisma.sugerencia.findMany({
      where: {
        zona_id: filtro.zonaId,
        acopio_id: filtro.acopioId,
        categoria_id: filtro.categoriaId,
        estado: filtro.estado ?? 'PROPUESTA',
      },
      include: INCLUIR_SUGERENCIA,
      orderBy: [{ puntaje: 'desc' }, { cantidad: 'desc' }, { zona: { nombre: 'asc' } }],
      take: 200,
    });
  }

  descartadasEntre(desde?: Date, hasta?: Date) {
    return this.prisma.sugerencia.findMany({
      where: { estado: 'DESCARTADA', decidida_en: { gte: desde, lte: hasta } },
      include: INCLUIR_SUGERENCIA,
      orderBy: { decidida_en: 'desc' },
    });
  }
}
