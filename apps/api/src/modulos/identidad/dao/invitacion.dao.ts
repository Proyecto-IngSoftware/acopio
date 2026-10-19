import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { Prisma } from '../../../generado/prisma/client';

/** Consultas de `invitacion` (ADR-0019). */
@Injectable()
export class InvitacionDao {
  constructor(private readonly prisma: PrismaService) {}

  crear(datos: Prisma.InvitacionUncheckedCreateInput, tx: ClienteBd) {
    return tx.invitacion.create({ data: datos });
  }

  /** Revoca las pendientes del usuario y dice cuántas eran. */
  async revocarPendientes(usuarioId: string, tx: ClienteBd): Promise<number> {
    const { count } = await tx.invitacion.updateMany({
      where: { usuario_id: usuarioId, usada_en: null, revocada_en: null },
      data: { revocada_en: new Date() },
    });
    return count;
  }

  /**
   * Marca usada la invitación si sigue vigente y su usuario no está suspendido. Si dos
   * canjes llegan a la vez, solo uno la reclama.
   */
  async reclamar(tokenHash: Uint8Array<ArrayBuffer>, ahora: Date, tx: ClienteBd): Promise<boolean> {
    const { count } = await tx.invitacion.updateMany({
      where: {
        token_hash: tokenHash,
        usada_en: null,
        revocada_en: null,
        expira_en: { gt: ahora },
        usuario: { estado: { not: 'SUSPENDIDO' } },
      },
      data: { usada_en: ahora },
    });
    return count === 1;
  }

  conUsuario(tokenHash: Uint8Array<ArrayBuffer>, tx: ClienteBd) {
    return tx.invitacion.findUniqueOrThrow({
      where: { token_hash: tokenHash },
      include: { usuario: true },
    });
  }

  /** La invitación con su usuario y las asignaciones, para validarla antes de canjear. */
  paraCanje(tokenHash: Uint8Array<ArrayBuffer>) {
    return this.prisma.invitacion.findUnique({
      where: { token_hash: tokenHash },
      include: { usuario: { include: { asignaciones: true } } },
    });
  }
}
