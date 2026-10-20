import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { EstadoCatalogo, Prisma } from '../../../generado/prisma/client';

const completa = {
  categoria: { select: { nombre: true, unidad_base: true, archivada: true } },
  contiene: { select: { tamano: true } },
  _count: { select: { codigos_barras: true } },
} as const;

/** Consultas de `presentacion` (ADR-0019, ADR-0021). */
@Injectable()
export class PresentacionDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Las validadas de la categoría y, si se pide, las propuestas (todas o las de un usuario). */
  listarDeCategoria(
    categoriaId: string,
    propuestas: 'TODAS' | 'NINGUNA' | { de: string },
    bd: ClienteBd = this.prisma,
  ) {
    const estado: Prisma.PresentacionWhereInput =
      propuestas === 'TODAS'
        ? {}
        : propuestas === 'NINGUNA'
          ? { estado: 'VALIDADO' }
          : { OR: [{ estado: 'VALIDADO' }, { estado: 'PROPUESTO', creado_por: propuestas.de }] };
    return bd.presentacion.findMany({
      where: { categoria_id: categoriaId, ...estado },
      include: completa,
      orderBy: [{ creado_en: 'asc' }],
    });
  }

  buscar(id: string, bd: ClienteBd = this.prisma) {
    return bd.presentacion.findUnique({ where: { id }, include: completa });
  }

  /** Por nombre dentro de la categoría; la columna es citext, así que ignora mayúsculas. */
  buscarPorNombre(categoriaId: string, nombre: string, bd: ClienteBd = this.prisma) {
    return bd.presentacion.findUnique({
      where: { categoria_id_nombre: { categoria_id: categoriaId, nombre } },
    });
  }

  crear(
    datos: Prisma.PresentacionUncheckedCreateInput & { estado: EstadoCatalogo },
    bd: ClienteBd,
  ) {
    return bd.presentacion.create({ data: datos, include: completa });
  }

  actualizar(id: string, datos: Prisma.PresentacionUncheckedUpdateInput, bd: ClienteBd) {
    return bd.presentacion.update({ where: { id }, data: datos, include: completa });
  }

  paquetesQueContienen(id: string, bd: ClienteBd = this.prisma) {
    return bd.presentacion.findMany({
      where: { contiene_id: id },
      include: completa,
      orderBy: { creado_en: 'asc' },
    });
  }
}
