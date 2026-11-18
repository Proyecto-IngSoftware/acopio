import { ForbiddenException, Injectable } from '@nestjs/common';
import { semaforo, vencimientoEstimado, type MovimientoParaVencimiento } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { MovimientoDao } from './dao/movimiento.dao';
import { SaldoDao } from './dao/saldo.dao';
import { UmbralDao } from './dao/umbral.dao';
import { aMovimientoVista } from './movimientos.service';

const POR_PAGINA = 50;

/** C3 Inventario e Historial (RF-INV-005, RF-INV-006). */
@Injectable()
export class ConsultasService {
  constructor(
    private readonly saldosDao: SaldoDao,
    private readonly umbrales: UmbralDao,
    private readonly movimientos: MovimientoDao,
    private readonly categorias: CategoriaDao,
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
      this.saldosDao.delAcopio(acopioId),
      this.umbrales.delAcopio(acopioId),
    ]);
    const ids = [
      ...new Set([...saldos.map((s) => s.categoria_id), ...umbrales.map((u) => u.categoria_id)]),
    ];
    const categorias = await this.categorias.varias(ids);
    const perecederas = categorias.filter((c) => c.perecedero).map((c) => c.id);
    const lotes = perecederas.length
      ? await this.movimientos.lotesPerecederos([acopioId], perecederas)
      : [];
    const lotesPorCategoria = new Map<string, MovimientoParaVencimiento[]>();
    for (const lote of lotes) {
      const movimientos = lotesPorCategoria.get(lote.categoria_id) ?? [];
      movimientos.push({
        tipo: lote.entrada ? 'ENTRADA' : 'AJUSTE',
        signo: lote.signo as 1 | -1,
        cantidad: Number(lote.total),
        venceEn: lote.vence_en?.toISOString().slice(0, 10) ?? null,
      });
      lotesPorCategoria.set(lote.categoria_id, movimientos);
    }
    const saldoPorCategoria = new Map(saldos.map((s) => [s.categoria_id, s]));
    const umbralPorCategoria = new Map(umbrales.map((u) => [u.categoria_id, u]));

    return categorias
      .map((c) => {
        const s = saldoPorCategoria.get(c.id);
        const u = umbralPorCategoria.get(c.id);
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
          vencimientos: c.perecedero ? vencimientoEstimado(lotesPorCategoria.get(c.id) ?? []) : [],
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
    const filas = await this.movimientos.historial(acopioId, categoriaId, desde, limite + 1);
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
