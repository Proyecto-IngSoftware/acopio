import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { BitacoraService } from '../auditoria/bitacora.service';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { generarCodigoRemision } from './codigo-remision';

/**
 * M-07: una sugerencia aprobada va a la remisión en BORRADOR del mismo acopio a la misma
 * zona, o crea una. Si la categoría ya tiene línea, suma a esa línea.
 */
@Injectable()
export class RemisionesBorradorService {
  constructor(private readonly bitacora: BitacoraService) {}

  async agregarLinea(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    d: { acopioId: string; zonaId: string | null; categoriaId: string; cantidad: number },
  ): Promise<{ id: string; codigo: string; creada: boolean }> {
    let remision = await tx.remision.findFirst({
      where: { estado: 'BORRADOR', acopio_origen_id: d.acopioId, zona_destino_id: d.zonaId },
      orderBy: { creada_en: 'asc' },
      select: { id: true, codigo: true },
    });
    let creada = false;
    if (!remision) {
      const anio = hoyEnBogota().getUTCFullYear();
      let codigo = generarCodigoRemision(anio);
      // Un choque aborta la transacción: se busca antes de insertar
      while (await tx.remision.findUnique({ where: { codigo }, select: { id: true } }))
        codigo = generarCodigoRemision(anio);
      remision = await tx.remision.create({
        data: {
          codigo,
          acopio_origen_id: d.acopioId,
          zona_destino_id: d.zonaId,
          qr_token: randomBytes(18).toString('base64url'),
          creada_por: usuario.id,
        },
        select: { id: true, codigo: true },
      });
      creada = true;
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'remision.creada',
        entidad: 'remision',
        entidadId: remision.id,
        ubicacionId: d.acopioId,
        despues: { codigo, zonaId: d.zonaId },
      });
    }
    const linea = await tx.lineaRemision.findUnique({
      where: {
        remision_id_categoria_id: { remision_id: remision.id, categoria_id: d.categoriaId },
      },
    });
    if (linea) {
      await tx.lineaRemision.update({
        where: { id: linea.id },
        data: { cantidad_planeada: { increment: d.cantidad } },
      });
    } else {
      await tx.lineaRemision.create({
        data: {
          remision_id: remision.id,
          categoria_id: d.categoriaId,
          cantidad_planeada: d.cantidad,
        },
      });
    }
    return { ...remision, creada };
  }
}
