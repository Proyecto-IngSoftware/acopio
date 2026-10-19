import { Injectable } from '@nestjs/common';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { TipoUbicacion } from '../../../generado/prisma/enums';

interface Donde {
  usuarioId: string;
  tipo: TipoUbicacion;
  ubicacionId: string;
}

const llave = (d: Donde) => ({
  usuario_id_ubicacion_tipo_ubicacion_id: {
    usuario_id: d.usuarioId,
    ubicacion_tipo: d.tipo,
    ubicacion_id: d.ubicacionId,
  },
});

/** Consultas de `usuario_asignacion` (ADR-0019). */
@Injectable()
export class AsignacionDao {
  constructor(private readonly prisma: PrismaService) {}

  existe(d: Donde, bd: ClienteBd = this.prisma) {
    return bd.usuarioAsignacion.findUnique({ where: llave(d), select: { usuario_id: true } });
  }

  idsDe(usuarioId: string, tipo: TipoUbicacion) {
    return this.prisma.usuarioAsignacion.findMany({
      where: { usuario_id: usuarioId, ubicacion_tipo: tipo },
      select: { ubicacion_id: true },
    });
  }

  crear(d: Donde & { asignadoPor: string }, tx: ClienteBd) {
    return tx.usuarioAsignacion.create({
      data: {
        usuario_id: d.usuarioId,
        ubicacion_tipo: d.tipo,
        ubicacion_id: d.ubicacionId,
        asignado_por: d.asignadoPor,
      },
    });
  }

  borrar(d: Donde, tx: ClienteBd) {
    return tx.usuarioAsignacion.delete({ where: llave(d) });
  }

  /** Cuántos otros usuarios activos siguen a cargo de esa ubicación. */
  otrosResponsablesActivos(d: Donde, tx: ClienteBd) {
    return tx.usuarioAsignacion.count({
      where: {
        ubicacion_tipo: d.tipo,
        ubicacion_id: d.ubicacionId,
        usuario_id: { not: d.usuarioId },
        usuario: { estado: 'ACTIVO' },
      },
    });
  }
}
