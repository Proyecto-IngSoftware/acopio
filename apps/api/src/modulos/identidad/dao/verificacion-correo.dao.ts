import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Consultas de `verificacion_correo`, los enlaces del Donador (ADR-0019). */
@Injectable()
export class VerificacionCorreoDao {
  constructor(private readonly prisma: PrismaService) {}

  crear(
    datos: { usuarioId: string; tokenHash: Uint8Array<ArrayBuffer>; venceEn: Date },
    tx: ClienteBd,
  ) {
    return tx.verificacionCorreo.create({
      data: { usuario_id: datos.usuarioId, token_hash: datos.tokenHash, vence_en: datos.venceEn },
    });
  }

  conUsuario(tokenHash: Uint8Array<ArrayBuffer>) {
    return this.prisma.verificacionCorreo.findUnique({
      where: { token_hash: tokenHash },
      include: {
        usuario: { select: { id: true, nombre: true, correo: true, estado: true, rol: true } },
      },
    });
  }

  /** Cierra el enlace si nadie lo cerró antes. Dice si lo cerró esta llamada. */
  async gastar(id: string, tx: ClienteBd): Promise<boolean> {
    const { count } = await tx.verificacionCorreo.updateMany({
      where: { id, usado_en: null },
      data: { usado_en: new Date() },
    });
    return count > 0;
  }

  cerrarPendientes(usuarioId: string, tx: ClienteBd) {
    return tx.verificacionCorreo.updateMany({
      where: { usuario_id: usuarioId, usado_en: null },
      data: { usado_en: new Date() },
    });
  }
}
