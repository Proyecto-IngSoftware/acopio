import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { categoriaParaMovimiento } from './cantidades';
import { UmbralDao } from './dao/umbral.dao';

/** Mínimo y máximo por acopio y categoría (RF-INV-007). Operador asignado o Administrador. */
@Injectable()
export class UmbralesService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly umbrales: UmbralDao,
    private readonly categorias: CategoriaDao,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
  ) {}

  async fijar(
    usuario: UsuarioAutenticado,
    acopioId: string,
    categoriaId: string,
    datos: { minimo: number; maximo: number },
  ) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.acopios.exigirAbierto(acopioId);
    const guardar = () =>
      this.transacciones.ejecutar(async (tx) => {
        const cat = await categoriaParaMovimiento(this.categorias, tx, categoriaId);
        const antes = await this.umbrales.buscar(acopioId, categoriaId, tx);
        const fila = await this.umbrales.guardar(tx, acopioId, categoriaId, {
          ...datos,
          usuarioId: usuario.id,
        });
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'umbral.fijado',
          entidad: 'acopio',
          entidadId: acopioId,
          ubicacionId: acopioId,
          antes: antes
            ? { categoria: cat.nombre, minimo: Number(antes.minimo), maximo: Number(antes.maximo) }
            : null,
          despues: { categoria: cat.nombre, ...datos },
        });
        return {
          categoriaId,
          minimo: Number(fila.minimo),
          maximo: Number(fila.maximo),
          actualizadoEn: fila.actualizado_en,
        };
      });
    try {
      return await guardar();
    } catch (e) {
      // Dos PUT simultáneos de un umbral nuevo: el upsert de Prisma no es atómico y el
      // segundo choca con la llave; al repetirlo ya encuentra la fila y la actualiza
      if (esLlaveDuplicada(e)) return guardar();
      throw e;
    }
  }

  async quitar(usuario: UsuarioAutenticado, acopioId: string, categoriaId: string) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.acopios.exigirAbierto(acopioId);
    await this.transacciones.ejecutar(async (tx) => {
      const antes = await this.umbrales.buscar(acopioId, categoriaId, tx);
      if (!antes) return;
      await this.umbrales.borrar(tx, acopioId, categoriaId);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'umbral.quitado',
        entidad: 'acopio',
        entidadId: acopioId,
        ubicacionId: acopioId,
        antes: {
          categoria: antes.categoria.nombre,
          minimo: Number(antes.minimo),
          maximo: Number(antes.maximo),
        },
      });
    });
  }
}
