import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Lecturas de `usuario` que necesitan otros módulos (ADR-0019). */
@Injectable()
export class UsuarioDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Nombre y correo para escribirle a alguien. */
  contacto(id: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: { nombre: true, correo: true },
    });
  }
}
