import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { Movimiento } from '../../generado/prisma/client';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { categoriaParaMovimiento, exigirCantidad } from './cantidades';
import { NoRecibirService } from './no-recibir.service';

export interface DatosEntrada {
  id?: string;
  categoriaId: string;
  cantidad: number;
  venceEn: Date | null;
  ocurridoEn: Date | null;
  origenOffline: boolean;
}

export interface MovimientoVista {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  categoriaId: string;
  cantidad: number;
  signo: 1 | -1;
  motivoSalida: 'ENTREGA_FAMILIAS' | 'TRASLADO' | 'VENCIDO' | 'OTRO' | null;
  nota: string | null;
  motivo: string | null;
  venceEn: string | null;
  ocurridoEn: Date;
  registradoEn: Date;
  origenOffline: boolean;
}

export interface ResultadoMovimiento {
  movimiento: MovimientoVista;
  saldo: number;
  noRecibe: boolean;
}

const SIETE_DIAS = 7 * 86400_000;
const CINCO_MINUTOS = 5 * 60_000;
const soloDia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const aMovimientoVista = (m: Movimiento): MovimientoVista => ({
  id: m.id,
  tipo: m.tipo,
  categoriaId: m.categoria_id,
  cantidad: Number(m.cantidad),
  signo: m.signo as 1 | -1,
  motivoSalida: m.motivo_salida,
  nota: m.nota,
  motivo: m.motivo,
  venceEn: soloDia(m.vence_en),
  ocurridoEn: m.ocurrido_en,
  registradoEn: m.registrado_en,
  origenOffline: m.origen_offline,
});

/** Hasta 7 días atrás y como mucho 5 minutos adelante (relojes desfasados). */
export function exigirOcurridoEn(ocurridoEn: Date | null): Date {
  const ahora = Date.now();
  if (!ocurridoEn) return new Date(ahora);
  const t = ocurridoEn.getTime();
  if (t < ahora - SIETE_DIAS || t > ahora + CINCO_MINUTOS) {
    throw new ErrorDominio(
      'FECHA_FUERA_DE_RANGO',
      'La fecha del registro debe ser de los últimos 7 días y no del futuro',
    );
  }
  return ocurridoEn;
}

/** Movimientos inmutables del inventario (RF-INV-001, 003, 004, 011; ADR-0002, ADR-0015). */
@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bitacora: BitacoraService,
    private readonly alcance: AlcanceService,
    private readonly acopios: AcopiosService,
    private readonly noRecibir: NoRecibirService,
  ) {}

  /** Solo el Operador asignado registra (V-04). El rol lo filtra el controlador. */
  async exigirOperador(usuario: UsuarioAutenticado, acopioId: string) {
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    await this.acopios.exigirAbierto(acopioId);
  }

  async saldoDe(cliente: ClienteBd, acopioId: string, categoriaId: string): Promise<number> {
    const s = await cliente.saldo.findUnique({
      where: { acopio_id_categoria_id: { acopio_id: acopioId, categoria_id: categoriaId } },
      select: { cantidad: true },
    });
    return s ? Number(s.cantidad) : 0;
  }

  async noRecibe(acopioId: string, categoriaId: string): Promise<boolean> {
    const lista = await this.noRecibir.listar(acopioId);
    return lista.some((x) => x.categoriaId === categoriaId);
  }

  async entrada(
    usuario: UsuarioAutenticado,
    acopioId: string,
    datos: DatosEntrada,
  ): Promise<{ resultado: ResultadoMovimiento; nuevo: boolean }> {
    await this.exigirOperador(usuario, acopioId);
    const ocurridoEn = exigirOcurridoEn(datos.ocurridoEn);

    if (datos.id) {
      const previo = await this.prisma.movimiento.findUnique({ where: { id: datos.id } });
      if (previo) return { resultado: await this.repetido(previo, acopioId, datos), nuevo: false };
    }

    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const cat = await categoriaParaMovimiento(tx, datos.categoriaId);
        exigirCantidad(datos.cantidad, cat.unidad_base);
        if (cat.perecedero && !datos.venceEn) {
          throw new ErrorDominio(
            'VENCIMIENTO_OBLIGATORIO',
            'Esta categoría es perecedera: indica la fecha de vencimiento',
          );
        }
        const antes = await this.saldoDe(tx, acopioId, datos.categoriaId);
        const fila = await tx.movimiento.create({
          data: {
            id: datos.id,
            acopio_id: acopioId,
            categoria_id: datos.categoriaId,
            tipo: 'ENTRADA',
            signo: 1,
            cantidad: datos.cantidad,
            vence_en: cat.perecedero ? datos.venceEn : null,
            usuario_id: usuario.id,
            ocurrido_en: ocurridoEn,
            origen_offline: datos.origenOffline,
          },
        });
        const saldo = await this.saldoDe(tx, acopioId, datos.categoriaId);
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'movimiento.entrada',
          entidad: 'movimiento',
          entidadId: fila.id,
          ubicacionId: acopioId,
          antes: { categoria: cat.nombre, saldo: antes },
          despues: { categoria: cat.nombre, cantidad: datos.cantidad, saldo },
        });
        return { movimiento: aMovimientoVista(fila), saldo };
      });
      return {
        resultado: { ...resultado, noRecibe: await this.noRecibe(acopioId, datos.categoriaId) },
        nuevo: true,
      };
    } catch (e) {
      // Dos envíos simultáneos del mismo id: el segundo choca con la llave primaria
      if (datos.id && esLlaveDuplicada(e)) {
        const previo = await this.prisma.movimiento.findUniqueOrThrow({ where: { id: datos.id } });
        return { resultado: await this.repetido(previo, acopioId, datos), nuevo: false };
      }
      throw e;
    }
  }

  /** Un reintento con el mismo id: el original si coincide, 409 si no. */
  private async repetido(previo: Movimiento, acopioId: string, datos: DatosEntrada) {
    const igual =
      previo.tipo === 'ENTRADA' &&
      previo.acopio_id === acopioId &&
      previo.categoria_id === datos.categoriaId &&
      Number(previo.cantidad) === datos.cantidad &&
      soloDia(previo.vence_en) === soloDia(datos.venceEn);
    if (!igual) {
      throw new ErrorDominio(
        'MOVIMIENTO_DISTINTO',
        'Ya existe un movimiento con ese identificador y otros datos',
        409,
      );
    }
    return {
      movimiento: aMovimientoVista(previo),
      saldo: await this.saldoDe(this.prisma, acopioId, datos.categoriaId),
      noRecibe: await this.noRecibe(acopioId, datos.categoriaId),
    };
  }
}
