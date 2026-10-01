import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { categoriaParaMovimiento } from './cantidades';

/** Mínimo y máximo por acopio y categoría (RF-INV-007). Operador asignado o Administrador. */
@Injectable()
export class UmbralesService {
  constructor(
    private readonly prisma: PrismaService,
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
    return this.prisma.$transaction(async (tx) => {
      const cat = await categoriaParaMovimiento(tx, categoriaId);
      const clave = { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } };
      const antes = await tx.umbral.findUnique({ where: clave });
      const fila = await tx.umbral.upsert({
        where: clave,
        update: { ...datos, actualizado_por: usuario.id, actualizado_en: new Date() },
        create: {
          acopio_id: acopioId,
          categoria_id: categoriaId,
          ...datos,
          actualizado_por: usuario.id,
        },
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
  }

  async quitar(usuario: UsuarioAutenticado, acopioId: string, categoriaId: string) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.prisma.$transaction(async (tx) => {
      const clave = { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } };
      const antes = await tx.umbral.findUnique({
        where: clave,
        include: { categoria: { select: { nombre: true } } },
      });
      if (!antes) return;
      await tx.umbral.delete({ where: clave });
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
