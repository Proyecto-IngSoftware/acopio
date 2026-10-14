import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `zona` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class ZonaDao {
  constructor(private readonly prisma: PrismaService) {}

  conEmergencia(id: string, bd: ClienteBd = this.prisma) {
    return bd.zona.findUnique({ where: { id }, include: { emergencia: true } });
  }

  /** Las de emergencias ACTIVA o EN_SEGUIMIENTO, o las pedidas, con su horizonte. */
  paraMotor(bd: ClienteBd, zonaIds?: string[]) {
    return bd.zona.findMany({
      where: zonaIds
        ? { id: { in: zonaIds } }
        : { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      include: { emergencia: { select: { horizonte_dias: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Para el mapa público: sin población ni nombre (E2-02). */
  paraPublico() {
    return this.prisma.zona.findMany({
      where: { emergencia: { estado: { in: ['ACTIVA', 'EN_SEGUIMIENTO'] } } },
      select: { id: true, lat: true, lng: true },
    });
  }
}
