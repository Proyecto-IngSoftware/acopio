import type { Entorno } from '../../../config/entorno';
import type { ProveedorIdentidad } from './proveedor-identidad';

/**
 * Factory Method del proveedor de identidad: el resto de la API pide PROVEEDOR_IDENTIDAD y
 * esta función decide, con AUTH_PROVEEDOR, cuál de los dos adaptadores lo atiende.
 */
export function fabricarProveedorIdentidad(
  entorno: Pick<Entorno, 'AUTH_PROVEEDOR'>,
  local: ProveedorIdentidad,
  supabase: ProveedorIdentidad,
): ProveedorIdentidad {
  return entorno.AUTH_PROVEEDOR === 'local' ? local : supabase;
}
