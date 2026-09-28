import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import type { Prisma } from '../../generado/prisma/client';
import { BitacoraService } from '../auditoria/bitacora.service';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';

/**
 * Canasta estándar (RF-CAT-003). Versionada por vigente_desde: un cambio agrega una
 * fila y deja las anteriores como estaban. La fuente es obligatoria.
 */
@Injectable()
export class CanastaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  /** La versión vigente hoy (o en `fecha`) de cada categoría que tiene canasta. */
  async vigente(fecha = new Date()) {
    const filas = await this.prisma.$queryRaw<
      {
        categoria_id: string;
        categoria: string;
        unidad_base: string;
        cantidad_persona_dia: Prisma.Decimal;
        fuente: string;
        vigente_desde: Date;
      }[]
    >`
      SELECT DISTINCT ON (ce.categoria_id)
             ce.categoria_id, c.nombre AS categoria, c.unidad_base,
             ce.cantidad_persona_dia, ce.fuente, ce.vigente_desde
      FROM canasta_estandar ce
      JOIN categoria c ON c.id = ce.categoria_id
      WHERE ce.vigente_desde <= ${fecha}::date AND NOT c.archivada
      ORDER BY ce.categoria_id, ce.vigente_desde DESC`;
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
    const filas = await this.prisma.canastaEstandar.findMany({
      where: { categoria_id: categoriaId },
      orderBy: { vigente_desde: 'desc' },
    });
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
    return this.prisma.$transaction(async (tx) => {
      const categoria = await tx.categoria.findUnique({ where: { id: categoriaId } });
      if (!categoria)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      const fila = await tx.canastaEstandar
        .create({
          data: {
            categoria_id: categoriaId,
            cantidad_persona_dia: datos.cantidadPersonaDia,
            fuente: datos.fuente.trim(),
            vigente_desde: datos.vigenteDesde,
          },
        })
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
