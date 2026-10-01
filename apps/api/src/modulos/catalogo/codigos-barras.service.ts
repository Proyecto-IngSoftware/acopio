import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { BitacoraService } from '../auditoria/bitacora.service';

const conCategoria = {
  categoria: { select: { nombre: true, unidad_base: true, archivada: true } },
} as const;

type Fila = {
  ean: string;
  categoria_id: string;
  contenido: { toString(): string } | null;
  descripcion: string | null;
  revisado: boolean;
  categoria: { nombre: string; unidad_base: 'LITRO' | 'KILOGRAMO' | 'UNIDAD' };
};

const vista = (f: Fila) => ({
  ean: f.ean,
  categoriaId: f.categoria_id,
  categoria: f.categoria.nombre,
  unidad: f.categoria.unidad_base,
  contenido: f.contenido === null ? null : Number(f.contenido),
  descripcion: f.descripcion,
  revisado: f.revisado,
});

/** EAN → categoría (RF-CAT-004). Un EAN de un Operador queda sin revisar. */
@Injectable()
export class CodigosBarrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async obtener(ean: string) {
    const f = await this.prisma.codigoBarras.findUnique({ where: { ean }, include: conCategoria });
    if (!f || f.categoria.archivada)
      throw new ErrorDominio(
        'EAN_DESCONOCIDO',
        'Este código no está asociado a ninguna categoría',
        404,
      );
    return vista(f);
  }

  listar(filtro: { revisado?: boolean }) {
    return this.prisma.codigoBarras
      .findMany({
        where: { revisado: filtro.revisado },
        include: conCategoria,
        orderBy: { creado_en: 'desc' },
      })
      .then((filas) => filas.map(vista));
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
    const cat = await this.prisma.categoria.findUnique({ where: { id: datos.categoriaId } });
    if (!cat || cat.archivada)
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    if (await this.prisma.codigoBarras.findUnique({ where: { ean: datos.ean } })) {
      throw new ErrorDominio(
        'EAN_YA_ASOCIADO',
        'Este código ya está asociado a una categoría',
        409,
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const f = await tx.codigoBarras.create({
          data: {
            ean: datos.ean,
            categoria_id: datos.categoriaId,
            contenido: datos.contenido,
            descripcion: datos.descripcion,
            creado_por: usuario.id,
            revisado: usuario.rol === 'ADMIN',
          },
          include: conCategoria,
        });
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'codigo_barras.asociado',
          entidad: 'codigo_barras',
          entidadId: datos.ean,
          despues: vista(f),
        });
        return vista(f);
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
    return this.prisma.$transaction(async (tx) => {
      const antes = await tx.codigoBarras.findUnique({ where: { ean }, include: conCategoria });
      if (!antes)
        throw new ErrorDominio(
          'EAN_DESCONOCIDO',
          'Este código no está asociado a ninguna categoría',
          404,
        );
      const f = await tx.codigoBarras.update({
        where: { ean },
        data: {
          categoria_id: cambios.categoriaId,
          contenido: cambios.contenido,
          descripcion: cambios.descripcion,
          revisado: cambios.revisado,
        },
        include: conCategoria,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'codigo_barras.editado',
        entidad: 'codigo_barras',
        entidadId: ean,
        antes: vista(antes),
        despues: vista(f),
      });
      return vista(f);
    });
  }
}
