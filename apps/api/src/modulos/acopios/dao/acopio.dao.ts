import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `acopio` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class AcopioDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Los activos, con lo que hace falta para sugerirlos a un Donador. */
  activos() {
    return this.prisma.acopio.findMany({
      where: { estado: 'ACTIVO' },
      select: { id: true, nombre: true, direccion: true, lat: true, lng: true, horario: true },
    });
  }

  nombres(ids: string[]) {
    return this.prisma.acopio.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true },
    });
  }
}
