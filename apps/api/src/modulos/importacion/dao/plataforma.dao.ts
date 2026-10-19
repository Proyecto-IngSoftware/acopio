import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { PlataformaFuente } from '../fuentes/tipos';

/** Consultas de `plataforma` (ADR-0019). */
@Injectable()
export class PlataformaDao {
  constructor(private readonly prisma: PrismaService) {}

  /** Las de la fuente quedan como las trae; las que dejaron de aparecer se desactivan. */
  async reemplazarDeFuente(fuente: string, plataformas: PlataformaFuente[], bd: ClienteBd) {
    for (const p of plataformas) {
      const datos = {
        nombre: p.nombre,
        categoria: p.categoria,
        descripcion: p.descripcion,
        url: p.url,
        orden: p.orden,
        activa: true,
      };
      await bd.plataforma.upsert({
        where: { fuente_fuente_id: { fuente, fuente_id: p.url } },
        update: datos,
        create: { ...datos, fuente, fuente_id: p.url },
      });
    }
    await bd.plataforma.updateMany({
      where: { fuente, fuente_id: { notIn: plataformas.map((p) => p.url) } },
      data: { activa: false },
    });
  }

  crear(
    datos: { nombre: string; categoria: string; descripcion: string; url: string; orden: number },
    bd: ClienteBd,
  ) {
    return bd.plataforma.create({ data: datos });
  }

  porId(id: string) {
    return this.prisma.plataforma.findUnique({ where: { id } });
  }

  activas() {
    return this.prisma.plataforma.findMany({
      where: { activa: true },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });
  }
}
