import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { PrismaService } from '../../comun/prisma/prisma.service';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { aComprobanteVista, buscarPorFolio, CON_LINEAS, estadoInvalido } from './vistas';

const NO_ENCONTRADO = () =>
  new ErrorDominio('FOLIO_NO_ENCONTRADO', 'No encontramos ese folio', 404);

/** Foto de factura opcional (RF-CMP-001B, 002). Una por donación (C-08). */
@Injectable()
export class FacturasService {
  private readonly log = new Logger(FacturasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly alcance: AlcanceService,
  ) {}

  async subir(usuario: UsuarioAutenticado, texto: string, datos: Buffer) {
    const c = await buscarPorFolio(this.prisma, texto);
    if (c.donador_id !== usuario.id) throw NO_ENCONTRADO();
    if (c.estado !== 'PREPARADO') throw estadoInvalido(c.estado, 'cambiar la factura');
    const imagen = await this.almacenamiento.guardarImagen(`facturas/${c.id}`, datos);
    let hecho;
    let anteriores: (string | null)[] = [];
    try {
      hecho = await this.prisma.$transaction(async (tx) => {
        // Con la fila bloqueada se leen las claves vigentes: dos reemplazos a la vez no se pisan
        const previas = await tx.$queryRaw<
          { factura_key: string | null; miniatura_key: string | null }[]
        >`
          SELECT factura_key, miniatura_key FROM comprobante WHERE id = ${c.id}::uuid FOR UPDATE`;
        anteriores = [previas[0]?.factura_key ?? null, previas[0]?.miniatura_key ?? null];
        // El estado se vuelve a exigir en el UPDATE: pudo cancelarse o recibirse en medio
        const { count } = await tx.comprobante.updateMany({
          where: { id: c.id, estado: 'PREPARADO' },
          data: {
            factura_key: imagen.clave,
            miniatura_key: imagen.miniatura,
            factura_tipo: imagen.tipo,
            factura_bytes: imagen.bytes,
          },
        });
        if (count === 0) {
          const actual = await tx.comprobante.findUniqueOrThrow({
            where: { id: c.id },
            select: { estado: true },
          });
          throw estadoInvalido(actual.estado, 'cambiar la factura');
        }
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'comprobante.factura',
          entidad: 'comprobante',
          entidadId: c.id,
          ubicacionId: c.acopio_id,
          despues: { bytes: imagen.bytes },
        });
        return tx.comprobante.findUniqueOrThrow({ where: { id: c.id }, include: CON_LINEAS });
      });
    } catch (e) {
      // La transacción no guardó las claves: los objetos recién subidos quedarían huérfanos
      await Promise.allSettled([
        this.almacenamiento.borrar(imagen.clave),
        this.almacenamiento.borrar(imagen.miniatura),
      ]);
      throw e;
    }
    // La anterior se borra después de guardar la nueva: si algo falla, no queda sin foto
    // Ya está guardado: si el borrado falla se registra, nunca se responde 500
    const resultados = await Promise.allSettled(
      anteriores.filter((k): k is string => !!k).map((k) => this.almacenamiento.borrar(k)),
    );
    for (const r of resultados) {
      if (r.status === 'rejected') this.log.error('No se pudo borrar la foto anterior', r.reason);
    }
    return aComprobanteVista(hecho);
  }

  /** El Donador dueño, y el Auditor o el Administrador con alcance sobre el acopio. */
  async url(usuario: UsuarioAutenticado, texto: string) {
    const c = await buscarPorFolio(this.prisma, texto);
    if (usuario.rol === 'DONADOR' && c.donador_id !== usuario.id) throw NO_ENCONTRADO();
    if (usuario.rol !== 'DONADOR' && !(await this.alcance.puede(usuario, 'ACOPIO', c.acopio_id))) {
      throw new ForbiddenException('No tienes asignado este acopio');
    }
    if (!c.factura_key || !c.miniatura_key) {
      throw new ErrorDominio('SIN_FACTURA', 'Esta donación no tiene foto de factura', 404);
    }
    const [imagen, mini] = await Promise.all([
      this.almacenamiento.urlFirmada(c.factura_key),
      this.almacenamiento.urlFirmada(c.miniatura_key),
    ]);
    return { url: imagen.url, miniaturaUrl: mini.url, venceEn: imagen.venceEn };
  }
}
