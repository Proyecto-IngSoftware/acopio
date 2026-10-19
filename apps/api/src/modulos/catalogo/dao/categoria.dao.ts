import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import type { GrupoCategoria, UnidadBase } from '../../../generado/prisma/enums';

/** Consultas de `categoria` (ADR-0019). */
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

  listar(filtro: { grupo?: GrupoCategoria; incluirArchivadas?: boolean }) {
    return this.prisma.categoria.findMany({
      where: { grupo: filtro.grupo, ...(filtro.incluirArchivadas ? {} : { archivada: false }) },
      orderBy: [{ grupo: 'asc' }, { nombre: 'asc' }],
    });
  }

  /** Puntaje por palabra sobre el nombre y los sinónimos, sin tildes (RF-CAT-002). */
  buscarTexto(consulta: string, limite: number) {
    return this.prisma.$queryRaw<
      {
        id: string;
        nombre: string;
        grupo: GrupoCategoria;
        unidad_base: UnidadBase;
        perecedero: boolean;
        puntaje: number;
      }[]
    >`
      WITH c AS (SELECT acopio_sin_tildes(${consulta}) AS q)
      SELECT cat.id, cat.nombre, cat.grupo, cat.unidad_base, cat.perecedero,
             GREATEST(
               word_similarity(c.q, acopio_sin_tildes(cat.nombre)),
               COALESCE((SELECT max(word_similarity(c.q, acopio_sin_tildes(s)))
                         FROM unnest(cat.sinonimos) AS s), 0)
             )::float AS puntaje
      FROM categoria cat, c
      WHERE NOT cat.archivada
      ORDER BY puntaje DESC, cat.nombre
      LIMIT ${limite}`;
  }

  crear(datos: Prisma.CategoriaCreateInput, bd: ClienteBd) {
    return bd.categoria.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.CategoriaUpdateInput, bd: ClienteBd) {
    return bd.categoria.update({ where: { id }, data: datos });
  }

  /** Con cuántas versiones de canasta la usan: una categoría usada no se elimina. */
  conUso(id: string, bd: ClienteBd) {
    return bd.categoria.findUnique({
      where: { id },
      include: { _count: { select: { canasta: true } } },
    });
  }

  eliminar(id: string, bd: ClienteBd) {
    return bd.categoria.delete({ where: { id } });
  }
}
