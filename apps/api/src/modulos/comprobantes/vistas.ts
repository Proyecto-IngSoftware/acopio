import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import type { Prisma } from '../../generado/prisma/client';
import { normalizarFolio } from './folio';

export const CON_LINEAS = {
  acopio: { select: { id: true, nombre: true } },
  lineas: {
    include: { categoria: { select: { nombre: true, unidad_base: true, perecedero: true } } },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ComprobanteInclude;

export type ComprobanteConLineas = Prisma.ComprobanteGetPayload<{ include: typeof CON_LINEAS }>;

const soloDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const numero = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

export function aComprobanteVista(c: ComprobanteConLineas) {
  return {
    folio: c.folio,
    estado: c.estado,
    acopio: c.acopio,
    creadoEn: c.creado_en,
    recibidoEn: c.recibido_en,
    verificadoEn: c.verificado_en,
    motivoRechazo: c.motivo_rechazo,
    notaRechazo: c.nota_rechazo,
    tieneFactura: Boolean(c.factura_key),
    lineas: c.lineas.map((l) => ({
      id: l.id,
      categoriaId: l.categoria_id,
      categoria: l.categoria.nombre,
      unidad: l.categoria.unidad_base,
      perecedero: l.categoria.perecedero,
      ean: l.ean,
      contenidoUnitario: Number(l.contenido_unitario),
      cantidadDeclarada: Number(l.cantidad_declarada),
      cantidadConfirmada: numero(l.cantidad_confirmada),
      venceEn: soloDia(l.vence_en),
      motivoDiferencia: l.motivo_diferencia,
    })),
  };
}

export type ComprobanteVista = ReturnType<typeof aComprobanteVista>;

/** Un folio mal escrito y uno que no existe dan el mismo 404 (RF-CMP-006). */
export async function buscarPorFolio(cliente: ClienteBd, texto: string) {
  const folio = normalizarFolio(texto);
  const c = folio
    ? await cliente.comprobante.findUnique({ where: { folio }, include: CON_LINEAS })
    : null;
  if (!c) throw new ErrorDominio('FOLIO_NO_ENCONTRADO', 'No encontramos ese folio', 404);
  return c;
}

export const estadoInvalido = (estado: string, accion: string) =>
  new ErrorDominio(
    'ESTADO_INVALIDO',
    `Esta donación está ${estado.toLowerCase()}: no se puede ${accion}`,
    409,
    { estado },
  );
