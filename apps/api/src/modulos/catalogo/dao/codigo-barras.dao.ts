import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoCatalogo, Prisma } from '../../../generado/prisma/client';

const completa = {
  categoria: {
    select: { nombre: true, unidad_base: true, archivada: true, grupo: true, perecedero: true },
  },
  presentacion: {
    select: {
      id: true,
      nombre: true,
      tamano: true,
      unidades: true,
      contiene: { select: { tamano: true } },
    },
  },
} as const;

/** Consultas de `codigo_barras` (ADR-0019). */
@Injectable()
export class CodigoBarrasDao {
  constructor(private readonly prisma: PrismaService) {}

  buscar(ean: string, bd: ClienteBd = this.prisma) {
    return bd.codigoBarras.findUnique({ where: { ean } });
  }

  /** Con lo que el escáner muestra de la categoría y la presentación. */
  conCategoria(ean: string, bd: ClienteBd = this.prisma) {
    return bd.codigoBarras.findUnique({ where: { ean }, include: completa });
  }

  /**
   * Los códigos que cumplen el filtro. `q` se busca sin tildes: prefijo del EAN, o parte del
   * nombre de la categoría o de la presentación. Primero los `PROPUESTO` y los `por_revisar`.
   */
  async listar(
    filtro: { q?: string; estado?: EstadoCatalogo; categoriaId?: string },
    bd: ClienteBd = this.prisma,
  ) {
    const q = filtro.q?.trim() ? filtro.q.trim().replace(/[\\%_]/g, (c) => `\\${c}`) : null;
    const estado = filtro.estado ?? null;
    const categoriaId = filtro.categoriaId ?? null;
    const ids = await bd.$queryRaw<{ ean: string }[]>`
      SELECT c.ean
      FROM codigo_barras c
      JOIN categoria cat ON cat.id = c.categoria_id
      LEFT JOIN presentacion p ON p.id = c.presentacion_id
      WHERE (${estado}::text IS NULL OR c.estado::text = ${estado})
        AND (${categoriaId}::text IS NULL OR c.categoria_id::text = ${categoriaId})
        AND (${q}::text IS NULL
             OR c.ean LIKE acopio_sin_tildes(${q}) || '%'
             OR acopio_sin_tildes(cat.nombre) LIKE '%' || acopio_sin_tildes(${q}) || '%'
             OR acopio_sin_tildes(p.nombre) LIKE '%' || acopio_sin_tildes(${q}) || '%')
      ORDER BY (c.estado = 'PROPUESTO') DESC, c.por_revisar DESC, c.creado_en DESC, c.ean
      LIMIT 500`;
    const filas = await bd.codigoBarras.findMany({
      where: { ean: { in: ids.map((i) => i.ean) } },
      include: completa,
    });
    const porEan = new Map(filas.map((f) => [f.ean, f]));
    return ids.map((i) => porEan.get(i.ean)!);
  }

  crear(datos: Prisma.CodigoBarrasUncheckedCreateInput, bd: ClienteBd) {
    return bd.codigoBarras.create({ data: datos, include: completa });
  }

  actualizar(ean: string, datos: Prisma.CodigoBarrasUncheckedUpdateInput, bd: ClienteBd) {
    return bd.codigoBarras.update({ where: { ean }, data: datos, include: completa });
  }

  /**
   * Pasa a `VALIDADO` solo si sigue `PROPUESTO`; devuelve cuántas filas cambió (0 o 1). El
   * UPDATE toma el candado de la fila: quien llega después espera y ve que ya no coincide.
   */
  async validarSiPropuesto(
    ean: string,
    datos: { presentacion_id: string; categoria_id: string },
    bd: ClienteBd,
  ): Promise<number> {
    const { count } = await bd.codigoBarras.updateMany({
      where: { ean, estado: 'PROPUESTO' },
      data: { estado: 'VALIDADO', ...datos },
    });
    return count;
  }

  /** El nombre de quien asoció cada código, en una sola consulta (C18). */
  autores(ids: string[], bd: ClienteBd = this.prisma) {
    return bd.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
  }
}
