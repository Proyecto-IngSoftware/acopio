import { ErrorDominio } from '../../comun/errores/error-dominio';

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Builder de las líneas de una remisión en borrador. Junta lo que llega en varios pasos
 * (aprobar una sugerencia, crear a mano, reemplazar las líneas), suma lo repetido y valida
 * todo contra el movible antes de que el DAO escriba.
 */
export class PlanRemision {
  private readonly porCategoria = new Map<string, number>();

  agregar(categoriaId: string, cantidad: number): this {
    if (!(cantidad > 0))
      throw new ErrorDominio('CANTIDAD_INVALIDA', 'La cantidad debe ser mayor que cero');
    this.porCategoria.set(categoriaId, r3((this.porCategoria.get(categoriaId) ?? 0) + cantidad));
    return this;
  }

  validarContra(movible: Map<string, number>): this {
    for (const [categoriaId, cantidad] of this.porCategoria) {
      const maximo = movible.get(categoriaId) ?? 0;
      if (cantidad > maximo + 1e-9) {
        throw new ErrorDominio(
          'LINEA_EXCEDE_MOVIBLE',
          `Una línea pide ${cantidad} y el acopio solo puede mandar ${maximo}`,
          422,
          { categoriaId, maximo },
        );
      }
    }
    return this;
  }

  lineas(): { categoriaId: string; cantidad: number }[] {
    return [...this.porCategoria]
      .sort(([x], [y]) => x.localeCompare(y))
      .map(([categoriaId, cantidad]) => ({ categoriaId, cantidad }));
  }
}
