import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { esLlaveDuplicada } from '../../comun/prisma/errores';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { Movimiento } from '../../generado/prisma/client';
import { AcopiosService } from '../acopios/acopios.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { CategoriaDao } from '../catalogo/dao/categoria.dao';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { categoriaParaMovimiento, exigirCantidad } from './cantidades';
import { MovimientoDao } from './dao/movimiento.dao';
import { SaldoDao } from './dao/saldo.dao';
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
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'RECEPCION';
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
// Con muchas salidas de la misma categoría a la vez, cada una espera el candado: más
// margen que los 5 s por defecto de Prisma antes de abandonar
const TRANSACCION = { timeout: 15_000, maxWait: 10_000 };
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
    private readonly transacciones: Transacciones,
    private readonly movimientos: MovimientoDao,
    private readonly saldos: SaldoDao,
    private readonly categorias: CategoriaDao,
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

  saldoDe(cliente: ClienteBd, acopioId: string, categoriaId: string): Promise<number> {
    return this.saldos.cantidad(acopioId, categoriaId, cliente);
  }

  async noRecibe(acopioId: string, categoriaId: string): Promise<boolean> {
    const lista = await this.noRecibir.listar(acopioId);
    return lista.some((x) => x.categoriaId === categoriaId);
  }

  /**
   * Una ENTRADA dentro de la transacción de quien llama. La recepción de una donación crea
   * varias y sus vínculos de una vez (Bloque 3). Quien llama exige antes el alcance y el
   * acopio abierto; aquí se validan la categoría, la cantidad y el vencimiento.
   */
  async entradaEnTransaccion(
    tx: ClienteBd,
    usuario: UsuarioAutenticado,
    acopioId: string,
    datos: {
      id?: string;
      categoriaId: string;
      cantidad: number;
      venceEn: Date | null;
      ocurridoEn: Date;
      origenOffline: boolean;
    },
  ): Promise<{ fila: Movimiento; saldo: number }> {
    const cat = await categoriaParaMovimiento(this.categorias, tx, datos.categoriaId);
    exigirCantidad(datos.cantidad, cat.unidad_base);
    if (cat.perecedero && !datos.venceEn) {
      throw new ErrorDominio(
        'VENCIMIENTO_OBLIGATORIO',
        'Esta categoría es perecedera: indica la fecha de vencimiento',
      );
    }
    // El candado deja el antes y el después de la bitácora sin entradas ajenas en medio
    const antes = await this.bloquearSaldo(tx, acopioId, datos.categoriaId);
    const fila = await this.movimientos.crear(tx, {
      id: datos.id,
      acopio_id: acopioId,
      categoria_id: datos.categoriaId,
      tipo: 'ENTRADA',
      signo: 1,
      cantidad: datos.cantidad,
      vence_en: cat.perecedero ? datos.venceEn : null,
      usuario_id: usuario.id,
      ocurrido_en: datos.ocurridoEn,
      origen_offline: datos.origenOffline,
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
    return { fila, saldo };
  }

  async entrada(
    usuario: UsuarioAutenticado,
    acopioId: string,
    datos: DatosEntrada,
  ): Promise<{ resultado: ResultadoMovimiento; nuevo: boolean }> {
    // Un reintento de la cola recibe el original aunque desde entonces se haya cerrado el
    // acopio o la fecha haya salido de la ventana de 7 días: solo se exige el alcance
    await this.alcance.exigir(usuario, 'ACOPIO', acopioId);
    if (datos.id) {
      const previo = await this.movimientos.buscar(datos.id);
      if (previo) return { resultado: await this.repetido(previo, acopioId, datos), nuevo: false };
    }
    await this.acopios.exigirAbierto(acopioId);
    const ocurridoEn = exigirOcurridoEn(datos.ocurridoEn);

    try {
      const resultado = await this.transacciones.ejecutar(async (tx) => {
        const { fila, saldo } = await this.entradaEnTransaccion(tx, usuario, acopioId, {
          ...datos,
          ocurridoEn,
        });
        return { movimiento: aMovimientoVista(fila), saldo };
      }, TRANSACCION);
      return {
        resultado: { ...resultado, noRecibe: await this.noRecibe(acopioId, datos.categoriaId) },
        nuevo: true,
      };
    } catch (e) {
      // Dos envíos simultáneos del mismo id: el segundo choca con la llave primaria
      if (datos.id && esLlaveDuplicada(e)) {
        const previo = await this.movimientos.buscar(datos.id);
        if (!previo) throw e;
        return { resultado: await this.repetido(previo, acopioId, datos), nuevo: false };
      }
      throw e;
    }
  }

  /**
   * Lee el saldo después de tomar un candado de la transacción por (acopio, categoría):
   * dos salidas o ajustes de la misma categoría se ordenan. No usa FOR UPDATE porque
   * exige permiso de UPDATE sobre saldo, que acopio_app no tiene (ADR-0015).
   */
  private async bloquearSaldo(
    tx: ClienteBd,
    acopioId: string,
    categoriaId: string,
  ): Promise<number> {
    await this.saldos.bloquear(tx, acopioId, categoriaId);
    return this.saldoDe(tx, acopioId, categoriaId);
  }

  async salida(
    usuario: UsuarioAutenticado,
    acopioId: string,
    datos: {
      categoriaId: string;
      cantidad: number;
      motivoSalida: 'ENTREGA_FAMILIAS' | 'TRASLADO' | 'VENCIDO' | 'OTRO';
      nota: string | null;
    },
  ): Promise<ResultadoMovimiento> {
    await this.exigirOperador(usuario, acopioId);
    const nota = datos.nota?.trim() || null;
    if ((datos.motivoSalida === 'TRASLADO' || datos.motivoSalida === 'OTRO') && !nota) {
      throw new ErrorDominio(
        'NOTA_OBLIGATORIA',
        'Cuenta a quién va o por qué sale, en una nota corta',
      );
    }
    return this.conSaldoInsuficiente(acopioId, datos.categoriaId, () =>
      this.transacciones.ejecutar(async (tx) => {
        const cat = await categoriaParaMovimiento(this.categorias, tx, datos.categoriaId);
        exigirCantidad(datos.cantidad, cat.unidad_base);
        const antes = await this.bloquearSaldo(tx, acopioId, datos.categoriaId);
        if (datos.cantidad > antes + 1e-9) throw saldoInsuficiente(antes);
        const fila = await this.movimientos.crear(tx, {
          acopio_id: acopioId,
          categoria_id: datos.categoriaId,
          tipo: 'SALIDA',
          signo: -1,
          cantidad: datos.cantidad,
          motivo_salida: datos.motivoSalida,
          nota,
          usuario_id: usuario.id,
          ocurrido_en: new Date(),
        });
        const saldo = await this.saldoDe(tx, acopioId, datos.categoriaId);
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'movimiento.salida',
          entidad: 'movimiento',
          entidadId: fila.id,
          ubicacionId: acopioId,
          antes: { categoria: cat.nombre, saldo: antes },
          despues: {
            categoria: cat.nombre,
            cantidad: datos.cantidad,
            motivo: datos.motivoSalida,
            nota,
            saldo,
          },
        });
        return { movimiento: aMovimientoVista(fila), saldo, noRecibe: false };
      }, TRANSACCION),
    );
  }

  async ajuste(
    usuario: UsuarioAutenticado,
    acopioId: string,
    datos: { categoriaId: string; cantidadContada: number; motivo: string },
  ): Promise<ResultadoMovimiento> {
    await this.exigirOperador(usuario, acopioId);
    const motivo = datos.motivo.trim();
    return this.conSaldoInsuficiente(acopioId, datos.categoriaId, () =>
      this.transacciones.ejecutar(async (tx) => {
        const cat = await categoriaParaMovimiento(this.categorias, tx, datos.categoriaId);
        if (datos.cantidadContada > 0) exigirCantidad(datos.cantidadContada, cat.unidad_base);
        const antes = await this.bloquearSaldo(tx, acopioId, datos.categoriaId);
        const diferencia = Math.round((datos.cantidadContada - antes) * 1000) / 1000;
        if (diferencia === 0) {
          throw new ErrorDominio(
            'SIN_DIFERENCIA',
            'Lo contado coincide con el saldo; no hay nada que ajustar',
          );
        }
        const fila = await this.movimientos.crear(tx, {
          acopio_id: acopioId,
          categoria_id: datos.categoriaId,
          tipo: 'AJUSTE',
          signo: diferencia > 0 ? 1 : -1,
          cantidad: Math.abs(diferencia),
          motivo,
          usuario_id: usuario.id,
          ocurrido_en: new Date(),
        });
        const saldo = await this.saldoDe(tx, acopioId, datos.categoriaId);
        await this.bitacora.registrar(tx, {
          usuarioId: usuario.id,
          accion: 'movimiento.ajuste',
          entidad: 'movimiento',
          entidadId: fila.id,
          ubicacionId: acopioId,
          destacado: true,
          antes: { categoria: cat.nombre, saldo: antes },
          despues: {
            categoria: cat.nombre,
            contado: datos.cantidadContada,
            diferencia,
            motivo,
            saldo,
          },
        });
        return { movimiento: aMovimientoVista(fila), saldo, noRecibe: false };
      }, TRANSACCION),
    );
  }

  /** Si el CHECK de saldo salta pese al bloqueo, responde lo mismo que la validación. */
  private async conSaldoInsuficiente<T>(
    acopioId: string,
    categoriaId: string,
    hacer: () => Promise<T>,
  ) {
    try {
      return await hacer();
    } catch (e) {
      if (/saldo_cantidad_no_negativa/.test(String((e as Error)?.message ?? ''))) {
        throw saldoInsuficiente(await this.saldos.cantidad(acopioId, categoriaId));
      }
      throw e;
    }
  }

  /** La fecha que se guarda: en una categoría no perecedera se descarta. */
  private async venceGuardado(datos: DatosEntrada): Promise<Date | null> {
    if (!datos.venceEn) return null;
    const cat = await this.categorias.buscar(datos.categoriaId);
    return cat?.perecedero ? datos.venceEn : null;
  }

  /** Un reintento con el mismo id: el original si coincide, 409 si no. */
  private async repetido(previo: Movimiento, acopioId: string, datos: DatosEntrada) {
    const igual =
      previo.tipo === 'ENTRADA' &&
      previo.acopio_id === acopioId &&
      previo.categoria_id === datos.categoriaId &&
      Number(previo.cantidad) === datos.cantidad &&
      soloDia(previo.vence_en) === soloDia(await this.venceGuardado(datos));
    if (!igual) {
      throw new ErrorDominio(
        'MOVIMIENTO_DISTINTO',
        'Ya existe un movimiento con ese identificador y otros datos',
        409,
      );
    }
    return {
      movimiento: aMovimientoVista(previo),
      saldo: await this.saldos.cantidad(acopioId, datos.categoriaId),
      noRecibe: await this.noRecibe(acopioId, datos.categoriaId),
    };
  }
}

const saldoInsuficiente = (saldo: number) =>
  new ErrorDominio('SALDO_INSUFICIENTE', `No alcanza: hay ${saldo} disponibles`, 409, { saldo });
