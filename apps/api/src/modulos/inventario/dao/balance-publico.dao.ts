import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';

type ConteoCategoria = {
  categoriaId: string;
  categoria: string;
  faltan: number;
  noTraigan: number;
};

@Injectable()
export class BalancePublicoDao {
  constructor(private readonly prisma: PrismaService) {}

  async portada(hoy: Date) {
    const [fila] = await this.prisma.$queryRaw<
      { panel: ConteoCategoria[]; categoriasFaltantes: number; acopiosConFaltantes: number }[]
    >`
      WITH inventario AS (
        SELECT u.acopio_id, u.categoria_id, true AS bajo, false AS no_recibe
        FROM umbral u
        JOIN acopio a ON a.id = u.acopio_id AND a.estado <> 'CERRADO'
        LEFT JOIN saldo s USING (acopio_id, categoria_id)
        WHERE COALESCE(s.cantidad, 0) < u.minimo
        UNION ALL
        SELECT n.acopio_id, n.categoria_id, false, true
        FROM no_recibir n
        JOIN acopio a ON a.id = n.acopio_id AND a.estado <> 'CERRADO'
        WHERE n.hasta IS NULL OR n.hasta >= ${hoy}::date
      ), pares AS (
        SELECT acopio_id, categoria_id, bool_or(bajo) AS bajo, bool_or(no_recibe) AS no_recibe
        FROM inventario
        GROUP BY acopio_id, categoria_id
      ), categorias AS (
        SELECT p.categoria_id, c.nombre, count(*) FILTER (WHERE p.bajo) AS faltan,
               count(*) FILTER (WHERE p.no_recibe) AS no_traigan
        FROM pares p JOIN categoria c ON c.id = p.categoria_id
        GROUP BY p.categoria_id, c.nombre
      )
      SELECT (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                 'categoriaId', categoria_id, 'categoria', nombre,
                 'faltan', faltan, 'noTraigan', no_traigan
              )), '[]'::jsonb) FROM categorias) AS panel,
             count(DISTINCT categoria_id)::int AS "categoriasFaltantes",
             count(DISTINCT acopio_id)::int AS "acopiosConFaltantes"
      FROM pares
      WHERE bajo AND NOT no_recibe`;
    return fila!;
  }
}
