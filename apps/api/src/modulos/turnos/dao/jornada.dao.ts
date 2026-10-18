import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import { conLugar } from '../turnos.vistas';

/** Consultas de `jornada` (ADR-0019). */
@Injectable()
export class JornadaDao {
  constructor(private readonly prisma: PrismaService) {}

  porId(id: string, bd: ClienteBd = this.prisma) {
    return bd.jornada.findUnique({ where: { id }, include: conLugar });
  }

  /** Ordena a quienes cuentan cupos de la misma jornada dentro de una transacción. */
  async bloquear(id: string, tx: ClienteBd) {
    await tx.$queryRaw`SELECT id FROM jornada WHERE id = ${id}::uuid FOR UPDATE`;
  }

  crear(datos: Prisma.JornadaUncheckedCreateInput, tx: ClienteBd) {
    return tx.jornada.create({ data: datos, include: conLugar });
  }

  actualizar(id: string, datos: Prisma.JornadaUncheckedUpdateInput, tx: ClienteBd) {
    return tx.jornada.update({ where: { id }, data: datos, include: conLugar });
  }

  borrar(id: string, tx: ClienteBd) {
    return tx.jornada.delete({ where: { id } });
  }

  buscar(where: Prisma.JornadaWhereInput, orden: 'asc' | 'desc' = 'asc') {
    return this.prisma.jornada.findMany({ where, include: conLugar, orderBy: { inicio: orden } });
  }
}
