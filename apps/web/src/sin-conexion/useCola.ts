import { useQuery } from '@tanstack/react-query';
import { listarCola } from './cola';

/**
 * La cola de quien tiene la sesión. Corre sin red: es IndexedDB, no la API. Quien la
 * cambia invalida `['cola']` (C4 al guardar, el Sincronizador al terminar un envío).
 */
export function useCola(usuarioId: string | undefined) {
  return useQuery({
    queryKey: ['cola', usuarioId],
    queryFn: () => listarCola(usuarioId!),
    enabled: !!usuarioId,
    networkMode: 'always',
  });
}
