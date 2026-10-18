import { Inject, Injectable } from '@nestjs/common';
import { cierreValido, hoyBogota, validarUrlOficial, type CategoriaCausa } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { esActiva, presentarCausaGestion } from './causas.vistas';
import { CausaDao, comoFecha, type FilaCausa } from './dao/causa.dao';
import { EntidadDao } from './dao/entidad.dao';
import { miniatura } from './entidades.service';
import { RELOJ, type Reloj } from './geocodificacion';

export interface DatosCausa {
  entidadId: string;
  categoria: CategoriaCausa;
  titulo: string;
  descripcion: string;
  pasos: string[];
  urlOficial: string;
  cierraEl: string;
}

export type EstadoGestion = 'activas' | 'por-cerrar' | 'atendidas';

/**
 * Causas (RF-RED-007 y 010). Cada una tiene fecha de cierre, como máximo a 6 meses; publicar,
 * renovar o reactivar pide confirmar el aviso (C-03, C-04, C-09).
 */
@Injectable()
export class CausasService {
  constructor(
    private readonly dao: CausaDao,
    private readonly entidades: EntidadDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
    private readonly almacenamiento: AlmacenamientoService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async crear(admin: UsuarioAutenticado, datos: DatosCausa, confirmo: boolean) {
    exigirConfirmacion(confirmo);
    exigirUrl(datos.urlOficial);
    const ahora = this.ahora();
    exigirCierre(datos.cierraEl, hoyBogota(ahora));
    return this.transacciones.ejecutar(async (tx) => {
      await this.exigirEntidadVerificada(datos.entidadId, tx);
      const c = await this.dao.crear(
        {
          entidad_id: datos.entidadId,
          categoria: datos.categoria,
          titulo: datos.titulo.trim(),
          descripcion: datos.descripcion.trim(),
          pasos: datos.pasos.map((p) => p.trim()),
          url_oficial: datos.urlOficial,
          cierra_el: comoFecha(datos.cierraEl),
          publicada_en: ahora,
          creada_por: admin.id,
        },
        tx,
      );
      return this.registrar(tx, admin, 'causa.creada', null, c);
    });
  }

  /** Cambiar el enlace o la entidad pide confirmar otra vez: es lo que llega al público. */
  async editar(
    admin: UsuarioAutenticado,
    id: string,
    cambios: Partial<DatosCausa>,
    confirmo: boolean,
  ) {
    if (cambios.urlOficial !== undefined || cambios.entidadId !== undefined) {
      exigirConfirmacion(confirmo);
    }
    if (cambios.urlOficial !== undefined) exigirUrl(cambios.urlOficial);
    const hoy = hoyBogota(this.ahora());
    if (cambios.cierraEl !== undefined) exigirCierre(cambios.cierraEl, hoy);
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigirActiva(id, hoy, tx);
      if (cambios.entidadId) await this.exigirEntidadVerificada(cambios.entidadId, tx);
      const despues = await this.dao.actualizar(
        id,
        {
          entidad_id: cambios.entidadId,
          categoria: cambios.categoria,
          titulo: cambios.titulo?.trim(),
          descripcion: cambios.descripcion?.trim(),
          pasos: cambios.pasos?.map((p) => p.trim()),
          url_oficial: cambios.urlOficial,
          cierra_el: cambios.cierraEl ? comoFecha(cambios.cierraEl) : undefined,
        },
        tx,
      );
      return this.registrar(tx, admin, 'causa.editada', antes, despues);
    });
  }

  async renovar(admin: UsuarioAutenticado, id: string, cierraEl: string, confirmo: boolean) {
    exigirConfirmacion(confirmo);
    const ahora = this.ahora();
    const hoy = hoyBogota(ahora);
    exigirCierre(cierraEl, hoy);
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigirActiva(id, hoy, tx);
      const despues = await this.dao.actualizar(
        id,
        { cierra_el: comoFecha(cierraEl), publicada_en: ahora },
        tx,
      );
      return this.registrar(tx, admin, 'causa.renovada', antes, despues);
    });
  }

  async archivar(admin: UsuarioAutenticado, id: string) {
    const ahora = this.ahora();
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigirActiva(id, hoyBogota(ahora), tx);
      const despues = await this.dao.archivar(
        id,
        { motivo: 'MANUAL', por: admin.id, en: ahora },
        tx,
      );
      return this.registrar(tx, admin, 'causa.archivada', antes, despues);
    });
  }

  async reactivar(admin: UsuarioAutenticado, id: string, cierraEl: string, confirmo: boolean) {
    exigirConfirmacion(confirmo);
    const ahora = this.ahora();
    const hoy = hoyBogota(ahora);
    exigirCierre(cierraEl, hoy);
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigir(id, tx);
      if (esActiva(antes, hoy)) {
        throw new ErrorDominio('CAUSA_ACTIVA', 'La causa sigue activa: renuévala', 409);
      }
      await this.exigirEntidadVerificada(antes.entidad_id, tx);
      const despues = await this.dao.actualizar(
        id,
        {
          archivada_en: null,
          archivo_motivo: null,
          archivada_por: null,
          cierra_el: comoFecha(cierraEl),
          publicada_en: ahora,
        },
        tx,
      );
      return this.registrar(tx, admin, 'causa.reactivada', antes, despues);
    });
  }

  async subirImagen(admin: UsuarioAutenticado, id: string, datos: Buffer) {
    await this.exigirActiva(id, hoyBogota(this.ahora()));
    const { clave } = await this.almacenamiento.guardarImagen(`causas/${id}`, datos);
    return this.cambiarImagen(admin, id, clave);
  }

  quitarImagen(admin: UsuarioAutenticado, id: string) {
    return this.cambiarImagen(admin, id, null);
  }

  async listarGestion(estado: EstadoGestion) {
    const hoy = hoyBogota(this.ahora());
    const vistas = (await this.dao.todas()).map((c) => presentarCausaGestion(c, hoy));
    if (estado === 'atendidas') {
      return vistas
        .filter((v) => v.estado === 'ATENDIDA')
        .sort((x, y) => (y.cerroEl ?? '').localeCompare(x.cerroEl ?? ''));
    }
    return vistas.filter((v) => v.estado === 'ACTIVA' && (estado === 'activas' || v.porCerrar));
  }

  private async cambiarImagen(admin: UsuarioAutenticado, id: string, clave: string | null) {
    const hoy = hoyBogota(this.ahora());
    const { anterior, vista } = await this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigir(id, tx);
      const despues = await this.dao.actualizar(id, { imagen_key: clave }, tx);
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'causa.imagen_cambiada',
        entidad: 'causa',
        entidadId: id,
        antes: { imagenKey: antes.imagen_key },
        despues: { imagenKey: clave },
      });
      return { anterior: antes.imagen_key, vista: presentarCausaGestion(despues, hoy) };
    });
    if (anterior) {
      await Promise.all(
        [anterior, miniatura(anterior)].map((k) =>
          this.almacenamiento.borrar(k).catch(() => undefined),
        ),
      );
    }
    return vista;
  }

  private async registrar(
    tx: ClienteBd,
    admin: UsuarioAutenticado,
    accion: string,
    antes: FilaCausa | null,
    despues: FilaCausa,
  ) {
    const hoy = hoyBogota(this.ahora());
    const vista = presentarCausaGestion(despues, hoy);
    await this.bitacora.registrar(tx, {
      usuarioId: admin.id,
      accion,
      entidad: 'causa',
      entidadId: despues.id,
      antes: antes ? presentarCausaGestion(antes, hoy) : undefined,
      despues: accion === 'causa.editada' ? vista : { ...vista, confirmo: true },
    });
    return vista;
  }

  private async exigir(id: string, bd?: ClienteBd) {
    const c = await this.dao.porId(id, bd);
    if (!c) throw new ErrorDominio('CAUSA_NO_ENCONTRADA', 'La causa no existe', 404);
    return c;
  }

  private async exigirActiva(id: string, hoy: string, bd?: ClienteBd) {
    const c = await this.exigir(id, bd);
    if (!esActiva(c, hoy)) {
      throw new ErrorDominio(
        'CAUSA_ATENDIDA',
        'La causa ya está atendida: reactívala para cambiarla',
        409,
      );
    }
    return c;
  }

  private async exigirEntidadVerificada(id: string, bd: ClienteBd) {
    const e = await this.entidades.porId(id, bd);
    if (!e) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
    if (e.verificacion !== 'VERIFICADA') {
      throw new ErrorDominio(
        'ENTIDAD_SIN_VERIFICAR',
        'Solo se publican causas de entidades verificadas',
        409,
      );
    }
  }

  private ahora() {
    return new Date(this.reloj.ahora());
  }
}

function exigirConfirmacion(confirmo: boolean) {
  if (!confirmo) {
    throw new ErrorDominio(
      'CONFIRMACION_REQUERIDA',
      'Confirma que revisaste la entidad y el sitio de destino',
      422,
    );
  }
}

function exigirUrl(url: string) {
  if (!validarUrlOficial(url)) {
    throw new ErrorDominio(
      'URL_NO_SEGURA',
      'El enlace oficial debe empezar por https:// y apuntar a un dominio de verdad',
      422,
    );
  }
}

function exigirCierre(cierraEl: string, hoy: string) {
  if (!cierreValido(cierraEl, hoy)) {
    throw new ErrorDominio(
      'CIERRE_FUERA_DE_RANGO',
      'La fecha de cierre va de hoy a seis meses',
      422,
    );
  }
}
