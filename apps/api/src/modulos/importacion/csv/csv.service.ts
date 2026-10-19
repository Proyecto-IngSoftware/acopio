import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import { ErrorDominio } from '../../../comun/errores/error-dominio';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';
import { Transacciones } from '../../../comun/prisma/transacciones';
import type { ErrorFila, FilaCsv, FormatoCsv } from './formato-csv';
import { leerCsv } from './leer-csv';
import { RegistroFormatos } from './registro-formatos';

export interface ReporteCsv {
  filas: {
    numero: number;
    valida: boolean;
    errores: { columna: string | null; mensaje: string }[];
  }[];
  validas: number;
  invalidas: number;
}

/** Revisar no escribe; aplicar escribe todas las filas en una transacción o ninguna. */
@Injectable()
export class CsvService {
  constructor(
    private readonly registro: RegistroFormatos,
    private readonly transacciones: Transacciones,
  ) {}

  revisar(tipo: string, contenido: Buffer): Promise<ReporteCsv> {
    const formato = this.registro.obtener(tipo);
    return this.transacciones.ejecutar(
      async (tx) => (await this.revisarCon(formato, contenido, tx)).reporte,
    );
  }

  aplicar(tipo: string, contenido: Buffer, usuario: UsuarioAutenticado): Promise<ReporteCsv> {
    const formato = this.registro.obtener(tipo);
    return this.transacciones.ejecutar(
      async (tx) => {
        const { reporte, validas } = await this.revisarCon(formato, contenido, tx);
        if (reporte.invalidas > 0) {
          throw new ErrorDominio(
            'CSV_INVALIDO',
            'Hay filas con errores; no se cargó ninguna',
            422,
            reporte,
          );
        }
        await formato.aplicar(validas, usuario, tx);
        return reporte;
      },
      { timeout: 60_000 },
    );
  }

  private async revisarCon(formato: FormatoCsv, contenido: Buffer, tx: ClienteBd) {
    const crudas = leerCsv(contenido);
    const errores: ErrorFila[] = [];
    const buenas: FilaCsv<unknown>[] = [];
    crudas.forEach((cruda, i) => {
      const r = formato.esquema.safeParse(cruda);
      if (r.success) buenas.push({ numero: i + 1, datos: r.data });
      else
        for (const issue of r.error.issues)
          errores.push({
            numero: i + 1,
            columna: String(issue.path[0] ?? '') || null,
            mensaje: issue.message,
          });
    });
    errores.push(...(await formato.revisar(buenas, tx)));
    const conError = new Set(errores.map((e) => e.numero));
    const reporte: ReporteCsv = {
      filas: crudas.map((_, i) => ({
        numero: i + 1,
        valida: !conError.has(i + 1),
        errores: errores
          .filter((e) => e.numero === i + 1)
          .map(({ columna, mensaje }) => ({ columna, mensaje })),
      })),
      validas: crudas.length - conError.size,
      invalidas: conError.size,
    };
    return { reporte, validas: buenas.filter((b) => !conError.has(b.numero)).map((b) => b.datos) };
  }
}
