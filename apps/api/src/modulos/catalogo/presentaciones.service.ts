import { Injectable } from '@nestjs/common';
import { errorDeTamano, tamanoDePresentacion, type UnidadBase } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { EstadoCatalogo } from '../../generado/prisma/client';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from './dao/categoria.dao';
import { PresentacionDao } from './dao/presentacion.dao';

type Fila = NonNullable<Awaited<ReturnType<PresentacionDao['buscar']>>>;

export type DatosPresentacion = {
  categoriaId: string;
  nombre: string;
  tamano?: number | null;
  contieneId?: string | null;
  unidades?: number | null;
};

const num = (d: { toString(): string } | null) => (d === null ? null : Number(d));

const calculado = (f: Fila) =>
  tamanoDePresentacion({
    tamano: num(f.tamano),
    unidades: f.unidades,
    contiene: f.contiene ? { tamano: Number(f.contiene.tamano) } : null,
  });

const vista = (f: Fila) => ({
  id: f.id,
  categoriaId: f.categoria_id,
  categoria: f.categoria.nombre,
  unidad: f.categoria.unidad_base,
  nombre: f.nombre,
  clase: f.contiene_id === null ? ('SUELTA' as const) : ('PAQUETE' as const),
  tamano: calculado(f),
  contieneId: f.contiene_id,
  unidades: f.unidades,
  estado: f.estado,
  codigos: f._count.codigos_barras,
});

const duplicada = () =>
  new ErrorDominio(
    'PRESENTACION_DUPLICADA',
    'Ya hay una presentación con ese nombre en la categoría',
    409,
  );

/**
 * Para el `catch` de quien llama a `crearEnTransaccion`: dos pedidos a la vez pueden pasar la
 * revisión de nombre y chocar en la llave única, lo que aborta la transacción. Se atrapa fuera
 * de `Transacciones.ejecutar`; esto lo vuelve `PRESENTACION_DUPLICADA` (409) y relanza lo demás.
 */
export function duplicadaComoErrorDominio(e: unknown): never {
  if (esLlaveDuplicada(e)) throw duplicada();
  throw e;
}

const fueraDeTope = (mensaje: string) => new ErrorDominio('TAMANO_FUERA_DE_TOPE', mensaje, 422);

/** Presentaciones sueltas y paquetes de una categoría (ADR-0021). */
@Injectable()
export class PresentacionesService {
  constructor(
    private readonly dao: PresentacionDao,
    private readonly categorias: CategoriaDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
  ) {}

  async listar(usuario: UsuarioAutenticado, categoriaId: string) {
    const propuestas = usuario.rol === 'DONADOR' ? { de: usuario.id } : ('TODAS' as const);
    return (await this.dao.listarDeCategoria(categoriaId, propuestas)).map(vista);
  }

  async crear(usuario: UsuarioAutenticado, datos: DatosPresentacion) {
    try {
      return await this.transacciones.ejecutar((tx) =>
        this.crearEnTransaccion(tx, usuario, datos, 'VALIDADO'),
      );
    } catch (e) {
      return duplicadaComoErrorDominio(e);
    }
  }

  /**
   * Para quien ya abrió una transacción (códigos de barras, donaciones). Quien llama debe
   * atrapar `esLlaveDuplicada` fuera de `Transacciones.ejecutar` y convertirlo con
   * `duplicadaComoErrorDominio` (409 `PRESENTACION_DUPLICADA`).
   */
  async crearEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    datos: DatosPresentacion,
    estado: EstadoCatalogo,
  ) {
    const cat = await this.categorias.buscar(datos.categoriaId, tx);
    if (!cat || cat.archivada)
      throw new ErrorDominio(
        'CATEGORIA_NO_ENCONTRADA',
        'La categoría no existe o está archivada',
        404,
      );
    const unidad = cat.unidad_base as UnidadBase;
    const esPaquete = datos.contieneId != null;
    let tamano: number | null = null;
    let contieneId: string | null = null;
    let unidades: number | null = null;
    if (esPaquete) {
      const dentro = await this.dao.buscar(datos.contieneId!, tx);
      if (!dentro || dentro.categoria_id !== datos.categoriaId || dentro.contiene_id !== null)
        throw new ErrorDominio(
          'PAQUETE_INVALIDO',
          'Un paquete contiene una presentación suelta de la misma categoría',
          422,
        );
      contieneId = dentro.id;
      unidades = datos.unidades ?? null;
      if (unidades === null)
        throw new ErrorDominio('PAQUETE_INVALIDO', 'Un paquete indica cuántas unidades trae', 422);
      this.exigirTope(Number(dentro.tamano) * unidades, unidad);
    } else {
      tamano = datos.tamano ?? null;
      if (tamano === null)
        throw new ErrorDominio('PAQUETE_INVALIDO', 'Una suelta indica su tamaño', 422);
      this.exigirEntero(unidad, tamano);
      this.exigirTope(tamano, unidad);
    }
    if (await this.dao.buscarPorNombre(datos.categoriaId, datos.nombre, tx)) throw duplicada();
    const f = await this.dao.crear(
      {
        categoria_id: datos.categoriaId,
        nombre: datos.nombre,
        tamano,
        contiene_id: contieneId,
        unidades,
        estado,
        creado_por: usuario.id,
      },
      tx,
    );
    await this.bitacora.registrar(tx, {
      usuarioId: usuario.id,
      accion: 'presentacion.creada',
      entidad: 'presentacion',
      entidadId: f.id,
      despues: vista(f),
    });
    return vista(f);
  }

  async editar(
    usuario: UsuarioAutenticado,
    id: string,
    cambios: {
      nombre?: string;
      tamano?: number;
      contieneId?: string;
      unidades?: number;
      estado?: 'VALIDADO';
    },
  ) {
    try {
      return await this.transacciones.ejecutar(async (tx) => {
        const antes = await this.dao.buscar(id, tx);
        if (!antes)
          throw new ErrorDominio('PRESENTACION_NO_ENCONTRADA', 'La presentación no existe', 404);
        const unidad = antes.categoria.unidad_base as UnidadBase;
        const esPaquete = antes.contiene_id !== null;
        if (esPaquete && cambios.tamano !== undefined)
          throw new ErrorDominio('PAQUETE_INVALIDO', 'El tamaño de un paquete se calcula', 422);
        if (!esPaquete && (cambios.contieneId !== undefined || cambios.unidades !== undefined))
          throw new ErrorDominio('PAQUETE_INVALIDO', 'Una suelta no contiene otras', 422);
        const datos: Parameters<PresentacionDao['actualizar']>[1] = {
          nombre: cambios.nombre,
          estado: cambios.estado,
        };
        if (esPaquete) {
          let tamanoDentro = Number(antes.contiene!.tamano);
          if (cambios.contieneId !== undefined) {
            const dentro = await this.dao.buscar(cambios.contieneId, tx);
            if (
              !dentro ||
              dentro.categoria_id !== antes.categoria_id ||
              dentro.contiene_id !== null
            )
              throw new ErrorDominio(
                'PAQUETE_INVALIDO',
                'Un paquete contiene una presentación suelta de la misma categoría',
                422,
              );
            datos.contiene_id = dentro.id;
            tamanoDentro = Number(dentro.tamano);
          }
          if (cambios.unidades !== undefined) datos.unidades = cambios.unidades;
          this.exigirTope(tamanoDentro * (cambios.unidades ?? antes.unidades!), unidad);
        } else if (cambios.tamano !== undefined) {
          this.exigirEntero(unidad, cambios.tamano);
          this.exigirTope(cambios.tamano, unidad);
          datos.tamano = cambios.tamano;
          for (const p of await this.dao.paquetesQueContienen(id, tx))
            this.exigirTope(
              cambios.tamano * p.unidades!,
              unidad,
              `El paquete «${p.nombre}» pasaría`,
            );
        }
        const f = await this.dao.actualizar(id, datos, tx);
        const afectados = esPaquete ? [] : await this.dao.paquetesQueContienen(id, tx);
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'presentacion.editada',
          entidad: 'presentacion',
          entidadId: id,
          antes: vista(antes),
          despues: {
            ...vista(f),
            paquetesAfectados: cambios.tamano !== undefined ? afectados.map((p) => p.id) : [],
          },
        });
        return vista(f);
      });
    } catch (e) {
      return duplicadaComoErrorDominio(e);
    }
  }

  private exigirTope(tamano: number, unidad: UnidadBase, prefijo?: string) {
    const error = errorDeTamano(Math.round(tamano * 1000) / 1000, unidad);
    if (error) throw fueraDeTope(prefijo ? `${prefijo} a superar el tope: ${error}` : error);
  }

  /** En una categoría por unidades, el tamaño va sin decimales. */
  private exigirEntero(unidad: UnidadBase, tamano: number) {
    if (unidad === 'UNIDAD' && !Number.isInteger(tamano))
      throw new ErrorDominio(
        'CONTENIDO_FRACCIONARIO',
        'En una categoría por unidades, el contenido va sin decimales',
        422,
      );
  }
}
