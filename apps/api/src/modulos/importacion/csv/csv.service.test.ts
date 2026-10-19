import { ErrorDominio } from '../../../comun/errores/error-dominio';
import type { Transacciones } from '../../../comun/prisma/transacciones';
import { CsvService } from './csv.service';
import type { FormatoCsv } from './formato-csv';
import type { RegistroFormatos } from './registro-formatos';
import { z } from 'zod';

describe('CsvService.aplicar', () => {
  it('un error de dominio al escribir sale como 422 CSV_INVALIDO con su mensaje', async () => {
    const formato: FormatoCsv<{ nombre: string }> = {
      tipo: 'prueba',
      descripcion: '',
      columnas: [],
      esquema: z.object({ nombre: z.string() }),
      revisar: async () => [],
      aplicar: async () => {
        throw new ErrorDominio('ACOPIO_CERRADO', 'El acopio está cerrado', 409);
      },
    };
    const registro = { obtener: () => formato } as unknown as RegistroFormatos;
    const transacciones = {
      ejecutar: (fn: (tx: unknown) => unknown) => fn({}),
    } as unknown as Transacciones;
    const servicio = new CsvService(registro, transacciones);
    await expect(
      servicio.aplicar('prueba', Buffer.from('nombre\nuno\n'), { id: 'u' } as never),
    ).rejects.toMatchObject({
      codigo: 'CSV_INVALIDO',
      estado: 422,
      message: expect.stringContaining('El acopio está cerrado'),
    });
  });
});
