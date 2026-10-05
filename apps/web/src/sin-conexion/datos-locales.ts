import type { Categoria, CodigoBarras } from '../api/catalogo';
import type { Saldo } from '../api/inventario';
import type { NoRecibe } from '../api/red';
import { abrir, type SaldosGuardados } from './base-local';

export type { SaldosGuardados } from './base-local';

/**
 * Copia local para capturar entradas sin red (§6 de la especificación del Bloque 2, O-01).
 * Se guarda cada vez que C4 abre con red y se lee cuando no la hay.
 *
 * La copia es una ayuda: si el navegador no deja usar IndexedDB (navegación privada,
 * almacenamiento bloqueado), guardar no hace nada y leer vuelve vacío. Con red, nada cambia.
 */
async function seguro<T>(accion: () => Promise<T>, siFalla: T): Promise<T> {
  try {
    return await accion();
  } catch {
    return siFalla;
  }
}

export async function guardarCategorias(categorias: Categoria[]) {
  await seguro(async () => {
    await (await abrir()).put('categorias', categorias, 'vigentes');
  }, undefined);
}

export async function leerCategorias(): Promise<Categoria[]> {
  return seguro(async () => (await (await abrir()).get('categorias', 'vigentes')) ?? [], []);
}

export async function guardarNoRecibir(acopioId: string, lista: NoRecibe[]) {
  await seguro(async () => {
    await (await abrir()).put('noRecibir', lista, acopioId);
  }, undefined);
}

export async function leerNoRecibir(acopioId: string): Promise<NoRecibe[]> {
  return seguro(async () => (await (await abrir()).get('noRecibir', acopioId)) ?? [], []);
}

export async function guardarSaldos(acopioId: string, saldos: Saldo[], hora = new Date()) {
  const fila = { saldos, guardadoEn: hora.toISOString() };
  await seguro(async () => {
    await (await abrir()).put('saldos', fila, acopioId);
  }, undefined);
}

export async function leerSaldos(acopioId: string): Promise<SaldosGuardados | null> {
  return seguro(async () => (await (await abrir()).get('saldos', acopioId)) ?? null, null);
}

export async function guardarCodigoVisto(codigo: CodigoBarras) {
  await seguro(async () => {
    await (await abrir()).put('codigos', codigo, codigo.ean);
  }, undefined);
}

export async function buscarCodigoVisto(ean: string): Promise<CodigoBarras | null> {
  return seguro(async () => (await (await abrir()).get('codigos', ean)) ?? null, null);
}
