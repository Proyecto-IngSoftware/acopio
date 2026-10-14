import { Injectable } from '@nestjs/common';
import {
  estadoTras,
  puedeRemision,
  type AccionRemision,
  type EstadoRemision,
} from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AcopiosService } from '../acopios/acopios.service';
import { ZonaDao } from '../acopios/dao/zona.dao';
import { BitacoraService } from '../auditoria/bitacora.service';
import { ComprobanteDao } from '../comprobantes/dao/comprobante.dao';
import { normalizarFolio } from '../comprobantes/folio';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { candadoSaldo } from '../inventario/dao/saldo.dao';
import { MovimientosService } from '../inventario/movimientos.service';
import { RemisionDao } from './dao/remision.dao';
import { EstadoMotorService } from './estado-motor.service';
import { PlanRemision } from './plan-remision';
import { RemisionesBorradorService } from './remisiones-borrador.service';
import { aRemisionVista } from './vistas';

type Linea = { categoriaId: string; cantidad: number };

const VERBO: Record<AccionRemision, string> = {
  editar: 'editar',
  despachar: 'despachar',
  cancelar: 'cancelar',
  subirEvidencia: 'subir evidencia',
  recibir: 'recibir',
};
const ESTADO: Record<EstadoRemision, string> = {
  BORRADOR: 'en borrador',
  EN_TRANSITO: 'en tránsito',
  RECIBIDA: 'recibida',
  CANCELADA: 'cancelada',
};

/** C12 Remisiones (RF-MOT-008): crear a mano, listar, ver y editar un borrador. */
@Injectable()
export class RemisionesService {
  constructor(
    private readonly transacciones: Transacciones,
    private readonly remisiones: RemisionDao,
    private readonly borradores: RemisionesBorradorService,
    private readonly estado: EstadoMotorService,
    private readonly zonas: ZonaDao,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
    private readonly bitacora: BitacoraService,
    private readonly movimientos: MovimientosService,
    private readonly comprobantes: ComprobanteDao,
  ) {}

  /** 409 REMISION_ESTADO_INVALIDO si la acción no vale desde el estado (TRANSICIONES_REMISION). */
  exigirAccion(r: { estado: EstadoRemision }, accion: AccionRemision) {
    if (!puedeRemision(r.estado, accion)) {
      throw new ErrorDominio(
        'REMISION_ESTADO_INVALIDO',
        `Esta remisión está ${ESTADO[r.estado]}: no se puede ${VERBO[accion]}`,
        409,
        { estado: r.estado },
      );
    }
  }

  /**
   * El movible de hoy más lo que este borrador ya compromete, con los candados de saldo
   * tomados en orden de categoría (foco de revisión 1 del plan).
   */
  async movibleDe(tx: ClienteBd, acopioId: string, categoriaIds: string[], remisionId?: string) {
    const ordenadas = [...new Set(categoriaIds)].sort();
    for (const c of ordenadas) await candadoSaldo(tx, acopioId, c);
    const acopios = await this.estado.acopios(tx, { acopioIds: [acopioId] });
    const ofertas = await this.estado.ofertas(tx, new Date(), acopios, ordenadas);
    const propio = remisionId
      ? await this.remisiones.comprometidoPropio(tx, remisionId)
      : new Map<string, number>();
    return new Map(
      ordenadas.map((c) => [
        c,
        (ofertas.find((o) => o.categoriaId === c)?.movible ?? 0) + (propio.get(c) ?? 0),
      ]),
    );
  }

  async crear(
    usuario: UsuarioAutenticado,
    d: { acopioId: string; zonaId: string | null; responsable?: string | null; lineas: Linea[] },
  ) {
    await this.alcance.exigir(usuario, 'ACOPIO', d.acopioId);
    await this.acopios.exigirAbierto(d.acopioId);
    if (d.zonaId) await this.exigirZonaAbierta(d.zonaId);
    const plan = d.lineas.reduce(
      (p, l) => p.agregar(l.categoriaId, l.cantidad),
      new PlanRemision(),
    );
    return this.transacciones.ejecutar(async (tx) => {
      const categorias = plan.lineas().map((l) => l.categoriaId);
      const lineas = plan.validarContra(await this.movibleDe(tx, d.acopioId, categorias)).lineas();
      const r = await this.borradores.nueva(tx, usuario, {
        acopioId: d.acopioId,
        zonaId: d.zonaId,
        responsable: d.responsable?.trim() || null,
        lineas,
      });
      return aRemisionVista((await this.remisiones.porCodigo(r.codigo, tx))!);
    });
  }

  async reemplazarLineas(usuario: UsuarioAutenticado, codigo: string, nuevas: Linea[]) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'editar');
    const plan = nuevas.reduce((p, l) => p.agregar(l.categoriaId, l.cantidad), new PlanRemision());
    return this.transacciones.ejecutar(async (tx) => {
      const categorias = plan.lineas().map((l) => l.categoriaId);
      const lineas = plan
        .validarContra(await this.movibleDe(tx, r.acopio_origen_id, categorias, r.id))
        .lineas();
      this.exigirAccion(await this.releer(tx, codigo), 'editar');
      await this.remisiones.reemplazarLineas(tx, r.id, lineas);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'remision.editada',
        entidad: 'remision',
        entidadId: r.id,
        ubicacionId: r.acopio_origen_id,
        antes: {
          lineas: r.lineas.map((l) => ({
            categoriaId: l.categoria_id,
            cantidad: Number(l.cantidad_planeada),
          })),
        },
        despues: { lineas },
      });
      return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
    });
  }

  async editar(
    usuario: UsuarioAutenticado,
    codigo: string,
    d: { responsable?: string | null; zonaId?: string | null },
  ) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'editar');
    if (d.zonaId) await this.exigirZonaAbierta(d.zonaId);
    const responsable = d.responsable === undefined ? r.responsable : d.responsable?.trim() || null;
    const zonaId = d.zonaId === undefined ? r.zona_destino_id : d.zonaId;
    return this.transacciones.ejecutar(async (tx) => {
      const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, 'BORRADOR', {
        responsable,
        zona_destino_id: zonaId,
      });
      if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'editar');
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'remision.editada',
        entidad: 'remision',
        entidadId: r.id,
        ubicacionId: r.acopio_origen_id,
        antes: { responsable: r.responsable, zonaId: r.zona_destino_id },
        despues: { responsable, zonaId },
      });
      return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
    });
  }

  async listar(usuario: UsuarioAutenticado, f: { estado?: EstadoRemision; zonaId?: string }) {
    const acopioIds = await this.alcance.idsAsignados(usuario, 'ACOPIO');
    return (await this.remisiones.listar({ acopioIds, ...f })).map(aRemisionVista);
  }

  async ver(usuario: UsuarioAutenticado, codigo: string) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    return aRemisionVista(r);
  }

  /**
   * Crea una SALIDA por línea bajo el candado de saldo, vincula los folios y deja la
   * remisión EN_TRANSITO. Si una línea no alcanza, la transacción entera se revierte.
   */
  async despachar(usuario: UsuarioAutenticado, codigo: string, folios: string[] = []) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'despachar');
    if (!r.responsable?.trim()) {
      throw new ErrorDominio(
        'RESPONSABLE_OBLIGATORIO',
        'Indica quién lleva el envío antes de despacharlo',
        422,
      );
    }
    const vinculos = await this.foliosVinculables(r.acopio_origen_id, folios);
    return this.transacciones.ejecutar(
      async (tx) => {
        const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, 'BORRADOR', {
          estado: estadoTras('BORRADOR', 'despachar'),
          despachada_por: usuario.id,
          despachada_en: new Date(),
        });
        if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'despachar');
        // CON_LINEAS las trae ordenadas por categoría: los candados se toman siempre en orden
        for (const l of r.lineas) {
          await this.movimientos.salidaTrasladoEnTransaccion(tx, usuario, r.acopio_origen_id, {
            categoriaId: l.categoria_id,
            cantidad: Number(l.cantidad_planeada),
            remisionId: r.id,
            codigo: r.codigo,
          });
        }
        if (vinculos.length) await this.remisiones.vincularFolios(tx, r.id, vinculos, usuario.id);
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'remision.despachada',
          entidad: 'remision',
          entidadId: r.id,
          ubicacionId: r.acopio_origen_id,
          antes: { estado: 'BORRADOR' },
          despues: { estado: 'EN_TRANSITO', responsable: r.responsable, folios },
        });
        return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  /** Solo folios CONCILIADO del mismo acopio (§6 de la especificación). */
  private async foliosVinculables(acopioId: string, folios: string[]) {
    const ids: string[] = [];
    for (const texto of new Set(folios)) {
      const folio = normalizarFolio(texto);
      const c = folio ? await this.comprobantes.porFolio(folio) : null;
      if (!c || c.estado !== 'CONCILIADO' || c.acopio_id !== acopioId) {
        throw new ErrorDominio(
          'FOLIO_NO_VINCULABLE',
          `El folio ${texto} no está conciliado en este acopio`,
          422,
        );
      }
      ids.push(c.id);
    }
    return ids;
  }

  /** M-07: en tránsito, lo despachado vuelve al acopio con un AJUSTE positivo por línea. */
  async cancelar(usuario: UsuarioAutenticado, codigo: string, motivo: string) {
    const r = await this.encontrar(codigo);
    await this.alcance.exigir(usuario, 'ACOPIO', r.acopio_origen_id);
    this.exigirAccion(r, 'cancelar');
    const texto = motivo.trim();
    return this.transacciones.ejecutar(
      async (tx) => {
        const cambiadas = await this.remisiones.cambiarSiEstado(tx, r.id, r.estado, {
          estado: estadoTras(r.estado, 'cancelar'),
          cancelada_por: usuario.id,
          cancelada_en: new Date(),
          motivo_cancelacion: texto,
        });
        if (cambiadas === 0) this.exigirAccion(await this.releer(tx, codigo), 'cancelar');
        if (r.estado === 'EN_TRANSITO') {
          for (const l of r.lineas) {
            await this.movimientos.ajusteCancelacionEnTransaccion(tx, usuario, r.acopio_origen_id, {
              categoriaId: l.categoria_id,
              cantidad: Number(l.cantidad_planeada),
              remisionId: r.id,
              codigo: r.codigo,
            });
          }
        }
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'remision.cancelada',
          entidad: 'remision',
          entidadId: r.id,
          ubicacionId: r.acopio_origen_id,
          destacado: r.estado === 'EN_TRANSITO',
          antes: { estado: r.estado },
          despues: { estado: 'CANCELADA', motivo: texto },
        });
        return aRemisionVista((await this.remisiones.porCodigo(codigo, tx))!);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  /** 404 REMISION_NO_ENCONTRADA. */
  async encontrar(codigo: string, bd?: ClienteBd) {
    const r = await this.remisiones.porCodigo(codigo, bd);
    if (!r) throw new ErrorDominio('REMISION_NO_ENCONTRADA', 'No encontramos esa remisión', 404);
    return r;
  }

  /** Lo mismo dentro de la transacción: el estado que vale es el de ahora. */
  releer(tx: ClienteBd, codigo: string) {
    return this.encontrar(codigo, tx);
  }

  /** Una zona de una emergencia cerrada queda en solo lectura (como la necesidad manual). */
  private async exigirZonaAbierta(zonaId: string) {
    const z = await this.zonas.conEmergencia(zonaId);
    if (!z) throw new ErrorDominio('ZONA_NO_ENCONTRADA', 'La zona no existe', 404);
    if (z.emergencia.estado === 'CERRADA') {
      throw new ErrorDominio(
        'ZONA_SOLO_LECTURA',
        'La emergencia está cerrada: sus zonas quedan en solo lectura',
        409,
      );
    }
  }
}
