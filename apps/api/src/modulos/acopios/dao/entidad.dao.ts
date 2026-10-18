import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

/** Consultas de `entidad` (ADR-0019). */
@Injectable()
export class EntidadDao {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.entidad.findMany({ orderBy: { nombre: 'asc' } });
  }

  porId(id: string, bd: ClienteBd = this.prisma) {
    return bd.entidad.findUnique({ where: { id } });
  }

  crear(datos: Prisma.EntidadUncheckedCreateInput, bd: ClienteBd) {
    return bd.entidad.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.EntidadUncheckedUpdateInput, bd: ClienteBd) {
    return bd.entidad.update({ where: { id }, data: datos });
  }
}
