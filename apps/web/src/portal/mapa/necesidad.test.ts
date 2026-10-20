import { describe, expect, it } from 'vitest';
import type { AcopioPublico } from '../../api/red';
import type { NecesidadAcopio } from '../../api/inventario';
import {
  contarEstados,
  estadoDeCategoria,
  etiquetaAcopio,
  fraseCategoria,
  tieneEstado,
} from './necesidad';

const c = (categoria: string) => ({ categoriaId: `id-${categoria}`, categoria });
const acopio = (id: string, extra: Partial<AcopioPublico> = {}) =>
  ({ id, estado: 'ACTIVO', tipo: 'OPERADO', ...extra }) as AcopioPublico;
const necesidad = (acopioId: string, p: Partial<NecesidadAcopio> = {}): NecesidadAcopio => ({
  acopioId,
  faltan: [],
  sobran: [],
  alDia: [],
  noRecibe: [],
  ...p,
});
const completa = necesidad('a1', {
  faltan: [c('Agua potable'), c('Arroz'), c('Pañales')],
  sobran: [c('Ropa')],
  alDia: [c('Aceite')],
  noRecibe: [c('Colchones')],
});
const cat = (nombre: string) => ({ id: `id-${nombre}`, nombre });

describe('etiquetaAcopio', () => {
  it('sin opciones, la primera alfabética de la lista más urgente', () => {
    expect(etiquetaAcopio(acopio('a1'), completa, {})).toEqual({
      estado: 'falta',
      texto: 'FALTA: Agua potable +2',
    });
  });
  it('con estado fuerza esa etiqueta', () => {
    expect(etiquetaAcopio(acopio('a1'), completa, { estado: 'sobra' })).toEqual({
      estado: 'sobra',
      texto: 'DE SOBRA: Ropa',
    });
    expect(etiquetaAcopio(acopio('a1'), completa, { estado: 'norecibe' })).toEqual({
      estado: 'norecibe',
      texto: 'NO RECIBE: Colchones',
    });
  });
  it('con estado que el acopio no tiene, null', () => {
    const n = necesidad('a1', { alDia: [c('Aceite')] });
    expect(etiquetaAcopio(acopio('a1'), n, { estado: 'falta' })).toBeNull();
  });
  it('solo al día', () => {
    const n = necesidad('a1', { alDia: [c('Aceite')] });
    expect(etiquetaAcopio(acopio('a1'), n, {})).toEqual({ estado: 'aldia', texto: 'AL DÍA' });
  });
  it('con categoría', () => {
    const e = (n: string) => etiquetaAcopio(acopio('a1'), completa, { categoria: cat(n) });
    expect(e('Arroz')).toEqual({ estado: 'falta', texto: 'FALTA ARROZ' });
    expect(e('Ropa')?.texto).toBe('ROPA DE SOBRA');
    expect(e('Aceite')?.texto).toBe('ACEITE AL DÍA');
    expect(e('Colchones')).toEqual({ estado: 'norecibe', texto: 'NO RECIBE COLCHONES' });
    expect(e('Otra')).toBeNull();
  });
  it('no recibe gana sobre las demás listas con categoría', () => {
    const n = necesidad('a1', { faltan: [c('Arroz')], noRecibe: [c('Arroz')] });
    expect(estadoDeCategoria(n, 'id-Arroz')).toBe('norecibe');
  });
  it('acopios no operativos o sin necesidad, null', () => {
    expect(etiquetaAcopio(acopio('a1', { estado: 'PAUSADO' }), completa, {})).toBeNull();
    expect(etiquetaAcopio(acopio('a1', { estado: 'CERRADO' }), completa, {})).toBeNull();
    expect(etiquetaAcopio(acopio('a1', { tipo: 'REFERENCIADO' }), completa, {})).toBeNull();
    expect(etiquetaAcopio(acopio('a1'), undefined, {})).toBeNull();
  });
});

describe('tieneEstado', () => {
  it('revisa la lista del estado', () => {
    expect(tieneEstado(completa, 'sobra')).toBe(true);
    expect(tieneEstado(necesidad('x'), 'falta')).toBe(false);
    expect(tieneEstado(undefined, 'falta')).toBe(false);
  });
});

describe('contarEstados', () => {
  const acopios = [acopio('a1'), acopio('a2', { estado: 'PAUSADO' }), acopio('a3')];
  const porId = new Map<string, NecesidadAcopio>([
    ['a1', completa],
    ['a2', necesidad('a2', { faltan: [c('Arroz')] })],
    ['a3', necesidad('a3', { alDia: [c('Aceite')] })],
  ]);
  it('sin categoría', () => {
    expect(contarEstados(acopios, porId)).toEqual({
      todos: 2,
      falta: 1,
      sobra: 1,
      norecibe: 1,
      aldia: 1,
    });
  });
  it('con categoría cada acopio cuenta una vez', () => {
    expect(contarEstados(acopios, porId, 'id-Arroz')).toEqual({
      todos: 2,
      falta: 1,
      sobra: 0,
      norecibe: 0,
      aldia: 0,
    });
    expect(contarEstados(acopios, porId, 'id-Aceite')).toEqual({
      todos: 2,
      falta: 0,
      sobra: 0,
      norecibe: 0,
      aldia: 2,
    });
  });
});

describe('fraseCategoria', () => {
  it('une las partes', () => {
    expect(fraseCategoria('Arroz', { falta: 2, aldia: 2, sobra: 1, norecibe: 0 })).toBe(
      'Arroz: falta en 2 acopios, está al día en 2 y sobra en 1.',
    );
  });
  it('singular', () => {
    expect(fraseCategoria('Arroz', { falta: 1, aldia: 0, sobra: 0, norecibe: 0 })).toBe(
      'Arroz: falta en 1 acopio.',
    );
  });
  it('todo en cero', () => {
    expect(fraseCategoria('Arroz', { falta: 0, aldia: 0, sobra: 0, norecibe: 0 })).toBe(
      'Ningún acopio tiene umbral para arroz.',
    );
  });
});
