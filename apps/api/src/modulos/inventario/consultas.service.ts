import { ForbiddenException, Injectable } from '@nestjs/common';
import { semaforo, vencimientoEstimado } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Movimiento } from '../../generado/prisma/client';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { aMovimientoVista } from './movimientos.service';

const POR_PAGINA = 50;

/** C3 Inventario e Historial (RF-INV-005, RF-INV-006). */
@Injectable()
export class ConsultasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alcance: AlcanceService,
  ) {}

  /** Administrador y Auditor leen cualquier acopio (§1.7); el Operador, el suyo. */
  async exigirLectura(usuario: UsuarioAutenticado, acopioId: string) {
    if (usuario.rol === 'ADMIN' || usuario.rol === 'AUDITOR') return;
    if (usuario.rol === 'OPERADOR' && (await this.alcance.puede(usuario, 'ACOPIO', acopioId)))
      return;
    throw new ForbiddenException('No puedes consultar el inventario de este acopio');
  }

  async saldos(usuario: UsuarioAutenticado, acopioId: string) {
    await this.exigirLectura(usuario, acopioId);
    const [saldos, umbrales] = await Promise.all([
      this.prisma.saldo.findMany({ where: { acopio_id: acopioId } }),
      this.prisma.umbral.findMany({ where: { acopio_id: acopioId } }),
    ]);
    const ids = [
      ...new Set([...saldos.map((s) => s.categoria_id), ...umbrales.map((u) => u.categoria_id)]),
    ];
    const categorias = await this.prisma.categoria.findMany({ where: { id: { in: ids } } });
    const perecederas = categorias.filter((c) => c.perecedero).map((c) => c.id);
    const movimientos = perecederas.length
      ? await this.prisma.movimiento.findMany({
          where: { acopio_id: acopioId, categoria_id: { in: perecederas } },
          select: { categoria_id: true, tipo: true, signo: true, cantidad: true, vence_en: true },
        })
      : [];

    return categorias
      .map((c) => {
        const s = saldos.find((x) => x.categoria_id === c.id);
        const u = umbrales.find((x) => x.categoria_id === c.id);
        const cantidad = s ? Number(s.cantidad) : 0;
        const umbral = u ? { minimo: Number(u.minimo), maximo: Number(u.maximo) } : null;
        return {
          categoriaId: c.id,
          categoria: c.nombre,
          grupo: c.grupo,
          unidad: c.unidad_base,
          perecedero: c.perecedero,
          cantidad,
          umbral,
          semaforo: semaforo(cantidad, umbral),
          ultimoMovimiento: s?.ultimo_movimiento ?? null,
          vencimientos: c.perecedero
            ? vencimientoEstimado(
                movimientos
                  .filter((m) => m.categoria_id === c.id)
                  .map((m) => ({
                    tipo: m.tipo,
                    signo: m.signo as 1 | -1,
                    cantidad: Number(m.cantidad),
                    venceEn: m.vence_en ? m.vence_en.toISOString().slice(0, 10) : null,
                  })),
              )
            : [],
        };
      })
      .sort((x, y) => x.categoria.localeCompare(y.categoria, 'es-CO'));
  }

  async historial(
    usuario: UsuarioAutenticado,
    acopioId: string,
    categoriaId: string,
    opciones: { cursor?: string; limite?: number },
  ) {
    await this.exigirLectura(usuario, acopioId);
    const limite = opciones.limite ?? POR_PAGINA;
    const desde = opciones.cursor ? leerCursor(opciones.cursor) : null;
    const filas = await this.prisma.$queryRaw<
      (Movimiento & { usuario_nombre: string; saldo_despues: string })[]
    >`
      SELECT * FROM (
        SELECT m.*, u.nombre AS usuario_nombre,
               (SUM(m.cantidad * m.signo) OVER (ORDER BY m.secuencia))::text AS saldo_despues
        FROM movimiento m JOIN usuario u ON u.id = m.usuario_id
        WHERE m.acopio_id = ${acopioId}::uuid AND m.categoria_id = ${categoriaId}::uuid
      ) t
      WHERE ${desde === null} OR t.secuencia < ${desde ?? 0n}
      ORDER BY t.secuencia DESC
      LIMIT ${limite + 1}`;
    const pagina = filas.slice(0, limite);
    const ultima = pagina.at(-1);
    return {
      filas: pagina.map((f) => ({
        ...aMovimientoVista(f),
        usuario: f.usuario_nombre,
        saldoDespues: Number(f.saldo_despues),
      })),
      siguiente: filas.length > limite && ultima ? String(ultima.secuencia) : null,
    };
  }
}

/** El cursor es la secuencia del último movimiento de la página anterior. */
function leerCursor(cursor: string): bigint {
  if (!/^\d{1,19}$/.test(cursor)) {
    throw new ErrorDominio('CURSOR_INVALIDO', 'El cursor de la página no es válido', 400);
  }
  return BigInt(cursor);
}
