import { useEffect } from 'react';
import { useCategoriasVigentes } from '../api/catalogo';
import { useSaldos } from '../api/inventario';
import { useNoRecibir } from '../api/red';
import { guardarCategorias, guardarNoRecibir, guardarSaldos } from './datos-locales';

/**
 * C4 con red: copia al teléfono lo que necesita para capturar sin conexión. Usa las mismas
 * consultas que la pantalla, así que no pide nada de más.
 */
export function useCopiaLocal(acopioId: string) {
  const { data: saldos } = useSaldos(acopioId);
  const { data: noRecibir } = useNoRecibir(acopioId);
  const { data: categorias } = useCategoriasVigentes();

  useEffect(() => {
    if (saldos) void guardarSaldos(acopioId, saldos);
  }, [acopioId, saldos]);
  useEffect(() => {
    if (noRecibir) void guardarNoRecibir(acopioId, noRecibir);
  }, [acopioId, noRecibir]);
  useEffect(() => {
    if (categorias) void guardarCategorias(categorias);
  }, [categorias]);
}
