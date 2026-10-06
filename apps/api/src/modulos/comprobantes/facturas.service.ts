import { ForbiddenException, Injectable } from '@nestjs/common';
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
    try {
      hecho = await this.prisma.$transaction(async (tx) => {
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
    if (c.factura_key) await this.almacenamiento.borrar(c.factura_key);
    if (c.miniatura_key) await this.almacenamiento.borrar(c.miniatura_key);
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
