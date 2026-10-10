import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../comun/prisma/prisma.service';

/** La consulta más simple posible: dice si la base responde. */
@Injectable()
export class SaludDao {
  constructor(private readonly prisma: PrismaService) {}

  async responde(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
