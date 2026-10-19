import { Inject, Injectable } from '@nestjs/common';
import { HORARIO_VACIO } from '@acopio/shared';
import { ErrorDominio } from '../../comun/errores/error-dominio';
import { Transacciones } from '../../comun/prisma/transacciones';
import type { Prisma } from '../../generado/prisma/client';
import type { EstadoAcopio } from '../../generado/prisma/enums';
import { AcopioDao } from '../acopios/dao/acopio.dao';
import { RELOJ, type Reloj } from '../acopios/geocodificacion';
import { BitacoraService } from '../auditoria/bitacora.service';
import { EjecucionDao } from './dao/ejecucion.dao';
import { PlataformaDao } from './dao/plataforma.dao';
import type { FuenteAcopios } from './fuentes/fuente-acopios';
import type { PuntoFuente } from './fuentes/tipos';

export interface ResultadoImportacion {
  resultado: 'OK' | 'ABORTADA';
  creados: number;
  actualizados: number;
  cerrados: number;
  motivo: string | null;
}

/** El mismo rango que el CHECK `acopio_coordenadas_colombia` de la base. */
export const enColombia = (p: { lat: number; lng: number }) =>
  p.lat >= -5 && p.lat <= 14 && p.lng >= -82 && p.lng <= -66;

/** RF-RED-011: abierto → ACTIVO, lleno → PAUSADO, cerrado → CERRADO, lo demás → PAUSADO. */
export function estadoDe(estadoFuente: string): EstadoAcopio {
  if (estadoFuente === 'abierto') return 'ACTIVO';
  if (estadoFuente === 'cerrado') return 'CERRADO';
  return 'PAUSADO';
}

/**
 * Trae los puntos de una fuente externa como acopios referenciados (pieza E). Reimportar
 * actualiza y nunca duplica; un punto que desaparece se cierra; si la fuente cambió de formato,
 * no se escribe nada y la ejecución queda abortada.
 */
@Injectable()
export class ImportadorReferenciadosService {
  constructor(
    private readonly acopios: AcopioDao,
    private readonly plataformas: PlataformaDao,
    private readonly ejecuciones: EjecucionDao,
    private readonly transacciones: Transacciones,
    private readonly bitacora: BitacoraService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async ejecutar(fuente: FuenteAcopios, usuarioId: string | null): Promise<ResultadoImportacion> {
    const inicio = new Date(this.reloj.ahora());
    const base = { fuente: fuente.nombre, origen: fuente.origen, inicio };
    try {
      const lectura = await fuente.leer();
      exigirCoherente(lectura.puntos);
      const verificados = lectura.puntos.filter((p) => p.verificado);
      // Sin coordenadas en Colombia (la fuente trae algunos en 0, 0) no hay dónde ponerlos en el mapa
      const ubicados = verificados.filter(enColombia);
      const omitidos = verificados.length - ubicados.length;
      const conteo = await this.transacciones.ejecutar(async (tx) => {
        const c = await this.aplicar(fuente, ubicados, tx);
        await this.plataformas.reemplazarDeFuente(fuente.nombre, lectura.plataformas, tx);
        const fin = new Date(this.reloj.ahora());
        await this.ejecuciones.registrar({ ...base, fin, resultado: 'OK', ...c }, tx);
        await this.bitacora.registrar(tx, {
          usuarioId,
          accion: 'importacion.ejecutada',
          entidad: 'importacion',
          entidadId: fuente.nombre,
          despues: {
            origen: fuente.origen,
            ...c,
            omitidos,
            plataformas: lectura.plataformas.length,
          },
        });
        return c;
      });
      return { resultado: 'OK', ...conteo, motivo: null };
    } catch (e) {
      // Toda lectura queda registrada, también la que falló por algo distinto del formato
      const motivo = e instanceof Error ? e.message : String(e);
      const fin = new Date(this.reloj.ahora());
      await this.ejecuciones.registrar({ ...base, fin, resultado: 'ABORTADA', motivo });
      if (!(e instanceof ErrorDominio) || e.codigo !== 'FORMATO_FUENTE') throw e;
      return { resultado: 'ABORTADA', creados: 0, actualizados: 0, cerrados: 0, motivo };
    }
  }

  private async aplicar(
    origen: FuenteAcopios,
    puntos: PuntoFuente[],
    tx: Prisma.TransactionClient,
  ) {
    const fuente = origen.nombre;
    const existentes = new Map(
      (await this.acopios.referenciadosDe(fuente, tx)).map((f) => [f.fuente_id, f]),
    );
    let creados = 0;
    let actualizados = 0;
    for (const p of puntos) {
      const datos = {
        nombre: p.nombre,
        direccion: p.direccion,
        municipio: origen.municipio,
        lat: p.lat,
        lng: p.lng,
        estado: estadoDe(p.estado),
        fuente_estado: p.estado,
        fuente_horario: p.horario,
        fuente_necesidades: p.necesidades as unknown as Prisma.InputJsonValue,
        fuente_contacto: p.contacto as unknown as Prisma.InputJsonValue,
        fuente_url: origen.url,
        fuente_actualizado_en: p.actualizadoEn,
      };
      const previo = existentes.get(p.fuenteId);
      if (!previo) {
        await this.acopios.crearReferenciado(
          {
            ...datos,
            fuente,
            fuente_id: p.fuenteId,
            horario: HORARIO_VACIO as unknown as Prisma.InputJsonValue,
          },
          tx,
        );
        creados++;
      } else if (cambio(datos, previo)) {
        // oculto_por_admin no se toca: lo decide el Administrador, no la fuente
        await this.acopios.actualizarReferenciado(previo.id, datos, tx);
        actualizados++;
      }
    }
    const cerrados = await this.acopios.cerrarReferenciados(
      fuente,
      puntos.map((p) => p.fuenteId),
      tx,
    );
    return { creados, actualizados, cerrados };
  }
}

/**
 * Lo que se copia de la fuente, sin las coordenadas, en un texto comparable. El JSON va con sus
 * llaves ordenadas, porque `jsonb` las reordena al guardar.
 */
function huella(f: {
  nombre: string;
  direccion: string;
  estado: string;
  fuente_estado: string | null;
  fuente_horario: string | null;
  fuente_necesidades: unknown;
  fuente_contacto: unknown;
  fuente_actualizado_en: Date | null;
}): string {
  return canonico([
    f.nombre,
    f.direccion,
    f.estado,
    f.fuente_estado,
    f.fuente_horario,
    f.fuente_necesidades ?? null,
    f.fuente_contacto ?? null,
    f.fuente_actualizado_en ? new Date(f.fuente_actualizado_en).toISOString() : null,
  ]);
}

/** Lo que el lector no ve punto por punto: ids repetidos y fechas que no son fechas. */
function exigirCoherente(puntos: PuntoFuente[]) {
  const vistos = new Set<string>();
  for (const p of puntos) {
    if (vistos.has(p.fuenteId))
      throw new ErrorDominio(
        'FORMATO_FUENTE',
        `La fuente trae dos puntos con el id «${p.fuenteId}»`,
        502,
      );
    vistos.add(p.fuenteId);
    if (p.actualizadoEn && Number.isNaN(p.actualizadoEn.getTime()))
      throw new ErrorDominio(
        'FORMATO_FUENTE',
        `El punto «${p.fuenteId}» trae una fecha de actualización que no es fecha`,
        502,
      );
  }
}

/**
 * Si el punto cambió en la fuente. Las coordenadas se comparan con tolerancia: la columna guarda
 * 6 decimales y PostgreSQL no redondea igual que JavaScript (-74.1352285 → -74.135229).
 */
function cambio(
  datos: Parameters<typeof huella>[0] & { lat: number; lng: number },
  previo: Parameters<typeof huella>[0] & { lat: unknown; lng: unknown },
): boolean {
  const lejos = (x: number, y: unknown) => Math.abs(x - Number(y)) >= 1e-6;
  return (
    huella(datos) !== huella(previo) || lejos(datos.lat, previo.lat) || lejos(datos.lng, previo.lng)
  );
}

/** JSON con las llaves de cada objeto en orden alfabético. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object' && !(v instanceof Date))
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonico((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}
