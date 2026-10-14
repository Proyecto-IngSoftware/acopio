import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { ComprobanteDao } from './dao/comprobante.dao';
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
  constructor(private readonly comprobantes: ComprobanteDao) {}

  async consultar(texto: string) {
    const folio = normalizarFolio(texto);
    if (!folio) throw noEncontrado();
    const c = await this.comprobantes.paraSeguimiento(folio);
    if (!c) throw noEncontrado();
    const recibida = c.recibido_en !== null;
    // RF-CMP-007, E2-03: de cada remisión solo el estado y las fechas, sin código ni zona
    const remisiones = c.remisiones.map(({ remision: r }) => ({
      estado: r.estado as 'EN_TRANSITO' | 'RECIBIDA',
      despachadaEn: r.despachada_en,
      recibidaEn: r.recibida_en,
    }));
    const llegadas = remisiones
      .map((r) => r.recibidaEn)
      .filter((d): d is Date => d !== null)
      .sort((x, y) => x.getTime() - y.getTime());
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
        // Solo cuando el folio ya salió hacia una zona: sin remisión, ese paso no le toca
        ...(remisiones.length
          ? [{ paso: 'RECIBIDA_EN_DESTINO' as const, en: llegadas[0] ?? null }]
          : []),
      ],
      recibidoEnDestino: llegadas.length > 0,
      remisiones,
      parteDeTuDonacion: remisiones.length > 1,
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
