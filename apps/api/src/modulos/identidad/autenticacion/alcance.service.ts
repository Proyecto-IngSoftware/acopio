import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';
import type { TipoUbicacion } from '../../../generado/prisma/enums';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';

/**
 * Verifica que el usuario pueda actuar sobre una ubicación (RF-IDE-005, RF-IDE-010).
 * El Administrador es global. Operador, Receptor y Auditor, solo donde tengan una
 * asignación. Se consulta la base en cada llamada; el conmutador de contexto de la
 * interfaz es una comodidad, nunca una fuente de autoridad.
 */
@Injectable()
export class AlcanceService {
  constructor(private readonly prisma: PrismaService) {}

  async puede(
    usuario: UsuarioAutenticado,
    tipo: TipoUbicacion,
    ubicacionId: string,
  ): Promise<boolean> {
    if (usuario.rol === 'ADMIN') return true;
    const asignacion = await this.prisma.usuarioAsignacion.findUnique({
      where: {
        usuario_id_ubicacion_tipo_ubicacion_id: {
          usuario_id: usuario.id,
          ubicacion_tipo: tipo,
          ubicacion_id: ubicacionId,
        },
      },
      select: { usuario_id: true },
    });
    return asignacion !== null;
  }

  async exigir(usuario: UsuarioAutenticado, tipo: TipoUbicacion, ubicacionId: string) {
    if (!(await this.puede(usuario, tipo, ubicacionId))) {
      throw new ForbiddenException('No tienes asignada esta ubicación');
    }
  }
}
