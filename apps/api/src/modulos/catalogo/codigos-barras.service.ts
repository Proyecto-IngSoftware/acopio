import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from './dao/categoria.dao';
import { CodigoBarrasDao } from './dao/codigo-barras.dao';

type Fila = {
  ean: string;
  categoria_id: string;
  contenido: { toString(): string } | null;
  descripcion: string | null;
  revisado: boolean;
  creado_por: string;
  creado_en: Date;
  categoria: {
    nombre: string;
    unidad_base: 'LITRO' | 'KILOGRAMO' | 'UNIDAD';
    grupo: string;
    perecedero: boolean;
  };
};

const vista = (f: Fila) => ({
  ean: f.ean,
  categoriaId: f.categoria_id,
  categoria: f.categoria.nombre,
  unidad: f.categoria.unidad_base,
  contenido: f.contenido === null ? null : Number(f.contenido),
  descripcion: f.descripcion,
  revisado: f.revisado,
  grupo: f.categoria.grupo,
  perecedero: f.categoria.perecedero,
  creadoEn: f.creado_en,
});

/** En una categoría por unidades, una presentación trae un número entero de unidades. */
function exigirContenidoEntero(unidad: string, contenido: number | null) {
  if (unidad === 'UNIDAD' && contenido !== null && !Number.isInteger(contenido))
    throw new ErrorDominio(
      'CONTENIDO_FRACCIONARIO',
      'En una categoría por unidades, el contenido va sin decimales',
      422,
    );
}

/** EAN → categoría (RF-CAT-004). Un EAN de un Operador queda sin revisar. */
@Injectable()
export class CodigosBarrasService {
  constructor(
    private readonly dao: CodigoBarrasDao,
    private readonly categorias: CategoriaDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
  ) {}

  /** La vista con el nombre de quien asoció cada código (C18). Los nombres salen en una sola consulta. */
  private async conAutores(filas: Fila[], bd?: ClienteBd) {
    const ids = [...new Set(filas.map((f) => f.creado_por))];
    const nombres = new Map((await this.dao.autores(ids, bd)).map((u) => [u.id, u.nombre]));
    return filas.map((f) => ({ ...vista(f), creadoPor: nombres.get(f.creado_por) ?? null }));
  }

  private async conAutor(f: Fila, bd?: ClienteBd) {
    return (await this.conAutores([f], bd))[0]!;
  }

  async obtener(ean: string) {
    const f = await this.dao.conCategoria(ean);
    if (!f || f.categoria.archivada)
      throw new ErrorDominio(
        'EAN_DESCONOCIDO',
        'Este código no está asociado a ninguna categoría',
        404,
      );
    return this.conAutor(f);
  }

  listar(filtro: { revisado?: boolean }) {
    return this.dao.listar(filtro.revisado).then((filas) => this.conAutores(filas));
  }

  async asociar(
    usuario: UsuarioAutenticado,
    datos: {
      ean: string;
      categoriaId: string;
      contenido: number | null;
      descripcion: string | null;
    },
  ) {
    const cat = await this.categorias.buscar(datos.categoriaId);
    if (!cat || cat.archivada)
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    exigirContenidoEntero(cat.unidad_base, datos.contenido);
    if (await this.dao.buscar(datos.ean)) {
      throw new ErrorDominio(
        'EAN_YA_ASOCIADO',
        'Este código ya está asociado a una categoría',
        409,
      );
    }
    try {
      return await this.transacciones.ejecutar(async (tx) => {
        const f = await this.dao.crear(
          {
            ean: datos.ean,
            categoria_id: datos.categoriaId,
            contenido: datos.contenido,
            descripcion: datos.descripcion,
            creado_por: usuario.id,
            revisado: usuario.rol === 'ADMIN',
          },
          tx,
        );
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'codigo_barras.asociado',
          entidad: 'codigo_barras',
          entidadId: datos.ean,
          despues: vista(f),
        });
        return this.conAutor(f, tx);
      });
    } catch (e) {
      if (esLlaveDuplicada(e)) {
        throw new ErrorDominio(
          'EAN_YA_ASOCIADO',
          'Este código ya está asociado a una categoría',
          409,
        );
      }
      throw e;
    }
  }

  async editar(
    usuario: UsuarioAutenticado,
    ean: string,
    cambios: {
      categoriaId?: string;
      contenido?: number | null;
      descripcion?: string | null;
      revisado?: boolean;
    },
  ) {
    let unidadNueva: string | undefined;
    if (cambios.categoriaId) {
      const cat = await this.categorias.buscar(cambios.categoriaId);
      unidadNueva = cat?.unidad_base;
      if (!cat || cat.archivada) {
        throw new ErrorDominio(
          'CATEGORIA_NO_ENCONTRADA',
          'La categoría no existe o está archivada',
          404,
        );
      }
    }
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.dao.conCategoria(ean, tx);
      if (!antes)
        throw new ErrorDominio(
          'EAN_DESCONOCIDO',
          'Este código no está asociado a ninguna categoría',
          404,
        );
      // La regla mira cómo queda el código: la categoría y el contenido nuevos o los de antes
      exigirContenidoEntero(
        unidadNueva ?? antes.categoria.unidad_base,
        cambios.contenido !== undefined
          ? cambios.contenido
          : antes.contenido === null
            ? null
            : Number(antes.contenido),
      );
      const f = await this.dao.actualizar(
        ean,
        {
          categoria_id: cambios.categoriaId,
          contenido: cambios.contenido,
          descripcion: cambios.descripcion,
          revisado: cambios.revisado,
        },
        tx,
      );
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'codigo_barras.editado',
        entidad: 'codigo_barras',
        entidadId: ean,
        antes: vista(antes),
        despues: vista(f),
      });
      return this.conAutor(f, tx);
    });
  }
}
