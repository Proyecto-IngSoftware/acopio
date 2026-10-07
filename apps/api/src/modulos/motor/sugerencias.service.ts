import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BLOQUEO_DESCARTE_HORAS, clavePar, emparejar, type EntradaMotor } from '@acopio/shared';
import type { ClienteBd } from '../../comun/prisma/cliente-bd';
import { PrismaService } from '../../comun/prisma/prisma.service';
import type { EstadoSugerencia } from '../../generado/prisma/enums';
import { bloquearMotor, leerConfiguracion } from './configuracion';
import { EstadoMotorService, type ZonaCargada } from './estado-motor.service';
import { INCLUIR_SUGERENCIA, aSugerenciaVista } from './vistas';

const HORA = 3_600_000;

/** C11 Motor de sugerencias (RF-MOT-005 a 007). */
@Injectable()
export class SugerenciasService {
  private readonly log = new Logger(SugerenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estado: EstadoMotorService,
  ) {}

  /** Todo lo que el emparejamiento necesita, leído con el cliente de quien llama. */
  async cargarEntrada(
    cliente: ClienteBd,
    ahora: Date,
  ): Promise<{ entrada: EntradaMotor; zonas: ZonaCargada[] }> {
    const zonas = await this.estado.zonas(cliente, {});
    const acopios = await this.estado.acopios(cliente, {});
    const demandas = await this.estado.demandas(cliente, ahora, zonas);
    const ofertas = await this.estado.ofertas(cliente, ahora, acopios);
    const categorias = await this.estado.categorias(
      cliente,
      demandas.map((d) => d.categoriaId),
    );
    const descartadas = await cliente.sugerencia.findMany({
      where: {
        estado: 'DESCARTADA',
        decidida_en: { gt: new Date(ahora.getTime() - BLOQUEO_DESCARTE_HORAS * HORA) },
      },
      select: { acopio_id: true, zona_id: true, categoria_id: true },
    });
    const bloqueados = new Set(
      descartadas.map((d) => clavePar(d.acopio_id, d.zona_id, d.categoria_id)),
    );
    return { entrada: { zonas, acopios, categorias, demandas, ofertas, bloqueados }, zonas };
  }

  /** Cada 15 minutos y bajo demanda: borra las PROPUESTA y guarda la ronda nueva (M-04). */
  @Cron('*/15 * * * *', { name: 'motor-recalculo', timeZone: 'America/Bogota' })
  async recalcular(ahora = new Date()): Promise<{ ronda: Date; generadas: number }> {
    const r = await this.prisma.$transaction(
      async (tx) => {
        await bloquearMotor(tx);
        const { pesos, cantidadMinima } = await leerConfiguracion(tx);
        const { entrada, zonas } = await this.cargarEntrada(tx, ahora);
        const calculadas = emparejar(entrada, pesos, cantidadMinima);
        const emergencia = new Map(zonas.map((z) => [z.id, z.emergenciaId]));
        await tx.sugerencia.deleteMany({ where: { estado: 'PROPUESTA' } });
        await tx.sugerencia.createMany({
          data: calculadas.map((s) => ({
            ronda: ahora,
            emergencia_id: emergencia.get(s.zonaId)!,
            acopio_id: s.acopioId,
            zona_id: s.zonaId,
            categoria_id: s.categoriaId,
            cantidad: s.cantidad,
            puntaje: s.puntaje,
            desglose: { ...s.desglose },
            justificacion: s.justificacion,
          })),
        });
        return { ronda: ahora, generadas: calculadas.length };
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
    this.log.log(`Motor: ${r.generadas} sugerencias`);
    return r;
  }

  async listar(filtro: {
    zonaId?: string;
    acopioId?: string;
    categoriaId?: string;
    estado?: EstadoSugerencia;
  }) {
    const filas = await this.prisma.sugerencia.findMany({
      where: {
        zona_id: filtro.zonaId,
        acopio_id: filtro.acopioId,
        categoria_id: filtro.categoriaId,
        estado: filtro.estado ?? 'PROPUESTA',
      },
      include: INCLUIR_SUGERENCIA,
      orderBy: [{ puntaje: 'desc' }, { cantidad: 'desc' }, { zona: { nombre: 'asc' } }],
      take: 200,
    });
    return filas.map(aSugerenciaVista);
  }
}
