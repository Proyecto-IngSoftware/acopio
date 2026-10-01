import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { ErrorDominio } from '../../comun/errores/error-dominio';

/** La categoría de un movimiento: existe y no está archivada. */
export async function categoriaParaMovimiento(tx: ClienteBd, categoriaId: string) {
  const cat = await tx.categoria.findUnique({
    where: { id: categoriaId },
    select: { id: true, nombre: true, unidad_base: true, perecedero: true, archivada: true },
  });
  if (!cat) throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
  if (cat.archivada) {
    throw new ErrorDominio(
      'CATEGORIA_ARCHIVADA',
      'La categoría está archivada y no admite movimientos',
    );
  }
  return cat;
}

/** Las categorías por unidad solo aceptan enteros. */
export function exigirCantidad(cantidad: number, unidad: 'LITRO' | 'KILOGRAMO' | 'UNIDAD') {
  if (unidad === 'UNIDAD' && !Number.isInteger(cantidad)) {
    throw new ErrorDominio('CANTIDAD_ENTERA', 'Esta categoría se cuenta por unidades enteras');
  }
}
