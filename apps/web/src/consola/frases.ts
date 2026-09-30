import type { RegistroBitacora } from '../api/bitacora';
import type { Rol } from '../sesion/cliente-auth';
import { nombreRol } from '../sesion/roles';

type Datos = Record<string, unknown> | null | undefined;
const datos = (d: unknown): Datos =>
  d && typeof d === 'object' ? (d as Record<string, unknown>) : null;

function nombreDe(d: Datos): string {
  if (typeof d?.nombre === 'string') return d.nombre;
  if (typeof d?.username === 'string') return `@${d.username}`;
  return '';
}

/** La acción de un registro de la bitácora, en lenguaje llano. */
export function frase(r: RegistroBitacora): string {
  const antes = datos(r.datos_antes);
  const despues = datos(r.datos_despues);
  const quien = nombreDe(despues) || nombreDe(antes);
  const con = (texto: string) => (quien ? `${texto} ${quien}` : texto);

  switch (r.accion) {
    case 'usuario.creado':
      return despues?.rol
        ? `Invitó a ${quien} como ${nombreRol(despues.rol as Rol)}`
        : con('Invitó a');
    case 'seed.admin_creado':
      return 'Se creó el administrador inicial';
    case 'invitacion.canjeada':
      return 'Activó su cuenta';
    case 'invitacion.regenerada':
      return con('Generó un enlace nuevo para');
    case 'invitacion.revocada':
      return con('Revocó la invitación de');
    case 'acceso.restablecido':
      return con('Restableció el acceso de');
    case 'usuario.suspendido':
      return con('Suspendió a');
    case 'usuario.reactivado':
      return con('Reactivó a');
    case 'usuario.actualizado':
      return con('Editó a');
    case 'asignacion.creada':
      return 'Asignó una ubicación';
    case 'asignacion.eliminada':
      return 'Quitó una ubicación';
    case 'categoria.creada':
      return con('Creó la categoría');
    case 'categoria.actualizada':
      if (antes?.archivada === false && despues?.archivada === true)
        return con('Archivó la categoría');
      if (antes?.archivada === true && despues?.archivada === false)
        return con('Reactivó la categoría');
      return con('Editó la categoría');
    case 'categoria.eliminada':
      return con('Borró la categoría');
    case 'canasta.version_agregada':
      return con('Actualizó la canasta de');
    case 'emergencia.creada':
      return con('Creó la emergencia');
    case 'emergencia.actualizada':
      return con('Editó la emergencia');
    case 'emergencia.cerrada':
      return con('Cerró la emergencia');
    case 'emergencia.en_seguimiento':
      return quien
        ? `La emergencia ${quien} pasó a seguimiento`
        : 'Una emergencia pasó a seguimiento';
    default:
      return r.accion;
  }
}

/** Ícono de la fila según lo que pasó. */
export function iconoDe(r: RegistroBitacora): string {
  if (r.accion === 'usuario.creado') return 'person_add';
  if (r.accion === 'acceso.restablecido') return 'lock_reset';
  if (r.accion === 'usuario.suspendido') return 'person_off';
  if (r.accion.startsWith('invitacion.')) return 'link';
  if (r.accion.startsWith('asignacion.')) return 'add_location_alt';
  if (r.accion.startsWith('canasta.')) return 'shopping_basket';
  if (r.entidad === 'categoria') return 'inventory_2';
  if (r.entidad === 'emergencia') return 'emergency';
  return 'history';
}

function valor(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v))
    return v.length === 0 ? '—' : `${v.length} elemento${v.length === 1 ? '' : 's'}`;
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string' && ISO.test(v)) return fecha(v);
  return String(v);
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** Las fechas sin hora llegan como medianoche UTC; esas se muestran sin hora. */
function fecha(iso: string): string {
  const d = new Date(iso);
  return iso.includes('T00:00:00.000Z')
    ? d.toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'UTC' })
    : d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Campos que cambiaron entre el antes y el después. */
export function cambios(r: RegistroBitacora): { campo: string; antes: string; despues: string }[] {
  const antes = datos(r.datos_antes) ?? {};
  const despues = datos(r.datos_despues) ?? {};
  const campos = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
  return campos
    .filter((c) => JSON.stringify(antes[c]) !== JSON.stringify(despues[c]))
    .map((c) => ({ campo: c, antes: valor(antes[c]), despues: valor(despues[c]) }));
}
