import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import type { EstadoEmergencia } from '../../../generado/prisma/enums';

/** Consultas de `emergencia` (ADR-0019). */
@Injectable()
export class EmergenciaDao {
  constructor(private readonly prisma: PrismaService) {}

  listar(estado?: EstadoEmergencia) {
    return this.prisma.emergencia.findMany({ where: { estado }, orderBy: [{ inicio: 'desc' }] });
  }

  buscar(id: string, bd: ClienteBd = this.prisma) {
    return bd.emergencia.findUnique({ where: { id } });
  }

  crear(datos: Prisma.EmergenciaCreateInput, bd: ClienteBd) {
    return bd.emergencia.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.EmergenciaUpdateInput, bd: ClienteBd) {
    return bd.emergencia.update({ where: { id }, data: datos });
  }

  /** Las activas cuya fecha de destaque ya pasó. */
  vencidas(hoy: Date, bd: ClienteBd) {
    return bd.emergencia.findMany({
      where: { estado: 'ACTIVA', destacada_hasta: { lt: hoy } },
      select: { id: true },
    });
  }
}
