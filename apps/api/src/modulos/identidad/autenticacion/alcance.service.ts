import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsignacionDao } from '../dao/asignacion.dao';
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
  constructor(private readonly asignaciones: AsignacionDao) {}

  async puede(
    usuario: UsuarioAutenticado,
    tipo: TipoUbicacion,
    ubicacionId: string,
  ): Promise<boolean> {
    if (usuario.rol === 'ADMIN') return true;
    const asignacion = await this.asignaciones.existe({
      usuarioId: usuario.id,
      tipo,
      ubicacionId,
    });
    return asignacion !== null;
  }

  /** Ubicaciones de ese tipo asignadas al usuario. `null` para el Administrador: todas. */
  async idsAsignados(usuario: UsuarioAutenticado, tipo: TipoUbicacion): Promise<string[] | null> {
    if (usuario.rol === 'ADMIN') return null;
    const filas = await this.asignaciones.idsDe(usuario.id, tipo);
    return filas.map((f) => f.ubicacion_id);
  }

  async exigir(usuario: UsuarioAutenticado, tipo: TipoUbicacion, ubicacionId: string) {
    if (!(await this.puede(usuario, tipo, ubicacionId))) {
      throw new ForbiddenException('No tienes asignada esta ubicación');
    }
  }
}
