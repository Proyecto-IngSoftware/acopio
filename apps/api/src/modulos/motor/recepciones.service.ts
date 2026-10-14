import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { MAXIMO_EVIDENCIAS } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { MovimientosService } from '../inventario/movimientos.service';
import { exigirZonaPropia } from './alcance-zona';
import { RemisionDao, type RemisionConLineas } from './dao/remision.dao';
import { RemisionesService } from './remisiones.service';
import { aRemisionVista } from './vistas';

/** C13 Recepción en zona (RF-MOT-009): lo que va en camino, la evidencia y la confirmación. */
@Injectable()
export class RecepcionesService {
  private readonly log = new Logger(RecepcionesService.name);

  constructor(
    private readonly transacciones: Transacciones,
    private readonly remisionesDao: RemisionDao,
    private readonly remisiones: RemisionesService,
    private readonly movimientos: MovimientosService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly alcance: AlcanceService,
    private readonly bitacora: BitacoraService,
  ) {}

  /** EN_TRANSITO hacia las zonas del Receptor y los despachos generales. */
  async pendientes(usuario: UsuarioAutenticado) {
    const zonas = await this.alcance.idsAsignados(usuario, 'ZONA');
    return (await this.remisionesDao.pendientesParaReceptor(zonas)).map(aRemisionVista);
  }

  async porQr(usuario: UsuarioAutenticado, token: string) {
    const r = await this.remisionesDao.porQr(token);
    if (!r) throw new ErrorDominio('REMISION_NO_ENCONTRADA', 'No encontramos esa remisión', 404);
    if (r.zona_destino_id) await exigirZonaPropia(this.alcance, usuario, r.zona_destino_id);
    return aRemisionVista(r);
  }

  async subirEvidencia(usuario: UsuarioAutenticado, codigo: string, datos: Buffer) {
    const r = await this.remisiones.encontrar(codigo);
    this.remisiones.exigirAccion(r, 'subirEvidencia');
    if (r.zona_destino_id) await exigirZonaPropia(this.alcance, usuario, r.zona_destino_id);
    const imagen = await this.almacenamiento.guardarImagen(`remisiones/${r.id}`, datos);
    // La evidencia no usa miniatura
    await this.almacenamiento.borrar(imagen.miniatura).catch(() => undefined);
    try {
      return await this.transacciones.ejecutar(async (tx) => {
        const cambiadas = await this.remisionesDao.agregarEvidencia(
          tx,
          r.id,
          imagen.clave,
          MAXIMO_EVIDENCIAS,
        );
        if (cambiadas === 0) {
          const actual = await this.remisiones.releer(tx, codigo);
          this.remisiones.exigirAccion(actual, 'subirEvidencia');
          throw new ErrorDominio(
            'EVIDENCIA_MAXIMA',
            `Una remisión admite hasta ${MAXIMO_EVIDENCIAS} fotos`,
            422,
          );
        }
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'remision.evidencia',
          entidad: 'remision',
          entidadId: r.id,
          ubicacionId: r.zona_destino_id ?? r.acopio_origen_id,
          despues: { bytes: imagen.bytes },
        });
        return aRemisionVista((await this.remisionesDao.porCodigo(codigo, tx))!);
      });
    } catch (e) {
      // No se guardó la clave: la foto subida quedaría huérfana en Garage
      await this.almacenamiento.borrar(imagen.clave).catch((x) => this.log.error(x));
      throw e;
    }
  }

  /** La foto n de la evidencia, con el mismo permiso que ver la remisión (ADR-0017). */
  async evidencia(usuario: UsuarioAutenticado, codigo: string, n: number) {
    const r = await this.remisiones.encontrar(codigo);
    await this.exigirVerEvidencia(usuario, r);
    const clave = r.evidencia_keys[n];
    if (!clave) {
      throw new ErrorDominio('EVIDENCIA_NO_ENCONTRADA', 'Esa foto de evidencia no existe', 404);
    }
    return this.almacenamiento.leerImagen(clave);
  }

  /**
   * RF-MOT-009: una RECEPCION por línea con lo planeado. Un despacho general toma la zona
   * del Receptor. El primer UPDATE, condicionado al estado, bloquea la fila: otra
   * confirmación espera y después ve que ya no está EN_TRANSITO.
   */
  async recibir(
    usuario: UsuarioAutenticado,
    codigo: string,
    d: { zonaId?: string; nota?: string },
  ) {
    const r = await this.remisiones.encontrar(codigo);
    this.remisiones.exigirAccion(r, 'recibir');
    const zonaId = r.zona_destino_id ?? d.zonaId;
    if (!zonaId) {
      throw new ErrorDominio('ZONA_OBLIGATORIA', 'Indica en qué zona recibes este despacho', 400);
    }
    await exigirZonaPropia(this.alcance, usuario, zonaId);
    if (r.evidencia_keys.length === 0) {
      throw new ErrorDominio('SIN_EVIDENCIA', 'Sube al menos una foto de lo que llegó', 422);
    }
    return this.transacciones.ejecutar(
      async (tx) => {
        const ahora = new Date();
        const tomadas = await this.remisionesDao.cambiarSiEstado(tx, r.id, 'EN_TRANSITO', {
          zona_destino_id: zonaId,
          recibida_por: usuario.id,
          recibida_en: ahora,
          nota_recepcion: d.nota?.trim() || null,
        });
        if (tomadas === 0)
          this.remisiones.exigirAccion(await this.remisiones.releer(tx, codigo), 'recibir');
        // El disparador de las líneas solo deja escribir lo recibido mientras está EN_TRANSITO
        await this.remisionesDao.marcarRecibidas(tx, r.id);
        for (const l of r.lineas) {
          await this.movimientos.registrarRecepcion(tx, usuario, zonaId, {
            categoriaId: l.categoria_id,
            cantidad: Number(l.cantidad_planeada),
            remisionId: r.id,
            ocurridoEn: ahora,
          });
        }
        await this.remisionesDao.cambiarSiEstado(tx, r.id, 'EN_TRANSITO', { estado: 'RECIBIDA' });
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'remision.recibida',
          entidad: 'remision',
          entidadId: r.id,
          ubicacionId: zonaId,
          destacado: r.zona_destino_id === null,
          antes: { estado: 'EN_TRANSITO', zonaId: r.zona_destino_id },
          despues: { estado: 'RECIBIDA', zonaId, fotos: r.evidencia_keys.length },
        });
        return aRemisionVista((await this.remisionesDao.porCodigo(codigo, tx))!);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  /**
   * Administrador y Auditor siempre; el Operador con alcance sobre el acopio de origen; el
   * Receptor si la zona de destino es suya, o cualquiera mientras sea un despacho general.
   */
  private async exigirVerEvidencia(usuario: UsuarioAutenticado, r: RemisionConLineas) {
    if (usuario.rol === 'ADMIN' || usuario.rol === 'AUDITOR') return;
    if (
      usuario.rol === 'OPERADOR' &&
      (await this.alcance.puede(usuario, 'ACOPIO', r.acopio_origen_id))
    )
      return;
    if (usuario.rol === 'RECEPTOR') {
      if (!r.zona_destino_id) return;
      if (await this.alcance.puede(usuario, 'ZONA', r.zona_destino_id)) return;
    }
    throw new ForbiddenException('No puedes ver la evidencia de esta remisión');
  }
}
