import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { NoRecibirDao } from './dao/no-recibir.dao';

const soloDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** «No recibir» por categoría y acopio (RF-INV-008, B-02, B-06). */
@Injectable()
export class NoRecibirService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly marcas: NoRecibirDao,
    private readonly categorias: CategoriaDao,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
  ) {}

  async listar(acopioId: string) {
    const filas = await this.marcas.vigentesDelAcopio(acopioId, hoyEnBogota());
    return filas.map((f) => ({
      categoriaId: f.categoria_id,
      categoria: f.categoria.nombre,
      hasta: soloDia(f.hasta),
      marcadoEn: f.marcado_en,
    }));
  }

  async porCategoria(categoriaId: string) {
    const filas = await this.marcas.vigentesPorCategoria(categoriaId, hoyEnBogota());
    return filas.map((f) => ({ acopioId: f.acopio_id, hasta: soloDia(f.hasta) }));
  }

  async marcar(
    usuario: UsuarioAutenticado,
    acopioId: string,
    categoriaId: string,
    hasta: Date | null,
  ) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.acopios.exigirAbierto(acopioId);
    if (hasta && hasta < hoyEnBogota()) {
      throw new ErrorDominio('FECHA_PASADA', 'La fecha de reapertura ya pasó');
    }
    const cat = await this.categorias.buscar(categoriaId);
    if (!cat || cat.archivada) {
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    }
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.marcas.buscar(acopioId, categoriaId, tx);
      const fila = await this.marcas.guardar(tx, acopioId, categoriaId, {
        hasta,
        usuarioId: usuario.id,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'no_recibir.marcado',
        entidad: 'acopio',
        entidadId: acopioId,
        ubicacionId: acopioId,
        antes: antes ? { categoria: cat.nombre, hasta: soloDia(antes.hasta) } : null,
        despues: { categoria: cat.nombre, hasta: soloDia(hasta) },
      });
      return {
        categoriaId,
        categoria: cat.nombre,
        hasta: soloDia(fila.hasta),
        marcadoEn: fila.marcado_en,
      };
    });
  }

  async desmarcar(usuario: UsuarioAutenticado, acopioId: string, categoriaId: string) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.transacciones.ejecutar(async (tx) => {
      const antes = await this.marcas.buscar(acopioId, categoriaId, tx);
      if (!antes) return;
      await this.marcas.borrar(tx, acopioId, categoriaId);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'no_recibir.desmarcado',
        entidad: 'acopio',
        entidadId: acopioId,
        ubicacionId: acopioId,
        antes: { categoria: antes.categoria.nombre, hasta: soloDia(antes.hasta) },
      });
    });
  }
}
