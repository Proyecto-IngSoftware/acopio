import { Prisma } from '../../generado/prisma/client';

/**
 * Si el error es una llave única violada, devuelve el nombre de la restricción
 * (por ejemplo «usuario_username_key»). Con el adaptador de PostgreSQL, Prisma 7 la
 * trae en meta.driverAdapterError, no en meta.target.
 */
export function restriccionUnicaViolada(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: { cause?: { constraint?: { index?: string } } } }
    | undefined;
  return (
    meta?.driverAdapterError?.cause?.constraint?.index ??
    (Array.isArray(meta?.target) ? meta.target.join('_') : String(meta?.target ?? 'desconocida'))
  );
}
