import { Injectable } from '@nestjs/common';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import type { Prisma } from '../../generado/prisma/client';
import type { GrupoCategoria, UnidadBase } from '../../generado/prisma/enums';
import { BitacoraService } from '../auditoria/bitacora.service';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';

export interface DatosCategoria {
  nombre: string;
  grupo: GrupoCategoria;
  unidadBase: UnidadBase;
  perecedero: boolean;
  sinonimos: string[];
}

/** Por debajo de este puntaje un resultado no se muestra. */
const UMBRAL_BUSQUEDA = 0.35;

export interface ResultadoBusqueda {
  id: string;
  nombre: string;
  grupo: GrupoCategoria;
  unidadBase: UnidadBase;
  perecedero: boolean;
  puntaje: number;
}

@Injectable()
export class CategoriasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(filtro: { grupo?: GrupoCategoria; incluirArchivadas?: boolean }) {
    const filas = await this.prisma.categoria.findMany({
      where: { grupo: filtro.grupo, ...(filtro.incluirArchivadas ? {} : { archivada: false }) },
      orderBy: [{ grupo: 'asc' }, { nombre: 'asc' }],
    });
    return filas.map(presentar);
  }

  /**
   * Búsqueda por palabra clave (RF-CAT-002): sin distinguir mayúsculas ni tildes y
   * tolerante a errores de tipeo, sobre el nombre y los sinónimos. «panal» encuentra
   * «Pañal adulto» y «aroz» encuentra «Arroz».
   *
   * El orden por frecuencia de uso en la ubicación se suma en el Bloque 2, cuando
   * existan movimientos.
   */
  async buscar(q: string, limite = 10): Promise<ResultadoBusqueda[]> {
    const consulta = q.trim();
    if (!consulta) return [];
    const filas = await this.prisma.$queryRaw<
      {
        id: string;
        nombre: string;
        grupo: GrupoCategoria;
        unidad_base: UnidadBase;
        perecedero: boolean;
        puntaje: number;
      }[]
    >`
      WITH c AS (SELECT acopio_sin_tildes(${consulta}) AS q)
      SELECT cat.id, cat.nombre, cat.grupo, cat.unidad_base, cat.perecedero,
             GREATEST(
               word_similarity(c.q, acopio_sin_tildes(cat.nombre)),
               COALESCE((SELECT max(word_similarity(c.q, acopio_sin_tildes(s)))
                         FROM unnest(cat.sinonimos) AS s), 0)
             )::float AS puntaje
      FROM categoria cat, c
      WHERE NOT cat.archivada
      ORDER BY puntaje DESC, cat.nombre
      LIMIT ${limite * 3}`;
    return filas
      .filter((f) => f.puntaje >= UMBRAL_BUSQUEDA)
      .slice(0, limite)
      .map((f) => ({
        id: f.id,
        nombre: f.nombre,
        grupo: f.grupo,
        unidadBase: f.unidad_base,
        perecedero: f.perecedero,
        puntaje: Math.round(f.puntaje * 100) / 100,
      }));
  }

  async obtener(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria)
      throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
    return presentar(categoria);
  }

  async crear(admin: UsuarioAutenticado, datos: DatosCategoria) {
    return this.prisma.$transaction(async (tx) => {
      const categoria = await tx.categoria.create({ data: aFila(datos) }).catch(nombreDuplicado);
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'categoria.creada',
        entidad: 'categoria',
        entidadId: categoria.id,
        despues: datos,
      });
      return presentar(categoria);
    });
  }

  /** La unidad base es fija una vez creada: no se mezclan unidades (RF-CAT-001). */
  async actualizar(
    admin: UsuarioAutenticado,
    id: string,
    cambios: Partial<Omit<DatosCategoria, 'unidadBase'>>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const antes = await tx.categoria.findUnique({ where: { id } });
      if (!antes) throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      const despues = await tx.categoria
        .update({
          where: { id },
          data: {
            nombre: cambios.nombre,
            grupo: cambios.grupo,
            perecedero: cambios.perecedero,
            sinonimos: cambios.sinonimos?.map((s) => s.trim()).filter(Boolean),
          },
        })
        .catch(nombreDuplicado);
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'categoria.actualizada',
        entidad: 'categoria',
        entidadId: id,
        antes: presentar(antes),
        despues: presentar(despues),
      });
      return presentar(despues);
    });
  }

  /** Una categoría usada no se elimina: se archiva (RF-CAT-001). */
  async archivar(admin: UsuarioAutenticado, id: string, archivada: boolean) {
    return this.prisma.$transaction(async (tx) => {
      const categoria = await tx.categoria
        .update({ where: { id }, data: { archivada } })
        .catch(() => {
          throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
        });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: archivada ? 'categoria.archivada' : 'categoria.reactivada',
        entidad: 'categoria',
        entidadId: id,
      });
      return presentar(categoria);
    });
  }

  /**
   * Solo se elimina una categoría que nunca se usó. En el Bloque 0 «usada» es tener
   * canasta; desde el Bloque 2 también cuentan movimientos, umbrales y códigos.
   */
  async eliminar(admin: UsuarioAutenticado, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const categoria = await tx.categoria.findUnique({
        where: { id },
        include: { _count: { select: { canasta: true } } },
      });
      if (!categoria)
        throw new ErrorDominio('CATEGORIA_NO_ENCONTRADA', 'La categoría no existe', 404);
      if (categoria._count.canasta > 0) {
        throw new ErrorDominio(
          'CATEGORIA_EN_USO',
          'La categoría ya se usó y no se puede eliminar. Archívala',
          409,
        );
      }
      await tx.categoria.delete({ where: { id } });
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'categoria.eliminada',
        entidad: 'categoria',
        entidadId: id,
        antes: presentar(categoria),
      });
    });
  }
}

type FilaCategoria = Prisma.CategoriaGetPayload<object>;

function presentar(c: FilaCategoria) {
  return {
    id: c.id,
    nombre: c.nombre,
    grupo: c.grupo,
    unidadBase: c.unidad_base,
    perecedero: c.perecedero,
    sinonimos: c.sinonimos,
    archivada: c.archivada,
  };
}

function aFila(d: DatosCategoria): Prisma.CategoriaCreateInput {
  return {
    nombre: d.nombre.trim(),
    grupo: d.grupo,
    unidad_base: d.unidadBase,
    perecedero: d.perecedero,
    sinonimos: d.sinonimos.map((s) => s.trim()).filter(Boolean),
  };
}

function nombreDuplicado(error: unknown): never {
  if (restriccionUnicaViolada(error) === null) throw error;
  throw new ErrorDominio('DUPLICADO', 'Ya existe una categoría con ese nombre', 409);
}
