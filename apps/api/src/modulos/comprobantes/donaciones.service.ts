import { Inject, Injectable } from '@nestjs/common';
import { abiertoAhora, distanciaKm, type Horario } from '@acopio/shared';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { exigirCantidad } from '../inventario/cantidades';
import { generarFolio } from './folio';
import { ordenarSugerencias } from './sugerencias';
import { aComprobanteVista, buscarPorFolio, CON_LINEAS, estadoInvalido } from './vistas';

export interface LineaPreparada {
  categoriaId: string;
  ean?: string;
  cantidad: number;
  venceEn?: Date;
}

/** Lo que hace el Donador con sus donaciones (RF-CMP-001B, 001D, 008). */
@Injectable()
export class DonacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly acopios: AcopiosService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  async crear(usuario: UsuarioAutenticado, datos: { acopioId: string; lineas: LineaPreparada[] }) {
    await this.acopios.exigirAbierto(datos.acopioId);
    const lineas = await Promise.all(datos.lineas.map((l) => this.prepararLinea(l)));

    for (let intento = 0; intento < 5; intento++) {
      try {
        const c = await this.prisma.$transaction(async (tx) => {
          // Dos pestañas a la vez no pasan juntas el límite de preparadas
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'preparadas:' + usuario.id}, 0))`;
          const abiertas = await tx.comprobante.count({
            where: { donador_id: usuario.id, estado: 'PREPARADO' },
          });
          if (abiertas >= this.entorno.PREPARADAS_MAXIMO) {
            throw new ErrorDominio(
              'LIMITE_PREPARADAS',
              `Ya tienes ${abiertas} donaciones preparadas. Entrega o cancela una para preparar otra.`,
              409,
            );
          }
          const creado = await tx.comprobante.create({
            data: {
              folio: generarFolio(new Date().getUTCFullYear()),
              donador_id: usuario.id,
              acopio_id: datos.acopioId,
              lineas: { create: lineas },
            },
            include: CON_LINEAS,
          });
          await this.bitacora.registrar(tx, {
            usuarioId: usuario.id,
            accion: 'comprobante.preparado',
            entidad: 'comprobante',
            entidadId: creado.id,
            ubicacionId: datos.acopioId,
            despues: { folio: creado.folio, lineas: lineas.length },
          });
          return creado;
        });
        return aComprobanteVista(c);
      } catch (e) {
        // Un folio repetido es improbable: se genera otro
        if (esLlaveDuplicada(e) && intento < 4) continue;
        throw e;
      }
    }
    throw new Error('No se pudo generar un folio único');
  }

  private async prepararLinea(l: LineaPreparada) {
    const cat = await this.prisma.categoria.findUnique({
      where: { id: l.categoriaId },
      select: { archivada: true, unidad_base: true },
    });
    if (!cat || cat.archivada) {
      throw new ErrorDominio(
        'CATEGORIA_NO_DISPONIBLE',
        'Una de las categorías ya no está disponible',
      );
    }
    const codigo = l.ean
      ? await this.prisma.codigoBarras.findUnique({ where: { ean: l.ean } })
      : null;
    if (codigo && codigo.categoria_id !== l.categoriaId) {
      throw new ErrorDominio('CODIGO_NO_COINCIDE', 'El código escaneado es de otra categoría');
    }
    const contenido = codigo?.contenido ? Number(codigo.contenido) : 1;
    // Sin contenido, la cantidad va en la unidad base: en UNIDAD, entera
    if (contenido === 1) exigirCantidad(l.cantidad, cat.unidad_base);
    return {
      categoria_id: l.categoriaId,
      ean: codigo ? l.ean : null,
      contenido_unitario: contenido,
      cantidad_declarada: l.cantidad,
      vence_en: l.venceEn ?? null,
    };
  }

  async listar(usuario: UsuarioAutenticado, estado?: string) {
    const filas = await this.prisma.comprobante.findMany({
      where: { donador_id: usuario.id, ...(estado ? { estado: estado as never } : {}) },
      include: CON_LINEAS,
      orderBy: { creado_en: 'desc' },
    });
    return filas.map(aComprobanteVista);
  }

  async cancelar(usuario: UsuarioAutenticado, texto: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    // Una donación ajena responde igual que una que no existe
    if (c.donador_id !== usuario.id) await buscarPorFolio(this.prisma, '');
    if (c.estado !== 'PREPARADO') throw estadoInvalido(c.estado, 'cancelar');
    const hecho = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.comprobante.update({
        where: { id: c.id },
        data: { estado: 'CANCELADO', cerrado_en: new Date() },
        include: CON_LINEAS,
      });
      await this.bitacora.registrar(tx, {
        usuarioId: usuario.id,
        accion: 'comprobante.cancelado',
        entidad: 'comprobante',
        entidadId: c.id,
        ubicacionId: c.acopio_id,
        antes: { estado: c.estado },
        despues: { estado: 'CANCELADO' },
      });
      return actualizado;
    });
    return aComprobanteVista(hecho);
  }

  async sugerir(categorias: string[], ubicacion?: { lat: number; lng: number }) {
    const hoy = new Date();
    const acopios = await this.prisma.acopio.findMany({
      where: { estado: 'ACTIVO' },
      select: { id: true, nombre: true, direccion: true, lat: true, lng: true, horario: true },
    });
    const marcas = await this.prisma.noRecibir.findMany({
      where: {
        categoria_id: { in: categorias },
        OR: [{ hasta: null }, { hasta: { gte: hoy } }],
      },
      select: { acopio_id: true, categoria_id: true },
    });
    return ordenarSugerencias(
      acopios.map((x) => ({
        acopioId: x.id,
        nombre: x.nombre,
        direccion: x.direccion,
        abiertoAhora: abiertoAhora(x.horario as unknown as Horario, hoy),
        distanciaKm: ubicacion
          ? distanciaKm(ubicacion, { lat: Number(x.lat), lng: Number(x.lng) })
          : null,
        noRecibe: marcas.filter((m) => m.acopio_id === x.id).map((m) => m.categoria_id),
      })),
      categorias,
    );
  }

  /** Para el escáner del Donador: sin quién asoció el código (P-038). */
  async codigo(ean: string) {
    const c = await this.prisma.codigoBarras.findUnique({
      where: { ean },
      include: {
        categoria: {
          select: {
            nombre: true,
            unidad_base: true,
            perecedero: true,
            grupo: true,
            archivada: true,
          },
        },
      },
    });
    if (!c || c.categoria.archivada) {
      throw new ErrorDominio(
        'EAN_DESCONOCIDO',
        'No conocemos ese código. Busca el producto por nombre.',
        404,
      );
    }
    return {
      ean: c.ean,
      categoriaId: c.categoria_id,
      categoria: c.categoria.nombre,
      unidad: c.categoria.unidad_base,
      grupo: c.categoria.grupo,
      perecedero: c.categoria.perecedero,
      contenido: c.contenido === null ? null : Number(c.contenido),
    };
  }
}
