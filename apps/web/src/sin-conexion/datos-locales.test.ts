import { describe, expect, it } from 'vitest';
import type { Categoria, CodigoBarras } from '../api/catalogo';
import type { Saldo } from '../api/inventario';
import type { NoRecibe } from '../api/red';
import {
  buscarCodigoVisto,
  guardarCategorias,
  guardarCodigoVisto,
  guardarNoRecibir,
  guardarSaldos,
  leerCategorias,
  leerNoRecibir,
  leerSaldos,
} from './datos-locales';

const A = 'acopio-a';
const B = 'acopio-b';
const categoria = (id: string, nombre: string, unidadBase: Categoria['unidadBase']): Categoria => ({
  id,
  nombre,
  grupo: 'ALIMENTOS',
  unidadBase,
  perecedero: false,
  sinonimos: [],
  archivada: false,
});
const arroz = categoria('c-arroz', 'Arroz', 'KILOGRAMO');
const agua = categoria('c-agua', 'Agua potable', 'LITRO');

describe('copia local para capturar sin red', () => {
  it('sin nada guardado, las lecturas vuelven vacías', async () => {
    expect(await leerCategorias()).toEqual([]);
    expect(await leerNoRecibir(A)).toEqual([]);
    expect(await leerSaldos(A)).toBeNull();
    expect(await buscarCodigoVisto('7702001234567')).toBeNull();
  });

  it('guarda las categorías vigentes y las reemplaza completas en la siguiente copia', async () => {
    await guardarCategorias([arroz, agua]);
    expect(await leerCategorias()).toEqual([arroz, agua]);

    await guardarCategorias([agua]);
    expect(await leerCategorias()).toEqual([agua]);
  });

  it('guarda «no recibir» por acopio, sin mezclar uno con otro', async () => {
    const enA = [{ categoriaId: 'c-ropa' }] as NoRecibe[];
    await guardarNoRecibir(A, enA);
    await guardarNoRecibir(B, []);

    expect(await leerNoRecibir(A)).toEqual(enA);
    expect(await leerNoRecibir(B)).toEqual([]);
  });

  it('guarda los últimos saldos de un acopio con la hora en que se copiaron', async () => {
    const saldos = [{ categoriaId: 'c-arroz', cantidad: 60 }] as Saldo[];
    const hora = new Date('2026-10-05T09:58:00Z');

    await guardarSaldos(A, saldos, hora);

    expect(await leerSaldos(A)).toEqual({ saldos, guardadoEn: hora.toISOString() });
    expect(await leerSaldos(B)).toBeNull();
  });

  it('recuerda un código de barras visto y lo encuentra por su EAN', async () => {
    const codigo = {
      ean: '7702001234567',
      categoriaId: 'c-arroz',
      categoria: 'Arroz',
      contenido: 0.5,
    } as unknown as CodigoBarras;

    await guardarCodigoVisto(codigo);

    expect(await buscarCodigoVisto('7702001234567')).toEqual(codigo);
    expect(await buscarCodigoVisto('0000000000000')).toBeNull();
  });
});
