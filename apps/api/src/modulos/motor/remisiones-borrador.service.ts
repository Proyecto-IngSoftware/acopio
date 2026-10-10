import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { BitacoraService } from '../auditoria/bitacora.service';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { generarCodigoRemision } from './codigo-remision';
import { RemisionDao } from './dao/remision.dao';

/**
 * M-07: una sugerencia aprobada va a la remisión en BORRADOR del mismo acopio a la misma
 * zona, o crea una. Si la categoría ya tiene línea, suma a esa línea.
 */
@Injectable()
export class RemisionesBorradorService {
  constructor(
    private readonly remisiones: RemisionDao,
    private readonly bitacora: BitacoraService,
  ) {}

  async agregarLinea(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    d: { acopioId: string; zonaId: string | null; categoriaId: string; cantidad: number },
  ): Promise<{ id: string; codigo: string; creada: boolean }> {
    let remision = await this.remisiones.borradorDelPar(tx, d.acopioId, d.zonaId);
    let creada = false;
    if (!remision) {
      const anio = hoyEnBogota().getUTCFullYear();
      let codigo = generarCodigoRemision(anio);
      // Un choque aborta la transacción: se busca antes de insertar
      while (!(await this.remisiones.codigoLibre(tx, codigo))) codigo = generarCodigoRemision(anio);
      remision = await this.remisiones.crear(tx, {
        codigo,
        acopioId: d.acopioId,
        zonaId: d.zonaId,
        qrToken: randomBytes(18).toString('base64url'),
        usuarioId: usuario.id,
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
    const linea = await this.remisiones.lineaDe(tx, remision.id, d.categoriaId);
    if (linea) {
      await this.remisiones.cambiarLinea(
        tx,
        linea.id,
        Number(linea.cantidad_planeada) + d.cantidad,
      );
    } else {
      await this.remisiones.crearLinea(tx, remision.id, d.categoriaId, d.cantidad);
    }
    return { ...remision, creada };
  }
}
