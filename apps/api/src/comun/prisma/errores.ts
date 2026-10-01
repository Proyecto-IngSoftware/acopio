/** Violación de llave única, venga como error de Prisma (P2002) o del driver (23505). */
export function esLlaveDuplicada(e: unknown): boolean {
  const x = e as { code?: string; cause?: { code?: string }; message?: string };
  return (
    x?.code === 'P2002' ||
    x?.cause?.code === '23505' ||
    /23505|Unique constraint/.test(x?.message ?? '')
  );
}
