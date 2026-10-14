import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { BitacoraService } from '../auditoria/bitacora.service';
import { hoyEnBogota } from '../catalogo/emergencias.service';
import { generarCodigoRemision } from './codigo-remision';
import { RemisionDao } from './dao/remision.dao';
import { PlanRemision } from './plan-remision';

/**
 * Arma los borradores de remisión. M-07: una sugerencia aprobada va a la remisión en
 * BORRADOR del mismo acopio a la misma zona, o crea una; si la categoría ya tiene línea,
 * suma a esa línea. También crea las remisiones que el Operador arma a mano.
 */
@Injectable()
export class RemisionesBorradorService {
  constructor(
    private readonly remisiones: RemisionDao,
    private readonly bitacora: BitacoraService,
  ) {}

  /** Una remisión nueva en BORRADOR con sus líneas, ya validadas por quien llama. */
  async nueva(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    d: {
      acopioId: string;
      zonaId: string | null;
      responsable?: string | null;
      lineas: { categoriaId: string; cantidad: number }[];
    },
  ): Promise<{ id: string; codigo: string }> {
    const anio = hoyEnBogota().getUTCFullYear();
    let codigo = generarCodigoRemision(anio);
    // Un choque aborta la transacción: se busca antes de insertar
    while (!(await this.remisiones.codigoLibre(tx, codigo))) codigo = generarCodigoRemision(anio);
    const remision = await this.remisiones.crear(tx, {
      codigo,
      acopioId: d.acopioId,
      zonaId: d.zonaId,
      qrToken: randomBytes(18).toString('base64url'),
      responsable: d.responsable ?? null,
      usuarioId: usuario.id,
    });
    if (d.lineas.length) await this.remisiones.reemplazarLineas(tx, remision.id, d.lineas);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'remision.creada',
      entidad: 'remision',
      entidadId: remision.id,
      ubicacionId: d.acopioId,
      despues: { codigo, zonaId: d.zonaId, lineas: d.lineas },
    });
    return remision;
  }

  async agregarLinea(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    d: { acopioId: string; zonaId: string | null; categoriaId: string; cantidad: number },
  ): Promise<{ id: string; codigo: string; creada: boolean }> {
    const existente = await this.remisiones.borradorDelPar(tx, d.acopioId, d.zonaId);
    if (!existente) {
      const remision = await this.nueva(tx, usuario, {
        acopioId: d.acopioId,
        zonaId: d.zonaId,
        lineas: [{ categoriaId: d.categoriaId, cantidad: d.cantidad }],
      });
      return { ...remision, creada: true };
    }
    const linea = await this.remisiones.lineaDe(tx, existente.id, d.categoriaId);
    if (!linea) {
      await this.remisiones.crearLinea(tx, existente.id, d.categoriaId, d.cantidad);
      return { ...existente, creada: false };
    }
    const antes = Number(linea.cantidad_planeada);
    const [suma] = new PlanRemision()
      .agregar(d.categoriaId, antes)
      .agregar(d.categoriaId, d.cantidad)
      .lineas();
    await this.remisiones.cambiarLinea(tx, linea.id, suma!.cantidad);
    // Menor de la etapa 1: la línea que crece deja su antes y su después
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'remision.linea',
      entidad: 'remision',
      entidadId: existente.id,
      ubicacionId: d.acopioId,
      antes: { categoriaId: d.categoriaId, cantidad: antes },
      despues: { categoriaId: d.categoriaId, cantidad: suma!.cantidad },
    });
    return { ...existente, creada: false };
  }
}
