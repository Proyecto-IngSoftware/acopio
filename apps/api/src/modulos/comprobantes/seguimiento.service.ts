import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { normalizarFolio } from './folio';

const ETIQUETAS = {
  PREPARADO: 'Preparada',
  PENDIENTE: 'Recibida en el acopio',
  CONCILIADO: 'Conciliada, en el acopio',
  RECHAZADO: 'No se pudo conciliar',
  CANCELADO: 'Cancelada',
} as const;

const noEncontrado = () => new ErrorDominio('FOLIO_NO_ENCONTRADO', 'No encontramos ese folio', 404);
const redondo = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Seguimiento público (RF-CMP-006): el recorrido del insumo y lo donado. Nunca datos del
 * Donador ni la factura; por eso selecciona campo por campo y no reusa la vista del comprobante.
 */
@Injectable()
export class SeguimientoService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(texto: string) {
    const folio = normalizarFolio(texto);
    if (!folio) throw noEncontrado();
    const c = await this.prisma.comprobante.findUnique({
      where: { folio },
      select: {
        folio: true,
        estado: true,
        creado_en: true,
        recibido_en: true,
        verificado_en: true,
        acopio: { select: { nombre: true } },
        lineas: {
          select: {
            cantidad_declarada: true,
            cantidad_confirmada: true,
            contenido_unitario: true,
            categoria: { select: { nombre: true, unidad_base: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!c) throw noEncontrado();
    const recibida = c.recibido_en !== null;
    return {
      folio: c.folio,
      estado: ETIQUETAS[c.estado],
      pasos: [
        { paso: 'PREPARADA' as const, en: c.creado_en },
        {
          paso: 'RECIBIDA' as const,
          en: c.recibido_en,
          ...(recibida ? { acopio: c.acopio.nombre } : {}),
        },
        { paso: 'CONCILIADA' as const, en: c.estado === 'CONCILIADO' ? c.verificado_en : null },
      ],
      // Antes de recibir se muestra lo declarado; después, lo que de verdad entró
      lineas: c.lineas
        .map((l) => ({
          categoria: l.categoria.nombre,
          unidad: l.categoria.unidad_base,
          cantidad: redondo(
            Number(recibida ? (l.cantidad_confirmada ?? 0) : l.cantidad_declarada) *
              Number(l.contenido_unitario),
          ),
          confirmada: recibida,
        }))
        .filter((l) => !recibida || l.cantidad > 0),
    };
  }
}
