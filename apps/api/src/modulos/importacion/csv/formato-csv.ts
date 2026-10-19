import type { z } from 'zod';
import type { UsuarioAutenticado } from '../../../comun/autorizacion/usuario-autenticado';
import type { ClienteBd } from '../../../comun/prisma/cliente-bd';

/** Un error de una fila: `numero` cuenta desde 1 sin la cabecera. */
export interface ErrorFila {
  numero: number;
  columna: string | null;
  mensaje: string;
}

export interface ColumnaCsv {
  nombre: string;
  obligatoria: boolean;
  descripcion: string;
  ejemplo: string;
}

export interface FilaCsv<F> {
  numero: number;
  datos: F;
}

/**
 * Cómo se carga un tipo de dato por CSV (pieza E). El esquema revisa cada celda; `revisar`
 * mira la base (que la entidad exista y esté verificada…); `aplicar` escribe con el servicio del
 * módulo dueño, en la transacción que recibe, con su bitácora.
 */
export interface FormatoCsv<F = unknown> {
  tipo: string;
  descripcion: string;
  columnas: ColumnaCsv[];
  esquema: z.ZodType<F>;
  revisar(filas: FilaCsv<F>[], tx: ClienteBd): Promise<ErrorFila[]>;
  aplicar(filas: F[], usuario: UsuarioAutenticado, tx: ClienteBd): Promise<void>;
}
