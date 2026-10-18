import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

/** Consultas de `zona` (ADR-0019). */
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

  listar(emergenciaId?: string) {
    return this.prisma.zona.findMany({
      where: { emergencia_id: emergenciaId },
      orderBy: { nombre: 'asc' },
    });
  }

  porId(id: string, bd: ClienteBd = this.prisma) {
    return bd.zona.findUnique({ where: { id } });
  }

  nombres(ids: string[]) {
    return this.prisma.zona.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true },
    });
  }

  buscar(filtro: Prisma.ZonaWhereInput) {
    return this.prisma.zona.findMany({ where: filtro, orderBy: { nombre: 'asc' } });
  }

  crear(datos: Prisma.ZonaUncheckedCreateInput, bd: ClienteBd) {
    return bd.zona.create({ data: datos });
  }

  actualizar(id: string, datos: Prisma.ZonaUncheckedUpdateInput, bd: ClienteBd) {
    return bd.zona.update({ where: { id }, data: datos });
  }

  /** El estado de la emergencia de una zona; `null` si no existe. */
  estadoEmergencia(id: string, bd: ClienteBd) {
    return bd.emergencia.findUnique({ where: { id }, select: { estado: true } });
  }
}
