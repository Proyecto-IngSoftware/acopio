import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Prisma } from '../../generado/prisma/client';

export interface EventoBitacora {
  /** Nulo en acciones del sistema: seed y tareas programadas. */
  usuarioId: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  ubicacionId?: string | null;
  antes?: unknown;
  despues?: unknown;
  /** Restablecer acceso, cambio de rol, ajuste de inventario (RF-IDE-012). */
  destacado?: boolean;
}

export interface FiltroBitacora {
  usuarioId?: string;
  ubicacionId?: string;
  accion?: string;
  entidad?: string;
  destacado?: boolean;
  desde?: Date;
  hasta?: Date;
  pagina: number;
  porPagina: number;
}

/**
 * Bitácora append-only (RF-IDE-012, RNF-10). Cada servicio registra su escritura
 * dentro de la misma transacción que la hace: si la escritura se revierte, el
 * registro también. La base impide UPDATE y DELETE al rol de la API.
 */
@Injectable()
export class BitacoraService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(cliente: ClienteBd, evento: EventoBitacora): Promise<void> {
    await cliente.bitacora.create({
      data: {
        usuario_id: evento.usuarioId,
        accion: evento.accion,
        entidad: evento.entidad,
        entidad_id: evento.entidadId ?? null,
        ubicacion_id: evento.ubicacionId ?? null,
        datos_antes: aJson(evento.antes),
        datos_despues: aJson(evento.despues),
        destacado: evento.destacado ?? false,
      },
    });
  }

  async buscar(filtro: FiltroBitacora) {
    const where: Prisma.BitacoraWhereInput = {
      usuario_id: filtro.usuarioId,
      ubicacion_id: filtro.ubicacionId,
      accion: filtro.accion,
      entidad: filtro.entidad,
      destacado: filtro.destacado,
      ocurrido_en: { gte: filtro.desde, lte: filtro.hasta },
    };
    const [total, registros] = await this.prisma.$transaction([
      this.prisma.bitacora.count({ where }),
      this.prisma.bitacora.findMany({
        where,
        orderBy: { ocurrido_en: 'desc' },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
        include: { usuario: { select: { id: true, username: true, nombre: true } } },
      }),
    ]);
    return { total, pagina: filtro.pagina, porPagina: filtro.porPagina, registros };
  }
}

function aJson(valor: unknown): Prisma.InputJsonValue | undefined {
  return valor === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue);
}
