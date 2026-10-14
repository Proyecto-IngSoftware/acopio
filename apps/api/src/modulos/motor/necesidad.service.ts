import { Injectable } from '@nestjs/common';
import { coberturaGlobal, estadoZona } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { ZonaDao } from '../acopios/dao/zona.dao';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { exigirCantidad } from '../inventario/cantidades';
import { NecesidadDao } from './dao/necesidad.dao';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { EstadoMotorService } from './estado-motor.service';

/** C10 Ficha de zona (RF-MOT-002, 003) y excedentes de un acopio (RF-MOT-004). */
@Injectable()
export class NecesidadService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly zonas: ZonaDao,
    private readonly categorias: CategoriaDao,
    private readonly necesidades: NecesidadDao,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly estado: EstadoMotorService,
  ) {}

  async ficha(usuario: UsuarioAutenticado, zonaId: string, ahora = new Date()) {
    await this.alcance.exigir(usuario, 'ZONA', zonaId);
    const z = await this.zonas.conEmergencia(zonaId);
    if (!z) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
    const { demandas, cats } = await this.transacciones.ejecutar(async (tx) => {
      const zonas = await this.estado.zonas(tx, { zonaIds: [zonaId] });
      const demandas = await this.estado.demandas(tx, ahora, zonas);
      const cats = await this.estado.categorias(
        tx,
        demandas.map((d) => d.categoriaId),
      );
      return { demandas, cats };
    });
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
    const filas = await this.necesidades.reportesVigentes(zonaId, ahora);
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
    return this.transacciones.ejecutar(async (tx) => {
      const zona = await this.zonas.conEmergencia(zonaId, tx);
      if (!zona) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
      if (zona.emergencia.estado === 'CERRADA') {
        throw new ErrorDominio(
          'ZONA_SOLO_LECTURA',
          'La emergencia está cerrada: sus zonas quedan en solo lectura',
          409,
        );
      }
      const cat = await this.categorias.buscar(categoriaId, tx);
      if (!cat || cat.archivada)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      // Una categoría por unidades no recibe una necesidad fraccionaria (menor de la etapa 1)
      if (datos.cantidad !== null) exigirCantidad(datos.cantidad, cat.unidad_base);
      const previa = await this.necesidades.ultimaManual(tx, zonaId, categoriaId);
      const motivo = datos.motivo.trim();
      const fila = await this.necesidades.crearManual(tx, {
        zonaId,
        categoriaId,
        cantidad: datos.cantidad,
        motivo,
        usuarioId: admin.id,
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
    const { ofertas, cats } = await this.transacciones.ejecutar(async (tx) => {
      const acopios = await this.estado.acopios(tx, { acopioIds: [acopioId] });
      if (acopios.length === 0)
        throw new ErrorDominio('ACOPIO_NO_ENCONTRADO', 'El acopio no existe', 404);
      const ofertas = await this.estado.ofertas(tx, ahora, acopios);
      const cats = await this.estado.categorias(
        tx,
        ofertas.map((o) => o.categoriaId),
      );
      return { ofertas, cats };
    });
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
