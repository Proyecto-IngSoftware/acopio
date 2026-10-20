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

const conCodigo = (verbo: string, d: Datos) =>
  typeof d?.codigo === 'string' ? `${verbo} ${d.codigo}` : verbo;

/** Causas y jornadas guardan su título, no un nombre. */
const conTitulo = (verbo: string, ...ds: Datos[]) => {
  const titulo = ds.map((d) => d?.titulo).find((t) => typeof t === 'string');
  return typeof titulo === 'string' ? `${verbo} «${titulo}»` : verbo;
};

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
    case 'acceso.restablecimiento_canjeado':
      return 'Entró con su enlace para restablecer la contraseña';
    case 'usuario.suspendido':
      return con('Suspendió a');
    case 'usuario.reactivado':
      return con('Reactivó a');
    case 'usuario.actualizado':
      return con('Editó a');
    case 'usuario.rol_cambiado':
      return con('Cambió el rol de');
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
    case 'categoria.archivada':
      return con('Archivó la categoría');
    case 'categoria.reactivada':
      return con('Reactivó la categoría');
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
    case 'entidad.verificada':
      return con('Verificó la entidad');
    case 'entidad.verificacion_quitada':
      return con('Quitó la verificación de');
    case 'entidad.logo_cambiado':
      return con('Cambió el logotipo de');
    case 'causa.creada':
      return conTitulo('Publicó la causa', despues);
    case 'causa.editada':
      return conTitulo('Editó la causa', despues, antes);
    case 'causa.renovada':
      return conTitulo('Renovó la causa', despues, antes);
    case 'causa.reactivada':
      return conTitulo('Reactivó la causa', despues, antes);
    case 'causa.archivada':
      return conTitulo('Archivó la causa', despues, antes);
    case 'causa.imagen_cambiada':
      return conTitulo('Cambió la imagen de la causa', despues, antes);
    case 'jornada.creada':
      return conTitulo('Creó la jornada', despues);
    case 'jornada.editada':
      return conTitulo('Editó la jornada', despues, antes);
    case 'jornada.ajustada':
      return conTitulo('Ajustó los cupos de la jornada', despues, antes);
    case 'jornada.cerrada':
      return conTitulo('Cerró las reservas de la jornada', despues, antes);
    case 'jornada.reabierta':
      return conTitulo('Reabrió las reservas de la jornada', despues, antes);
    case 'jornada.cancelada':
      return conTitulo('Canceló la jornada', despues, antes);
    case 'jornada.borrada':
      return conTitulo('Borró la jornada', antes);
    case 'reserva.asistencia':
      return 'Marcó la asistencia de una reserva';
    case 'reservas.datos_borrados':
      return 'Se borraron los datos personales de reservas pasadas';
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
    case 'codigo_barras.propuesto':
    case 'codigo_barras.validado': {
      const ean = texto(despues?.ean) || texto(antes?.ean);
      const verbo = r.accion === 'codigo_barras.propuesto' ? 'Propuso' : 'Validó';
      return ean ? `${verbo} el código ${ean}` : `${verbo} un código de barras`;
    }
    case 'codigo_barras.marcado': {
      const ean = texto(despues?.ean) || texto(antes?.ean);
      return ean
        ? `Marcó el código ${ean} para revisión`
        : 'Marcó un código de barras para revisión';
    }
    case 'presentacion.creada':
    case 'presentacion.editada': {
      const nombre = texto(despues?.nombre) || texto(antes?.nombre);
      const verbo = r.accion === 'presentacion.creada' ? 'Creó' : 'Editó';
      return nombre ? `${verbo} la presentación ${nombre}` : `${verbo} una presentación`;
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
    case 'comprobante.linea_corregida':
      return 'Corrigió una línea de la donación al recibirla';
    case 'comprobante.rechazado':
      return 'Rechazó una donación';
    case 'comprobante.rechazo_revertido':
      return 'Revirtió el rechazo de una donación';
    case 'movimiento.recepcion':
      return categoria ? `Recibió ${categoria} en la zona` : 'Recibió una entrega en la zona';
    case 'motor.configuracion':
      return 'Cambió los pesos del motor';
    case 'necesidad.manual':
      return categoria ? `Corrigió la necesidad de ${categoria}` : 'Corrigió una necesidad';
    case 'reporte.necesidad':
      if (despues?.resuelta === true)
        return categoria ? `Marcó ${categoria} como resuelta` : 'Marcó una necesidad como resuelta';
      return categoria ? `Reportó necesidad de ${categoria}` : 'Reportó una necesidad';
    case 'sugerencia.aprobada':
      return 'Aprobó una sugerencia del motor';
    case 'sugerencia.descartada':
      return 'Descartó una sugerencia del motor';
    case 'remision.creada':
      return conCodigo('Creó la remisión', despues);
    case 'remision.editada':
    case 'remision.linea':
      return conCodigo('Editó la remisión', despues ?? antes);
    case 'remision.despachada':
      return conCodigo('Despachó la remisión', despues);
    case 'remision.cancelada':
      return conCodigo('Canceló la remisión', despues ?? antes);
    case 'remision.evidencia':
      return 'Subió una foto de evidencia';
    case 'remision.recibida':
      return 'Confirmó la recepción de una remisión';
    case 'plataforma.creada':
      return con('Sumó la plataforma');
    case 'importacion.ejecutada': {
      const n = (k: string) => (typeof despues?.[k] === 'number' ? despues[k] : 0);
      return `Importó los puntos de RedAcopio (${n('creados')} nuevos, ${n('actualizados')} actualizados, ${n('cerrados')} cerrados)`;
    }
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
  if (r.accion === 'usuario.reactivado') return 'person_check';
  if (r.accion.startsWith('usuario.')) return 'manage_accounts';
  if (r.accion.startsWith('acceso.')) return 'lock_reset';
  if (r.accion === 'entidad.verificada') return 'verified';
  if (r.accion === 'entidad.verificacion_quitada') return 'gpp_bad';
  if (r.accion.startsWith('codigo_barras.') || r.accion.startsWith('presentacion.'))
    return 'barcode_scanner';
  if (r.accion.startsWith('no_recibir.')) return 'block';
  if (r.accion.startsWith('umbral.')) return 'tune';
  if (r.accion === 'movimiento.recepcion' || r.accion === 'remision.recibida')
    return 'move_to_inbox';
  if (r.accion.startsWith('reporte.') || r.accion.startsWith('necesidad.')) return 'campaign';
  if (r.accion.startsWith('sugerencia.') || r.accion.startsWith('motor.')) return 'alt_route';
  if (r.accion.startsWith('remision.')) return 'local_shipping';
  if (r.accion.startsWith('donador.')) return 'volunteer_activism';
  if (r.accion.startsWith('jornada.') || r.accion.startsWith('reserva')) return 'groups';
  if (r.accion.startsWith('importacion.')) return 'sync';
  if (r.accion.startsWith('plataforma.')) return 'hub';
  if (r.accion.startsWith('causa.')) return 'favorite';
  if (r.entidad === 'categoria') return 'inventory_2';
  if (r.entidad === 'emergencia') return 'emergency';
  if (r.entidad === 'comprobante') return 'receipt_long';
  if (r.entidad === 'movimiento') return 'swap_vert';
  if (r.entidad === 'acopio') return 'warehouse';
  if (r.entidad === 'entidad') return 'handshake';
  if (r.entidad === 'zona') return 'location_on';
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
