import type { Componentes } from '@acopio/shared';
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
