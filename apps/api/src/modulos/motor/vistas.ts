import type { Componentes } from '@acopio/shared';
import type { RemisionConLineas } from './dao/remision.dao';
import type { Prisma } from '../../generado/prisma/client';

export const INCLUIR_SUGERENCIA = {
  acopio: { select: { nombre: true } },
  zona: { select: { nombre: true } },
  emergencia: { select: { nombre: true } },
  categoria: { select: { nombre: true, unidad_base: true } },
  remision: { select: { codigo: true } },
  decisor: { select: { nombre: true } },
} as const;

export type FilaSugerencia = Prisma.SugerenciaGetPayload<{ include: typeof INCLUIR_SUGERENCIA }>;

export const aSugerenciaVista = (s: FilaSugerencia) => ({
  id: s.id,
  ronda: s.ronda,
  estado: s.estado,
  acopio: { id: s.acopio_id, nombre: s.acopio.nombre },
  zona: { id: s.zona_id, nombre: s.zona.nombre },
  emergencia: { id: s.emergencia_id, nombre: s.emergencia.nombre },
  categoria: { id: s.categoria_id, nombre: s.categoria.nombre, unidad: s.categoria.unidad_base },
  cantidad: Number(s.cantidad),
  puntaje: Number(s.puntaje),
  desglose: s.desglose as unknown as Componentes,
  justificacion: s.justificacion,
  cantidadAprobada: s.cantidad_aprobada === null ? null : Number(s.cantidad_aprobada),
  remisionCodigo: s.remision?.codigo ?? null,
  motivoDescarte: s.motivo_descarte,
  decididaPor: s.decisor?.nombre ?? null,
  decididaEn: s.decidida_en,
});

export const aRemisionVista = (r: RemisionConLineas) => ({
  id: r.id,
  codigo: r.codigo,
  estado: r.estado,
  acopio: r.acopio_origen,
  zona: r.zona_destino,
  responsable: r.responsable,
  qrToken: r.qr_token,
  creadaEn: r.creada_en,
  despachadaEn: r.despachada_en,
  recibidaEn: r.recibida_en,
  canceladaEn: r.cancelada_en,
  motivoCancelacion: r.motivo_cancelacion,
  notaRecepcion: r.nota_recepcion,
  evidencias: r.evidencia_keys.length,
  folios: r.comprobantes.map((c) => c.comprobante.folio),
  lineas: r.lineas.map((l) => ({
    categoriaId: l.categoria_id,
    categoria: l.categoria.nombre,
    unidad: l.categoria.unidad_base,
    cantidadPlaneada: Number(l.cantidad_planeada),
    cantidadRecibida: l.cantidad_recibida === null ? null : Number(l.cantidad_recibida),
  })),
});

export type RemisionVista = ReturnType<typeof aRemisionVista>;
