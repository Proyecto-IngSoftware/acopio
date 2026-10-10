import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Transacciones } from '../../comun/prisma/transacciones';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { BitacoraService } from '../auditoria/bitacora.service';
import { ComprobanteDao } from './dao/comprobante.dao';

const DIA = 86_400_000;

/** Lo que pasa solo con el tiempo: preparadas que vencen y facturas que se borran (§5). */
@Injectable()
export class TareasCustodiaService {
  private readonly log = new Logger(TareasCustodiaService.name);

  constructor(
    private readonly transacciones: Transacciones,
    private readonly comprobantes: ComprobanteDao,
    private readonly bitacora: BitacoraService,
    private readonly almacen: AlmacenamientoService,
    @Inject(ENTORNO) private readonly entorno: Entorno,
  ) {}

  /** Cada día a las 00:15 en Colombia: una preparada que nadie entregó en 7 días se cancela. */
  @Cron('15 0 * * *', { name: 'preparadas-vencidas', timeZone: 'America/Bogota' })
  async cancelarVencidas(ahora = new Date()): Promise<number> {
    const limite = new Date(ahora.getTime() - this.entorno.PREPARADA_VIGENCIA_DIAS * DIA);
    const vencidas = await this.comprobantes.preparadasAntesDe(limite);
    let canceladas = 0;
    for (const c of vencidas) {
      await this.transacciones.ejecutar(async (tx) => {
        // Si el Operador la recibió entre la lectura y ahora, ya no está PREPARADO y se deja
        const cambiadas = await this.comprobantes.cambiarSiEstado(tx, c.id, 'PREPARADO', {
          estado: 'CANCELADO',
          cerrado_en: ahora,
        });
        if (cambiadas === 0) return;
        canceladas++;
        await this.bitacora.registrar(tx, {
          usuarioId: null,
          accion: 'comprobante.vencido',
          entidad: 'comprobante',
          entidadId: c.id,
          ubicacionId: c.acopio_id,
          antes: { estado: 'PREPARADO' },
          despues: { estado: 'CANCELADO' },
        });
      });
    }
    if (canceladas) this.log.log(`${canceladas} donaciones preparadas vencieron`);
    return canceladas;
  }

  /** Cada día a las 03:30: la factura de un comprobante cerrado hace 12 meses se borra (C-02). */
  @Cron('30 3 * * *', { name: 'facturas-vencidas', timeZone: 'America/Bogota' })
  async borrarFacturasVencidas(ahora = new Date()): Promise<number> {
    const limite = new Date(ahora);
    limite.setUTCMonth(limite.getUTCMonth() - this.entorno.FACTURA_RETENCION_MESES);
    const vencidas = await this.comprobantes.conFacturaCerradosAntesDe(limite);
    let borradas = 0;
    for (const c of vencidas) {
      try {
        // Primero el almacén: si la base falla después, la próxima corrida lo intenta otra vez
        // y borrar en S3 una clave que ya no existe no es error
        for (const clave of [c.factura_key, c.miniatura_key])
          if (clave) await this.almacen.borrar(clave);
        await this.transacciones.ejecutar(async (tx) => {
          await this.comprobantes.quitarFactura(tx, c.id, ahora);
          await this.bitacora.registrar(tx, {
            usuarioId: null,
            accion: 'comprobante.factura_borrada',
            entidad: 'comprobante',
            entidadId: c.id,
            ubicacionId: c.acopio_id,
            antes: { factura: true },
            despues: { factura: false },
          });
        });
        borradas++;
      } catch (e) {
        this.log.error(`No se pudo borrar la factura del comprobante ${c.id}: ${String(e)}`);
      }
    }
    if (borradas) this.log.log(`${borradas} facturas borradas por retención`);
    return borradas;
  }
}
