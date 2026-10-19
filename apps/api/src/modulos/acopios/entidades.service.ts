import { Inject, Injectable } from '@nestjs/common';
import { hoyBogota } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { restriccionUnicaViolada } from '../../comun/prisma/errores-prisma';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { Entidad } from '../../generado/prisma/client';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CausaDao } from './dao/causa.dao';
import { EntidadDao } from './dao/entidad.dao';
import { RELOJ, type Reloj } from './geocodificacion';

export interface DatosEntidad {
  nombre: string;
  tipo: string;
  nit?: string | null;
  sitioWeb?: string | null;
  telefono?: string | null;
  correo?: string | null;
  descripcion?: string | null;
}

/**
 * Entidades responsables de acopios y causas (RF-RED-005 y 006). Verificar es una marca del
 * Administrador, sin documento, con la confirmación del aviso de seguridad (C-01, C-09).
 */
@Injectable()
export class EntidadesService {
  constructor(
    private readonly dao: EntidadDao,
    private readonly causas: CausaDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
    private readonly almacenamiento: AlmacenamientoService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async listar() {
    const [filas, activas] = await Promise.all([
      this.dao.listar(),
      this.causas.contarActivas(this.hoy()),
    ]);
    return filas.map((e) => ({ ...presentarEntidad(e), causasActivas: activas.get(e.id) ?? 0 }));
  }

  async verificar(admin: UsuarioAutenticado, id: string, confirmo: boolean) {
    if (!confirmo) {
      throw new ErrorDominio(
        'CONFIRMACION_REQUERIDA',
        'Confirma que revisaste la entidad y su sitio oficial',
        422,
      );
    }
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigir(id, tx);
      if (!antes.sitio_web) {
        throw new ErrorDominio(
          'ENTIDAD_SIN_SITIO',
          'Agrega el sitio web de la entidad para poder verificarla',
          422,
        );
      }
      const despues = await this.dao.actualizar(
        id,
        {
          verificacion: 'VERIFICADA',
          verificada_por: admin.id,
          verificada_en: new Date(this.reloj.ahora()),
        },
        tx,
      );
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'entidad.verificada',
        entidad: 'entidad',
        entidadId: id,
        antes: presentarEntidad(antes),
        despues: { ...presentarEntidad(despues), confirmo: true },
        destacado: true,
      });
      return presentarEntidad(despues);
    });
  }

  /** Quita el sello y archiva sus causas activas (C-08). */
  async quitarVerificacion(admin: UsuarioAutenticado, id: string) {
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigir(id, tx);
      const despues = await this.dao.actualizar(
        id,
        { verificacion: 'SIN_VERIFICAR', verificada_por: null, verificada_en: null },
        tx,
      );
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'entidad.verificacion_quitada',
        entidad: 'entidad',
        entidadId: id,
        antes: presentarEntidad(antes),
        despues: presentarEntidad(despues),
        destacado: true,
      });
      const ahora = new Date(this.reloj.ahora());
      const activas = await this.causas.activasDeEntidad(id, hoyBogota(ahora), tx);
      for (const c of activas) {
        await this.causas.archivar(
          c.id,
          { motivo: 'ENTIDAD_SIN_VERIFICAR', por: admin.id, en: ahora },
          tx,
        );
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'causa.archivada',
          entidad: 'causa',
          entidadId: c.id,
          antes: { archivadaEn: null },
          despues: { archivadaEn: ahora, motivo: 'ENTIDAD_SIN_VERIFICAR' },
        });
      }
      return { archivadas: activas.length };
    });
  }

  async subirLogo(admin: UsuarioAutenticado, id: string, datos: Buffer) {
    await this.exigir(id);
    const { clave } = await this.almacenamiento.guardarImagen(`entidades/${id}`, datos);
    return this.cambiarLogo(admin, id, clave);
  }

  quitarLogo(admin: UsuarioAutenticado, id: string) {
    return this.cambiarLogo(admin, id, null);
  }

  /** El logotipo es la miniatura de la imagen guardada. Solo se muestra el de una verificada. */
  async leerLogo(id: string) {
    const e = await this.dao.porId(id);
    if (!e?.logo_key || e.verificacion !== 'VERIFICADA') {
      throw new ErrorDominio('SIN_LOGO', 'La entidad no tiene logotipo', 404);
    }
    return this.almacenamiento.leerImagen(miniatura(e.logo_key));
  }

  private async cambiarLogo(admin: UsuarioAutenticado, id: string, clave: string | null) {
    const { antes, despues } = await this.transacciones.ejecutar(async (tx) => {
      const antes = await this.exigir(id, tx);
      const despues = await this.dao.actualizar(id, { logo_key: clave }, tx);
      await this.bitacora.registrar(tx, {
        usuarioId: admin.id,
        accion: 'entidad.logo_cambiado',
        entidad: 'entidad',
        entidadId: id,
        antes: { logoKey: antes.logo_key },
        despues: { logoKey: clave },
      });
      return { antes, despues };
    });
    if (antes.logo_key) await this.borrarImagen(antes.logo_key);
    return presentarEntidad(despues);
  }

  private async borrarImagen(clave: string) {
    await Promise.all([
      this.almacenamiento.borrar(clave).catch(() => undefined),
      this.almacenamiento.borrar(miniatura(clave)).catch(() => undefined),
    ]);
  }

  private async exigir(id: string, tx?: Parameters<EntidadDao['porId']>[1]) {
    const e = await this.dao.porId(id, tx);
    if (!e) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
    return e;
  }

  private hoy() {
    return hoyBogota(new Date(this.reloj.ahora()));
  }

  async crear(admin: UsuarioAutenticado, datos: DatosEntidad) {
    return this.transacciones
      .ejecutar((tx) => this.crearEnTransaccion(tx, admin, datos))
      .catch(traducirDuplicado);
  }

  /** La creación en la transacción de quien llama: la usa también la carga por CSV (pieza E). */
  async crearEnTransaccion(tx: ClienteBd, admin: UsuarioAutenticado, datos: DatosEntidad) {
    const e = await this.dao.crear(
      { ...aFila(datos), nombre: datos.nombre.trim(), tipo: datos.tipo.trim() },
      tx,
    );
    await this.bitacora.registrar(tx, {
      usuarioId: admin.id,
      accion: 'entidad.creada',
      entidad: 'entidad',
      entidadId: e.id,
      despues: presentarEntidad(e),
    });
    return presentarEntidad(e);
  }

  async actualizar(admin: UsuarioAutenticado, id: string, cambios: Partial<DatosEntidad>) {
    return this.transacciones
      .ejecutar(async (tx) => {
        const antes = await this.dao.porId(id, tx);
        if (!antes) throw new ErrorDominio('ENTIDAD_NO_ENCONTRADA', 'La entidad no existe', 404);
        const despues = await this.dao.actualizar(id, aFila(cambios), tx);
        await this.bitacora.registrar(tx, {
          usuarioId: admin.id,
          accion: 'entidad.actualizada',
          entidad: 'entidad',
          entidadId: id,
          antes: presentarEntidad(antes),
          despues: presentarEntidad(despues),
        });
        return presentarEntidad(despues);
      })
      .catch(traducirDuplicado);
  }
}

function aFila(d: Partial<DatosEntidad>) {
  return {
    nombre: d.nombre?.trim(),
    tipo: d.tipo?.trim(),
    nit: d.nit,
    sitio_web: d.sitioWeb,
    telefono: d.telefono,
    correo: d.correo,
    descripcion: d.descripcion,
  };
}

export function presentarEntidad(e: Entidad) {
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    nit: e.nit,
    sitioWeb: e.sitio_web,
    telefono: e.telefono,
    correo: e.correo,
    descripcion: e.descripcion,
    verificacion: e.verificacion,
    verificadaEn: e.verificada_en?.toISOString() ?? null,
    tieneLogo: e.logo_key !== null,
  };
}

/** `AlmacenamientoService.guardarImagen` guarda la miniatura junto a la imagen. */
export const miniatura = (clave: string) => clave.replace(/\.webp$/, '-mini.webp');

function traducirDuplicado(error: unknown): never {
  if (restriccionUnicaViolada(error) !== null) {
    throw new ErrorDominio('ENTIDAD_DUPLICADA', 'Ya existe una entidad con ese nombre', 409);
  }
  throw error;
}
