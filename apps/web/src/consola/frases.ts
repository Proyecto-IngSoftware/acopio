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
  const con = (verbo: string) => (quien ? `${verbo} ${quien}` : verbo);
  // Los movimientos y las marcas de un acopio guardan el nombre de la categoría
  const categoria = texto(despues?.categoria) || texto(antes?.categoria);

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
    case 'acopio.creado':
      return con('Creó el acopio');
    case 'acopio.actualizado':
      return con('Editó el acopio');
    case 'acopio.cerrado':
      return con('Cerró el acopio');
    case 'acopio.operado':
      return con('Actualizó la operación de');
    case 'entidad.creada':
      return con('Creó la entidad');
    case 'entidad.actualizada':
      return con('Editó la entidad');
    case 'zona.creada':
      return con('Registró la zona');
    case 'zona.actualizada':
      return con('Editó la zona');
    case 'codigo_barras.asociado':
    case 'codigo_barras.editado': {
      const ean = texto(despues?.ean) || texto(antes?.ean);
      const verbo = r.accion === 'codigo_barras.asociado' ? 'Asoció' : 'Editó';
      if (!ean) return `${verbo} un código de barras`;
      return categoria ? `${verbo} el código ${ean} a ${categoria}` : `${verbo} el código ${ean}`;
    }
    case 'movimiento.entrada':
      return categoria ? `Registró una entrada de ${categoria}` : 'Registró una entrada';
    case 'movimiento.salida':
      return categoria ? `Registró una salida de ${categoria}` : 'Registró una salida';
    case 'movimiento.ajuste':
      return categoria
        ? `Ajustó ${categoria} con un conteo físico`
        : 'Ajustó el inventario con un conteo físico';
    case 'no_recibir.marcado':
      return categoria
        ? `Marcó ${categoria} como «no recibir»`
        : 'Marcó una categoría como «no recibir»';
    case 'no_recibir.desmarcado':
      return categoria ? `Quitó «no recibir» de ${categoria}` : 'Quitó una marca de «no recibir»';
    case 'umbral.fijado':
      return categoria ? `Fijó el umbral de ${categoria}` : 'Fijó un umbral';
    case 'umbral.quitado':
      return categoria ? `Quitó el umbral de ${categoria}` : 'Quitó un umbral';
    case 'donador.registrado':
      return 'Se registró como Donador';
    case 'donador.confirmado':
      return 'Confirmó su cuenta de Donador';
    case 'donador.correo_confirmado':
      return 'Confirmó su correo';
    case 'comprobante.preparado': {
      const folio = texto(despues?.folio);
      return folio ? `Preparó la donación ${folio}` : 'Preparó una donación';
    }
    case 'comprobante.cancelado':
      return 'Canceló una donación';
    case 'comprobante.vencido':
      return 'Una donación preparada venció sin entregarse';
    case 'comprobante.factura':
      return 'Adjuntó la foto de la factura';
    case 'comprobante.factura_borrada':
      return 'Se borró la foto de una factura al cumplir su plazo';
    case 'comprobante.recibido':
      return 'Recibió una donación';
    case 'comprobante.vinculado':
      return 'Vinculó entradas a una donación';
    case 'comprobante.conciliado':
      return 'Concilió una donación';
    case 'comprobante.rechazado':
      return 'Rechazó una donación';
    case 'comprobante.rechazo_revertido':
      return 'Revirtió el rechazo de una donación';
    default:
      return r.accion;
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

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
  if (r.entidad === 'comprobante') return 'receipt_long';
  if (r.entidad === 'movimiento') return 'swap_vert';
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
