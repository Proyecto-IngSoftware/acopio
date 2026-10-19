import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import { BitacoraService } from '../auditoria/bitacora.service';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { CanastaDao } from './dao/canasta.dao';
import { CategoriaDao } from './dao/categoria.dao';

/**
 * Canasta estándar (RF-CAT-003). Versionada por vigente_desde: un cambio agrega una
 * fila y deja las anteriores como estaban. La fuente es obligatoria.
 */
@Injectable()
export class CanastaService {
  constructor(
    private readonly canasta: CanastaDao,
    private readonly categorias: CategoriaDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
  ) {}

  /** La versión vigente hoy (o en `fecha`) de cada categoría que tiene canasta. */
  async vigente(fecha = new Date()) {
    const filas = await this.canasta.vigente(fecha);
    return filas
      .map((f) => ({
        categoriaId: f.categoria_id,
        categoria: f.categoria,
        unidadBase: f.unidad_base,
        cantidadPersonaDia: Number(f.cantidad_persona_dia),
        fuente: f.fuente,
        vigenteDesde: f.vigente_desde,
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es'));
  }

  async historial(categoriaId: string) {
    const filas = await this.canasta.historial(categoriaId);
    return filas.map((f) => ({
      id: f.id,
      cantidadPersonaDia: Number(f.cantidad_persona_dia),
      fuente: f.fuente,
      vigenteDesde: f.vigente_desde,
    }));
  }

  async agregarVersion(
    admin: UsuarioAutenticado,
    categoriaId: string,
    datos: { cantidadPersonaDia: number; fuente: string; vigenteDesde: Date },
  ) {
    return this.transacciones.ejecutar(async (tx) => {
      const categoria = await this.categorias.buscar(categoriaId, tx);
      if (!categoria)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      const fila = await this.canasta
        .crear(
          {
            categoria_id: categoriaId,
            cantidad_persona_dia: datos.cantidadPersonaDia,
            fuente: datos.fuente.trim(),
            vigente_desde: datos.vigenteDesde,
          },
          tx,
        )
        .catch((error: unknown) => {
          if (restriccionUnicaViolada(error) === null) throw error;
          throw new ErrorDominio(
            'VERSION_EXISTENTE',
            'Ya hay una versión de la canasta con esa fecha para esta categoría',
            409,
          );
        });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'canasta.version_agregada',
        entidad: 'categoria',
        entidadId: categoriaId,
        despues: datos,
      });
      return {
        id: fila.id,
        cantidadPersonaDia: Number(fila.cantidad_persona_dia),
        fuente: fila.fuente,
        vigenteDesde: fila.vigente_desde,
      };
    });
  }
}
