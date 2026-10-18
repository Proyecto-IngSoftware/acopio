import { dominioDe, hoyBogota, mismoDominio, porCerrar } from '@acopio/shared';
import type { FilaCausa } from './dao/causa.dao';

const isoFecha = (d: Date) => d.toISOString().slice(0, 10);
const diaSiguiente = (iso: string) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** Activa: sin archivar, con cierre desde hoy y con la entidad verificada (spec §4). */
export function esActiva(c: FilaCausa, hoy: string): boolean {
  return (
    c.archivada_en === null &&
    isoFecha(c.cierra_el) >= hoy &&
    c.entidad.verificacion === 'VERIFICADA'
  );
}

/** El día en que dejó de estar activa; nulo mientras siga activa. */
function cerroEl(c: FilaCausa, hoy: string): string | null {
  if (c.archivada_en) return hoyBogota(c.archivada_en);
  const cierra = isoFecha(c.cierra_el);
  return cierra < hoy ? diaSiguiente(cierra) : null;
}

/**
 * Lo que ve cualquiera. Si la entidad ya no está verificada, sin sello ni enlace (C-08).
 * Nunca dice quién creó ni quién archivó la causa.
 */
export function presentarCausaPublica(c: FilaCausa, hoy: string) {
  const verificada = c.entidad.verificacion === 'VERIFICADA';
  return {
    id: c.id,
    categoria: c.categoria,
    titulo: c.titulo,
    descripcion: c.descripcion,
    pasos: c.pasos as string[],
    urlOficial: verificada ? c.url_oficial : null,
    dominio: verificada ? dominioDe(c.url_oficial) : null,
    tieneImagen: c.imagen_key !== null,
    actualizadoEn: c.actualizado_en.toISOString(),
    publicadaEn: c.publicada_en.toISOString(),
    cierraEl: isoFecha(c.cierra_el),
    cerroEl: cerroEl(c, hoy),
    motivo: c.archivo_motivo,
    entidad: {
      id: c.entidad.id,
      nombre: c.entidad.nombre,
      tieneLogo: verificada && c.entidad.logo_key !== null,
      verificadaEn: verificada ? (c.entidad.verificada_en?.toISOString() ?? null) : null,
    },
  };
}

/** Para C22: el enlace siempre, el estado y las marcas para el Administrador. */
export function presentarCausaGestion(c: FilaCausa, hoy: string) {
  const activa = esActiva(c, hoy);
  return {
    ...presentarCausaPublica(c, hoy),
    urlOficial: c.url_oficial,
    dominio: dominioDe(c.url_oficial),
    estado: activa ? ('ACTIVA' as const) : ('ATENDIDA' as const),
    porCerrar: activa && porCerrar(isoFecha(c.cierra_el), hoy),
    dominioDistinto: c.entidad.sitio_web ? !mismoDominio(c.url_oficial, c.entidad.sitio_web) : true,
    creadaPor: c.creada_por,
  };
}
