import type { Prisma } from '../../generado/prisma/client';
import type { PrismaService } from './prisma.service';

/** La conexión o una transacción abierta: los servicios escriben en la que les pasen. */
export type ClienteBd = PrismaService | Prisma.TransactionClient;
