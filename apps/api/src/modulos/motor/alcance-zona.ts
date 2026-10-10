import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { AlcanceService } from '../identidad/autenticacion/alcance.service';

/** El Receptor solo actúa en sus zonas: 403 ZONA_NO_ASIGNADA. El Administrador, en todas. */
export async function exigirZonaPropia(
  alcance: AlcanceService,
  usuario: UsuarioAutenticado,
  zonaId: string,
): Promise<void> {
  const zonas = await alcance.idsAsignados(usuario, 'ZONA');
  if (zonas !== null && !zonas.includes(zonaId)) {
    throw new ErrorDominio('ZONA_NO_ASIGNADA', 'Esa zona no está asignada a tu cuenta', 403);
  }
}
