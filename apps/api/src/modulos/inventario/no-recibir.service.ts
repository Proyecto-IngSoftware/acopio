import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';

const soloDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
/** Vigente: sin fecha de reapertura, o con una que no ha pasado. */
const vigente = () => ({ OR: [{ hasta: null }, { hasta: { gte: hoyEnBogota() } }] });

/** «No recibir» por categoría y acopio (RF-INV-008, B-02, B-06). */
@Injectable()
export class NoRecibirService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
  ) {}

  async listar(acopioId: string) {
    const filas = await this.prisma.noRecibir.findMany({
      where: { acopio_id: acopioId, ...vigente() },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { categoria: { nombre: 'asc' } },
    });
    return filas.map((f) => ({
      categoriaId: f.categoria_id,
      categoria: f.categoria.nombre,
      hasta: soloDia(f.hasta),
      marcadoEn: f.marcado_en,
    }));
  }

  async porCategoria(categoriaId: string) {
    const filas = await this.prisma.noRecibir.findMany({
      where: {
        categoria_id: categoriaId,
        ...vigente(),
        acopio: { estado: { not: 'CERRADO' } },
      },
      select: { acopio_id: true, hasta: true },
    });
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
    const cat = await this.prisma.categoria.findUnique({ where: { id: categoriaId } });
    if (!cat || cat.archivada) {
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const clave = { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } };
      const antes = await tx.noRecibir.findUnique({ where: clave });
      const fila = await tx.noRecibir.upsert({
        where: clave,
        update: { hasta, marcado_por: usuario.id, marcado_en: new Date() },
        create: { acopio_id: acopioId, categoria_id: categoriaId, hasta, marcado_por: usuario.id },
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
    await this.prisma.$transaction(async (tx) => {
      const clave = { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } };
      const antes = await tx.noRecibir.findUnique({
        where: clave,
        include: { categoria: { select: { nombre: true } } },
      });
      if (!antes) return;
      await tx.noRecibir.delete({ where: clave });
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
