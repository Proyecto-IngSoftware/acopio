import { Injectable } from '@nestjs/common';
import { RADIO_ZONA_PUBLICA_KM, VIGENCIA_REPORTE_DIAS } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { Transacciones } from '../../comun/prisma/transacciones';
import { ZonaDao } from '../acopios/dao/zona.dao';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { exigirZonaPropia } from './alcance-zona';
import { NecesidadDao } from './dao/necesidad.dao';

const DIA = 86_400_000;
const redondo = (n: number) => Math.round(n * 100) / 100;

/** RF-MOT-011: lo que el Receptor reporta en su zona, y la capa pública (RF-RED-009, M-09). */
@Injectable()
export class ReportesService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly necesidades: NecesidadDao,
    private readonly zonas: ZonaDao,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  /** Una fila por categoría; la nota es pública (el DTO lo avisa). */
  async reportar(
    usuario: UsuarioAutenticado,
    zonaId: string,
    d: { categorias: string[]; nota?: string; resuelta: boolean },
  ) {
    await exigirZonaPropia(this.alcance, usuario, zonaId);
    const nota = d.nota?.trim() || null;
    return this.transacciones.ejecutar(async (tx) => {
      const creados = [];
      for (const categoriaId of new Set(d.categorias)) {
        const r = await this.necesidades.crearReporte(tx, {
          zonaId,
          categoriaId,
          nota,
          resuelta: d.resuelta,
          usuarioId: usuario.id,
        });
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'reporte.necesidad',
          entidad: 'reporte_necesidad',
          entidadId: r.id,
          ubicacionId: zonaId,
          despues: { categoria: r.categoria.nombre, nota, resuelta: d.resuelta },
        });
        creados.push(r.id);
      }
      return { creados };
    });
  }

  async deZona(usuario: UsuarioAutenticado, zonaId: string, ahora = new Date()) {
    await exigirZonaPropia(this.alcance, usuario, zonaId);
    const filas = await this.necesidades.reportesRecientes(
      zonaId,
      new Date(ahora.getTime() - VIGENCIA_REPORTE_DIAS * DIA),
    );
    return filas.map((f) => ({
      id: f.id,
      categoriaId: f.categoria_id,
      categoria: f.categoria.nombre,
      nota: f.nota,
      resuelta: f.resuelta,
      reportadoPor: f.reportante.nombre,
      reportadoEn: f.reportado_en,
    }));
  }

  /** M-09: el círculo de cada zona con lo reportado; sin población, déficit ni nombres (E2-02). */
  async capaPublica(ahora = new Date()) {
    const [zonas, reportes] = await Promise.all([
      this.zonas.paraPublico(),
      this.necesidades.vigentesPublicos(ahora),
    ]);
    return zonas.map((z) => ({
      zonaId: z.id,
      centro: { lat: redondo(Number(z.lat)), lng: redondo(Number(z.lng)) },
      radioKm: RADIO_ZONA_PUBLICA_KM,
      necesidades: reportes
        .filter((r) => r.zona_id === z.id)
        .map((r) => ({ categoria: r.categoria, nota: r.nota, reportadoEn: r.reportado_en })),
    }));
  }
}
