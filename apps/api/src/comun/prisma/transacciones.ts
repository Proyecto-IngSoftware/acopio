import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generado/prisma/client';
import { PrismaService } from './prisma.service';

type OpcionesTransaccion = { timeout?: number; maxWait?: number };

/**
 * Unidad de trabajo (ADR-0019). El servicio abre la transacción y le pasa la `tx` a los DAO,
 * a la bitácora y a la cola de correo: así todo se confirma o se revierte junto sin que el
 * servicio toque Prisma.
 */
@Injectable()
export class Transacciones {
  constructor(private readonly prisma: PrismaService) {}

  ejecutar<T>(
    trabajo: (tx: Prisma.TransactionClient) => Promise<T>,
    opciones?: OpcionesTransaccion,
  ): Promise<T> {
    return this.prisma.$transaction(trabajo, opciones);
  }
}
