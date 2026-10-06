import { agregarLinea, cantidadBase, estadoInicial, reducir, type Linea } from './preparacion';

const AGUA = { id: 'c1', nombre: 'Agua potable', unidadBase: 'LITRO' as const, perecedero: false };
const ARROZ = { id: 'c2', nombre: 'Arroz', unidadBase: 'KILOGRAMO' as const, perecedero: true };
const EAN = '7702001045231';

const con = (...acciones: Parameters<typeof reducir>[1][]) =>
  acciones.reduce(reducir, estadoInicial);

describe('preparación de la donación', () => {
  it('empieza en el paso 1, sin líneas, sin acopio y sin factura', () => {
    expect(estadoInicial).toEqual({ paso: 1, lineas: [], acopioId: null, factura: null });
  });

  it('agrega una categoría en unidad base con cantidad 1', () => {
    const e = con({ tipo: 'agregar', categoria: ARROZ });
    expect(e.lineas).toHaveLength(1);
    expect(e.lineas[0]).toMatchObject({
      categoriaId: 'c2',
      nombre: 'Arroz',
      unidad: 'KILOGRAMO',
      perecedero: true,
      ean: null,
      contenido: null,
      cantidad: 1,
      venceEn: '',
    });
  });

  it('un código conocido agrega la línea con ean y contenido', () => {
    const e = con({ tipo: 'agregar', categoria: AGUA, leido: { ean: EAN, contenido: 0.6 } });
    expect(e.lineas[0]).toMatchObject({ ean: EAN, contenido: 0.6, cantidad: 1 });
  });

  it('el mismo ean suma 1 a la línea que ya existe', () => {
    const leido = { ean: EAN, contenido: 0.6 };
    const e = con(
      { tipo: 'agregar', categoria: AGUA, leido },
      { tipo: 'agregar', categoria: AGUA, leido },
    );
    expect(e.lineas).toHaveLength(1);
    expect(e.lineas[0]!.cantidad).toBe(2);
  });

  it('otro ean de la misma categoría es otra línea', () => {
    const e = con(
      { tipo: 'agregar', categoria: AGUA, leido: { ean: EAN, contenido: 0.6 } },
      { tipo: 'agregar', categoria: AGUA, leido: { ean: '7702001000001', contenido: 1.5 } },
    );
    expect(e.lineas).toHaveLength(2);
  });

  it('elegir otra vez por nombre una categoría sin código suma a su línea', () => {
    const e = con({ tipo: 'agregar', categoria: ARROZ }, { tipo: 'agregar', categoria: ARROZ });
    expect(e.lineas).toHaveLength(1);
    expect(e.lineas[0]!.cantidad).toBe(2);
  });

  it('quita una línea', () => {
    const uno = con({ tipo: 'agregar', categoria: ARROZ }, { tipo: 'agregar', categoria: AGUA });
    const e = reducir(uno, { tipo: 'quitar', id: uno.lineas[0]!.id });
    expect(e.lineas.map((l) => l.categoriaId)).toEqual(['c1']);
  });

  it('la cantidad no baja de 1 ni deja decimales cuando hay presentaciones', () => {
    const base = con({ tipo: 'agregar', categoria: AGUA, leido: { ean: EAN, contenido: 0.6 } });
    const id = base.lineas[0]!.id;
    expect(reducir(base, { tipo: 'cantidad', id, cantidad: 0 }).lineas[0]!.cantidad).toBe(1);
    expect(reducir(base, { tipo: 'cantidad', id, cantidad: 3.7 }).lineas[0]!.cantidad).toBe(3);
    expect(reducir(base, { tipo: 'cantidad', id, cantidad: 12 }).lineas[0]!.cantidad).toBe(12);
  });

  it('en unidades la cantidad también es entera', () => {
    const e = con({
      tipo: 'agregar',
      categoria: { id: 'c3', nombre: 'Pañales', unidadBase: 'UNIDAD', perecedero: false },
    });
    expect(
      reducir(e, { tipo: 'cantidad', id: e.lineas[0]!.id, cantidad: 2.5 }).lineas[0]!.cantidad,
    ).toBe(2);
  });

  it('guarda el vencimiento de la línea', () => {
    const e = con({ tipo: 'agregar', categoria: ARROZ });
    const r = reducir(e, { tipo: 'vence', id: e.lineas[0]!.id, venceEn: '2026-11-20' });
    expect(r.lineas[0]!.venceEn).toBe('2026-11-20');
  });

  it('la cantidad en unidad base multiplica por el contenido sin ruido decimal', () => {
    const l = (cantidad: number, contenido: number | null) => ({ cantidad, contenido }) as Linea;
    expect(cantidadBase(l(12, 0.6))).toBe(7.2);
    expect(cantidadBase(l(3, 0.1))).toBe(0.3);
    expect(cantidadBase(l(3, null))).toBe(3);
  });

  it('agregarLinea no repite el id entre líneas', () => {
    const e = agregarLinea(agregarLinea(estadoInicial, ARROZ), AGUA);
    expect(new Set(e.lineas.map((l) => l.id)).size).toBe(2);
  });

  it('guarda el paso, el acopio y la factura para los pasos siguientes', () => {
    const f = new File(['x'], 'factura.jpg', { type: 'image/jpeg' });
    const e = con(
      { tipo: 'agregar', categoria: ARROZ },
      { tipo: 'paso', paso: 2 },
      { tipo: 'acopio', acopioId: 'a1' },
      { tipo: 'factura', factura: f },
    );
    expect(e).toMatchObject({ paso: 2, acopioId: 'a1', factura: f });
  });
});
