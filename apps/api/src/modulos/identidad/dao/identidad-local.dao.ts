import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Consultas de `identidad_local`, la credencial del proveedor local (ADR-0019). */
@Injectable()
export class IdentidadLocalDao {
  constructor(private readonly prisma: PrismaService) {}

  crear(datos: { correo: string; passwordHash: string }) {
    return this.prisma.identidadLocal.create({
      data: {
        correo: datos.correo,
        password_hash: datos.passwordHash,
        // Nace confirmada: la invitación o el enlace del Donador ya probaron el correo
        correo_confirmado_en: new Date(),
      },
    });
  }

  cambiarHash(id: string, passwordHash: string) {
    return this.prisma.identidadLocal.update({
      where: { id },
      data: { password_hash: passwordHash },
    });
  }

  borrar(id: string) {
    return this.prisma.identidadLocal.deleteMany({ where: { id } });
  }

  porCorreo(correo: string) {
    return this.prisma.identidadLocal.findUnique({ where: { correo } });
  }
}
