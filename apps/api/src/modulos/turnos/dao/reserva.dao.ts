import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';
import { conLugar, ESTADOS_OCUPAN } from '../turnos.vistas';

export const conJornada = { jornada: { include: conLugar } } satisfies Prisma.ReservaInclude;
export type FilaReserva = Prisma.ReservaGetPayload<{ include: typeof conJornada }>;

/** Consultas de `reserva` (ADR-0019). */
@Injectable()
export class ReservaDao {
  constructor(private readonly prisma: PrismaService) {}

  ocupados(jornadaId: string, bd: ClienteBd = this.prisma) {
    return bd.reserva.count({
      where: { jornada_id: jornadaId, estado: { in: ESTADOS_OCUPAN } },
    });
  }

  /** Cualquier estado, también canceladas: una jornada que tuvo reservas no se borra. */
  total(jornadaId: string, bd: ClienteBd = this.prisma) {
    return bd.reserva.count({ where: { jornada_id: jornadaId } });
  }

  activas(jornadaId: string, bd: ClienteBd = this.prisma) {
    return bd.reserva.findMany({ where: { jornada_id: jornadaId, estado: 'ACTIVA' } });
  }

  activaConCorreo(jornadaId: string, correo: string, bd: ClienteBd) {
    return bd.reserva.findFirst({
      where: { jornada_id: jornadaId, correo, estado: { not: 'CANCELADA' } },
      select: { id: true },
    });
  }

  crear(datos: Prisma.ReservaUncheckedCreateInput, tx: ClienteBd) {
    return tx.reserva.create({ data: datos, include: conJornada });
  }

  porCodigo(codigo: string, bd: ClienteBd = this.prisma) {
    return bd.reserva.findUnique({ where: { codigo }, include: conJornada });
  }

  porId(id: string, bd: ClienteBd = this.prisma) {
    return bd.reserva.findUnique({ where: { id }, include: conJornada });
  }

  actualizar(id: string, datos: Prisma.ReservaUncheckedUpdateInput, tx: ClienteBd) {
    return tx.reserva.update({ where: { id }, data: datos, include: conJornada });
  }

  deJornada(jornadaId: string) {
    return this.prisma.reserva.findMany({
      where: { jornada_id: jornadaId },
      orderBy: { creada_en: 'asc' },
    });
  }

  /** Activas, con correo y sin recordatorio, de jornadas que empiezan en (desde, hasta]. */
  porRecordar(desde: Date, hasta: Date) {
    return this.prisma.reserva.findMany({
      where: {
        estado: 'ACTIVA',
        correo: { not: null },
        recordatorio_en: null,
        jornada: { estado: { in: ['ABIERTA', 'CERRADA'] }, inicio: { gt: desde, lte: hasta } },
      },
      include: conJornada,
    });
  }

  /** Vacía nombre, correo y teléfono de las reservas de jornadas que terminaron antes de `limite`. */
  async borrarDatos(limite: Date, ahora: Date, tx: ClienteBd) {
    const r = await tx.reserva.updateMany({
      where: { datos_borrados_en: null, jornada: { fin: { lt: limite } } },
      data: { nombre: null, correo: null, telefono: null, datos_borrados_en: ahora },
    });
    return r.count;
  }
}
