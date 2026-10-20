import { Injectable } from '@nestjs/common';
import { tamanoDePresentacion } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { EstadoCatalogo } from '../../generado/prisma/client';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CodigoBarrasDao } from './dao/codigo-barras.dao';
import { PresentacionDao } from './dao/presentacion.dao';

type Fila = NonNullable<Awaited<ReturnType<CodigoBarrasDao['conCategoria']>>>;

const num = (d: { toString(): string }) => Number(d);

const tamanoDe = (f: Fila) => {
  const p = f.presentacion;
  if (!p) return null;
  return tamanoDePresentacion({
    tamano: p.tamano === null ? null : num(p.tamano),
    unidades: p.unidades,
    contiene: p.contiene ? { tamano: num(p.contiene.tamano!) } : null,
  });
};

const vista = (f: Fila) => {
  const tamano = tamanoDe(f);
  return {
    ean: f.ean,
    categoriaId: f.categoria_id,
    categoria: f.categoria.nombre,
    unidad: f.categoria.unidad_base,
    presentacion: f.presentacion
      ? { id: f.presentacion.id, nombre: f.presentacion.nombre, tamano: tamano! }
      : null,
    contenido: tamano,
    estado: f.estado,
    porRevisar: f.por_revisar,
    grupo: f.categoria.grupo,
    perecedero: f.categoria.perecedero,
    creadoEn: f.creado_en,
  };
};

const yaAsociado = () =>
  new ErrorDominio('EAN_YA_ASOCIADO', 'Este código ya está asociado a una categoría', 409);
const desconocido = () =>
  new ErrorDominio('EAN_DESCONOCIDO', 'Este código no está asociado a ninguna categoría', 404);

/**
 * Para el `catch` de quien llama a `proponerEnTransaccion` o `asociarEnTransaccion`: dos pedidos
 * a la vez pueden pasar la revisión previa y chocar en la llave única, lo que aborta la
 * transacción. Se atrapa fuera de `Transacciones.ejecutar`; esto lo vuelve `EAN_YA_ASOCIADO`.
 */
export function eanYaAsociadoComoErrorDominio(e: unknown): never {
  if (esLlaveDuplicada(e)) throw yaAsociado();
  throw e;
}

/** EAN → presentación → categoría (RF-CAT-004, ADR-0021). */
@Injectable()
export class CodigosBarrasService {
  constructor(
    private readonly dao: CodigoBarrasDao,
    private readonly presentaciones: PresentacionDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
  ) {}

  /** La vista con el nombre de quien asoció cada código (C18). Los nombres salen en una sola consulta. */
  private async conAutores(filas: Fila[], bd?: ClienteBd) {
    const ids = [...new Set(filas.map((f) => f.creado_por))];
    const nombres = new Map((await this.dao.autores(ids, bd)).map((u) => [u.id, u.nombre]));
    return filas.map((f) => ({ ...vista(f), creadoPor: nombres.get(f.creado_por) ?? null }));
  }

  private async conAutor(f: Fila, bd?: ClienteBd) {
    return (await this.conAutores([f], bd))[0]!;
  }

  async obtener(ean: string) {
    const f = await this.dao.conCategoria(ean);
    if (!f || f.categoria.archivada) throw desconocido();
    return this.conAutor(f);
  }

  async listar(filtro: { q?: string; estado?: EstadoCatalogo; categoriaId?: string }) {
    return this.conAutores(await this.dao.listar(filtro));
  }

  private async presentacionActiva(tx: ClienteBd, id: string) {
    const p = await this.presentaciones.buscar(id, tx);
    if (!p) throw new ErrorDominio('PRESENTACION_NO_ENCONTRADA', 'La presentación no existe', 404);
    if (p.categoria.archivada)
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    return p;
  }

  /** Una presentación `PROPUESTO` que un Operador o el Administrador usa queda `VALIDADO`. */
  private async validarPresentacion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    p: { id: string; estado: EstadoCatalogo },
  ) {
    if (p.estado === 'VALIDADO') return;
    await this.presentaciones.actualizar(p.id, { estado: 'VALIDADO' }, tx);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'presentacion.editada',
      entidad: 'presentacion',
      entidadId: p.id,
      antes: { estado: 'PROPUESTO' },
      despues: { estado: 'VALIDADO' },
    });
  }

  private async crear(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    ean: string,
    presentacionId: string,
    estado: EstadoCatalogo,
    accion: string,
  ) {
    const p = await this.presentacionActiva(tx, presentacionId);
    if (await this.dao.buscar(ean, tx)) throw yaAsociado();
    if (estado === 'VALIDADO') await this.validarPresentacion(tx, usuario, p);
    const f = await this.dao.crear(
      {
        ean,
        categoria_id: p.categoria_id,
        presentacion_id: p.id,
        estado,
        creado_por: usuario.id,
      },
      tx,
    );
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion,
      entidad: 'codigo_barras',
      entidadId: ean,
      despues: vista(f),
    });
    return f;
  }

  async asociar(usuario: UsuarioAutenticado, ean: string, presentacionId: string) {
    try {
      return await this.transacciones.ejecutar(async (tx) =>
        this.conAutor(await this.asociarEnTransaccion(tx, usuario, ean, presentacionId), tx),
      );
    } catch (e) {
      return eanYaAsociadoComoErrorDominio(e);
    }
  }

  /**
   * Código nuevo ya `VALIDADO` (Operador o Administrador). 409 `EAN_YA_ASOCIADO` si existe.
   * Quien llama debe atrapar `esLlaveDuplicada` fuera de `Transacciones.ejecutar` y convertirlo
   * con `eanYaAsociadoComoErrorDominio`: dos pedidos a la vez pueden chocar en la llave única.
   */
  asociarEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    ean: string,
    presentacionId: string,
  ) {
    return this.crear(tx, usuario, ean, presentacionId, 'VALIDADO', 'codigo_barras.asociado');
  }

  /**
   * Código nuevo `PROPUESTO` (un Donador lo ve en una donación). Misma advertencia que
   * `asociarEnTransaccion` sobre la llave duplicada.
   */
  proponerEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    ean: string,
    presentacionId: string,
  ) {
    return this.crear(tx, usuario, ean, presentacionId, 'PROPUESTO', 'codigo_barras.propuesto');
  }

  validar(usuario: UsuarioAutenticado, ean: string, presentacionId: string) {
    return this.transacciones.ejecutar(async (tx) =>
      this.conAutor(await this.validarEnTransaccion(tx, usuario, ean, presentacionId), tx),
    );
  }

  /**
   * Confirma o corrige un `PROPUESTO`: queda `VALIDADO` con la presentación dada (la categoría
   * la sigue) y valida también la presentación si estaba `PROPUESTO`. 404 `EAN_DESCONOCIDO` si
   * no existe y 409 `CODIGO_YA_VALIDADO` si ya estaba validado. Solo actualiza una fila.
   */
  async validarEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    ean: string,
    presentacionId: string,
  ) {
    const antes = await this.dao.conCategoria(ean, tx);
    if (!antes) throw desconocido();
    if (antes.estado === 'VALIDADO')
      throw new ErrorDominio('CODIGO_YA_VALIDADO', 'Este código ya está validado', 409);
    const p = await this.presentacionActiva(tx, presentacionId);
    await this.validarPresentacion(tx, usuario, p);
    const f = await this.dao.actualizar(
      ean,
      { estado: 'VALIDADO', presentacion_id: p.id, categoria_id: p.categoria_id },
      tx,
    );
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'codigo_barras.validado',
      entidad: 'codigo_barras',
      entidadId: ean,
      antes: vista(antes),
      despues: vista(f),
    });
    return f;
  }

  /**
   * Una recepción vio algo que no cuadra con la presentación del código: queda `por_revisar`
   * para el Administrador. Si ya lo estaba, no escribe nada. 404 `EAN_DESCONOCIDO` si no existe.
   */
  async marcarParaRevisarEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    ean: string,
    motivo: string,
  ) {
    const antes = await this.dao.conCategoria(ean, tx);
    if (!antes) throw desconocido();
    if (antes.por_revisar) return antes;
    const f = await this.dao.actualizar(ean, { por_revisar: true }, tx);
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'codigo_barras.marcado',
      entidad: 'codigo_barras',
      entidadId: ean,
      antes: vista(antes),
      despues: { ...vista(f), motivo },
    });
    return f;
  }

  async editar(
    usuario: UsuarioAutenticado,
    ean: string,
    cambios: { presentacionId?: string; estado?: 'VALIDADO'; porRevisar?: false },
  ) {
    return this.transacciones.ejecutar(async (tx) => {
      const antes = await this.dao.conCategoria(ean, tx);
      if (!antes) throw desconocido();
      const datos: Parameters<CodigoBarrasDao['actualizar']>[1] = {};
      let validaPresentacion: { id: string; estado: EstadoCatalogo } | undefined;
      if (cambios.presentacionId !== undefined) {
        const p = await this.presentacionActiva(tx, cambios.presentacionId);
        // Sin borrado, el Administrador corrige moviendo el código; la categoría sigue a la presentación.
        datos.presentacion_id = p.id;
        datos.categoria_id = p.categoria_id;
        validaPresentacion = p;
      }
      if (cambios.estado === 'VALIDADO') {
        datos.estado = 'VALIDADO';
        if (!validaPresentacion && antes.presentacion_id)
          validaPresentacion =
            (await this.presentaciones.buscar(antes.presentacion_id, tx)) ?? undefined;
      }
      if (cambios.porRevisar === false) datos.por_revisar = false;
      if (validaPresentacion) await this.validarPresentacion(tx, usuario, validaPresentacion);
      const sinCambio =
        (datos.presentacion_id === undefined || datos.presentacion_id === antes.presentacion_id) &&
        (datos.estado === undefined || datos.estado === antes.estado) &&
        (datos.por_revisar === undefined || datos.por_revisar === antes.por_revisar);
      if (sinCambio) return this.conAutor(antes, tx);
      const f = await this.dao.actualizar(ean, datos, tx);
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'codigo_barras.editado',
        entidad: 'codigo_barras',
        entidadId: ean,
        antes: vista(antes),
        despues: vista(f),
      });
      return this.conAutor(f, tx);
    });
  }
}
