import { Injectable } from '@nestjs/common';
import { VIGENCIA_REPORTE_DIAS, coberturaGlobal, estadoZona } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { EstadoMotorService } from './estado-motor.service';

/** C10 Ficha de zona (RF-MOT-002, 003) y excedentes de un acopio (RF-MOT-004). */
@Injectable()
export class NecesidadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly estado: EstadoMotorService,
  ) {}

  async ficha(usuario: UsuarioAutenticado, zonaId: string, ahora = new Date()) {
    await this.alcance.exigir(usuario, 'ZONA', zonaId);
    const z = await this.prisma.zona.findUnique({
      where: { id: zonaId },
      include: { emergencia: true },
    });
    if (!z) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
    const zonas = await this.estado.zonas(this.prisma, { zonaIds: [zonaId] });
    const demandas = await this.estado.demandas(this.prisma, ahora, zonas);
    const cats = await this.estado.categorias(
      this.prisma,
      demandas.map((d) => d.categoriaId),
    );
    const categorias = demandas
      .map((d) => {
        const c = cats.find((x) => x.id === d.categoriaId)!;
        const e = estadoZona(d.necesidad, d.recibido, d.enCamino);
        return {
          categoriaId: d.categoriaId,
          categoria: c.nombre,
          unidad: c.unidad,
          origen: d.origen,
          cantidadPersonaDia: d.cantidadPersonaDia,
          fuenteCanasta: d.fuenteCanasta,
          manual: d.manual,
          necesidad: d.necesidad,
          recibido: d.recibido,
          enCamino: d.enCamino,
          deficit: e?.deficit ?? 0,
          cobertura: e?.cobertura ?? null,
        };
      })
      .sort((x, y) => x.categoria.localeCompare(y.categoria, 'es'));
    const conCobertura = categorias.filter((c) => c.cobertura !== null);
    const masBaja = conCobertura.reduce<(typeof conCobertura)[number] | null>(
      (min, c) => (!min || c.cobertura! < min.cobertura! ? c : min),
      null,
    );
    return {
      zona: {
        id: z.id,
        nombre: z.nombre,
        municipio: z.municipio,
        poblacionEstimada: z.poblacion_estimada,
        poblacionFuente: z.poblacion_fuente,
        poblacionFecha: z.poblacion_fecha,
        emergencia: {
          id: z.emergencia.id,
          nombre: z.emergencia.nombre,
          estado: z.emergencia.estado,
          horizonteDias: z.emergencia.horizonte_dias,
        },
      },
      categorias,
      coberturaGlobal: coberturaGlobal(conCobertura.map((c) => c.cobertura!)),
      categoriaMasBaja: masBaja
        ? {
            categoriaId: masBaja.categoriaId,
            categoria: masBaja.categoria,
            cobertura: masBaja.cobertura!,
          }
        : null,
      reportes: await this.reportesVigentes(zonaId, ahora),
    };
  }

  /** RF-MOT-011: el último reporte de cada categoría, si no está resuelto y es reciente. */
  private async reportesVigentes(zonaId: string, ahora: Date) {
    const filas = await this.prisma.$queryRaw<
      { categoria_id: string; categoria: string; nota: string | null; reportado_en: Date }[]
    >`
      SELECT t.categoria_id, t.categoria, t.nota, t.reportado_en FROM (
        SELECT DISTINCT ON (r.categoria_id)
               r.categoria_id, c.nombre AS categoria, r.nota, r.resuelta, r.reportado_en
        FROM reporte_necesidad r JOIN categoria c ON c.id = r.categoria_id
        WHERE r.zona_id = ${zonaId}::uuid
        ORDER BY r.categoria_id, r.reportado_en DESC
      ) t
      WHERE NOT t.resuelta
        AND t.reportado_en >= ${ahora}::timestamptz - make_interval(days => ${VIGENCIA_REPORTE_DIAS}::int)
      ORDER BY t.reportado_en DESC`;
    return filas.map((f) => ({
      categoriaId: f.categoria_id,
      categoria: f.categoria,
      nota: f.nota,
      reportadoEn: f.reportado_en,
    }));
  }

  async ponerManual(
    admin: UsuarioAutenticado,
    zonaId: string,
    categoriaId: string,
    datos: { cantidad: number | null; motivo: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const zona = await tx.zona.findUnique({
        where: { id: zonaId },
        include: { emergencia: { select: { estado: true } } },
      });
      if (!zona) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
      if (zona.emergencia.estado === 'CERRADA') {
        throw new ErrorDominio(
          'ZONA_SOLO_LECTURA',
          'La emergencia está cerrada: sus zonas quedan en solo lectura',
          409,
        );
      }
      const cat = await tx.categoria.findUnique({ where: { id: categoriaId } });
      if (!cat || cat.archivada)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      const previa = await tx.necesidadManual.findFirst({
        where: { zona_id: zonaId, categoria_id: categoriaId },
        orderBy: { puesta_en: 'desc' },
      });
      const motivo = datos.motivo.trim();
      const fila = await tx.necesidadManual.create({
        data: {
          zona_id: zonaId,
          categoria_id: categoriaId,
          cantidad: datos.cantidad,
          motivo,
          puesta_por: admin.id,
          puesta_en: new Date(),
        },
      });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'necesidad.manual',
        entidad: 'necesidad_manual',
        entidadId: fila.id,
        ubicacionId: zonaId,
        antes: {
          categoria: cat.nombre,
          cantidad: previa?.cantidad != null ? Number(previa.cantidad) : null,
        },
        despues: { categoria: cat.nombre, cantidad: datos.cantidad, motivo },
      });
      return { categoriaId, cantidad: datos.cantidad, motivo, puestaEn: fila.puesta_en };
    });
  }

  async excedentes(usuario: UsuarioAutenticado, acopioId: string, ahora = new Date()) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    const acopios = await this.estado.acopios(this.prisma, { acopioIds: [acopioId] });
    if (acopios.length === 0)
      throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
    const ofertas = await this.estado.ofertas(this.prisma, ahora, acopios);
    const cats = await this.estado.categorias(
      this.prisma,
      ofertas.map((o) => o.categoriaId),
    );
    return ofertas
      .map((o) => {
        const c = cats.find((x) => x.id === o.categoriaId)!;
        return {
          categoriaId: o.categoriaId,
          categoria: c.nombre,
          unidad: c.unidad,
          saldo: o.saldo,
          umbral: o.umbral,
          noRecibe: o.noRecibe,
          superavit: o.superavit,
          comprometido: o.comprometido,
          vencido: o.vencido,
          movible: o.movible,
          diasParaVencer: o.diasParaVencer,
          aviso: o.aviso,
        };
      })
      .sort((x, y) => x.categoria.localeCompare(y.categoria, 'es'));
  }
}
