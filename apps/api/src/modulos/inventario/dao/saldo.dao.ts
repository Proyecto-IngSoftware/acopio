import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/**
 * Candado de la transacción por (acopio, categoría). Lo toman las salidas, los ajustes y
 * el motor al aprobar: así se ordenan entre sí sin FOR UPDATE, que pediría permiso de
 * UPDATE sobre `saldo` (ADR-0015).
 */
export async function candadoSaldo(tx: ClienteBd, acopioId: string, categoriaId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${acopioId} || ':' || ${categoriaId}, 0))`;
}

/** `saldo` solo se lee: lo mantiene el disparador sobre `movimiento` (ADR-0015). */
@Injectable()
export class SaldoDao {
  constructor(private readonly prisma: PrismaService) {}

  async cantidad(acopioId: string, categoriaId: string, bd: ClienteBd = this.prisma) {
    const s = await bd.saldo.findUnique({
      where: { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } },
      select: { cantidad: true },
    });
    return s ? Number(s.cantidad) : 0;
  }

  delAcopio(acopioId: string, bd: ClienteBd = this.prisma) {
    return bd.saldo.findMany({ where: { acopio_id: acopioId } });
  }

  bloquear(tx: ClienteBd, acopioId: string, categoriaId: string) {
    return candadoSaldo(tx, acopioId, categoriaId);
  }
}
