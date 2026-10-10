import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Transacciones } from './transacciones';

@Global()
@Module({ providers: [PrismaService, Transacciones], exports: [PrismaService, Transacciones] })
export class PrismaModule {}
