import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

/** Consultas de `importacion_ejecucion` (ADR-0019). */
@Injectable()
export class EjecucionDao {
  constructor(private readonly prisma: PrismaService) {}

  registrar(datos: Prisma.ImportacionEjecucionUncheckedCreateInput, bd: ClienteBd = this.prisma) {
    return bd.importacionEjecucion.create({ data: datos });
  }

  ultimaOk(fuente: string) {
    return this.prisma.importacionEjecucion.findFirst({
      where: { fuente, resultado: 'OK' },
      orderBy: { inicio: 'desc' },
    });
  }
}
