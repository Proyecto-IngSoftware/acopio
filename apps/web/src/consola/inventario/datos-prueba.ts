import type { Saldo } from '../../api/inventario';
import { acopioDePrueba } from '../../pruebas/datos-red';

export const ACOPIO = acopioDePrueba({ id: 'x1', nombre: 'Coliseo El Salitre' });

const horasAtras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const saldo = (datos: Partial<Saldo>): Saldo => ({
  categoriaId: 'c0',
  categoria: 'Categoría',
  grupo: 'ALIMENTOS',
  unidad: 'UNIDAD',
  perecedero: false,
  cantidad: 10,
  umbral: null,
  semaforo: 'SIN_UMBRAL',
  ultimoMovimiento: horasAtras(1),
  vencimientos: [],
  ...datos,
});

export const SALDOS: Saldo[] = [
  saldo({
    categoriaId: 'c3',
    categoria: 'Pañal adulto',
    cantidad: 312,
    umbral: { minimo: 100, maximo: 400 },
    semaforo: 'EN_RANGO',
    ultimoMovimiento: horasAtras(24),
  }),
  saldo({
    categoriaId: 'c2',
    categoria: 'Arroz',
    unidad: 'KILOGRAMO',
    perecedero: true,
    cantidad: 120,
    umbral: { minimo: 100, maximo: 400 },
    semaforo: 'CERCA',
    ultimoMovimiento: horasAtras(0.3),
    vencimientos: [
      { venceEn: '2026-10-12', cantidad: 40 },
      { venceEn: '2026-10-30', cantidad: 80 },
    ],
  }),
  saldo({
    categoriaId: 'c5',
    categoria: 'Jabón de baño',
    cantidad: 25,
    ultimoMovimiento: horasAtras(120),
  }),
  saldo({
    categoriaId: 'c1',
    categoria: 'Agua potable',
    unidad: 'LITRO',
    cantidad: 40,
    umbral: { minimo: 100, maximo: 500 },
    semaforo: 'BAJO',
    ultimoMovimiento: horasAtras(2),
  }),
  saldo({
    categoriaId: 'c4',
    categoria: 'Ropa de abrigo',
    cantidad: 860,
    umbral: { minimo: 10, maximo: 500 },
    semaforo: 'SOBRE',
    ultimoMovimiento: horasAtras(72),
  }),
];
