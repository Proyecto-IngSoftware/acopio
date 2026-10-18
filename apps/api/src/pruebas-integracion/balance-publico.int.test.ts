import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

interface Fila {
  categoriaId: string;
  categoria: string;
  acopios: number;
}

/** P1, «Balance de recepción» de la portada (P-073): qué hace falta y qué no traer. */
describe('balance público', () => {
  let a: AppPrueba;
  let adminId: string;
  let falta: string;
  let sobra: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
    // Categorías propias: la base es compartida y otras suites ponen umbrales en estos acopios.
    // El «0» al inicio las deja primero entre las que tienen los mismos acopios (la lista corta en seis)
    const nueva = (nombre: string) =>
      a.prisma.categoria.create({
        data: { nombre: unico(`0 ${nombre} `), grupo: 'ALIMENTOS', unidad_base: 'UNIDAD' },
      });
    falta = (await nueva('Falta')).id;
    sobra = (await nueva('Sobra')).id;
    // Sin movimientos el saldo es 0: por debajo del mínimo en los dos acopios
    for (const acopio of [ACOPIO_A, ACOPIO_B]) {
      await a.prisma.umbral.create({
        data: {
          acopio_id: acopio,
          categoria_id: falta,
          minimo: 5,
          maximo: 20,
          actualizado_por: adminId,
        },
      });
      await a.prisma.noRecibir.create({
        data: { acopio_id: acopio, categoria_id: sobra, marcado_por: adminId },
      });
    }
  });
  afterAll(() => a.cerrar());

  const balance = async () =>
    (await a.http().get('/api/publico/balance').expect(200)).body as {
      faltan: Fila[];
      noTraigan: Fila[];
    };

  it('sin sesión dice qué falta y qué no traer, con cuántos acopios', async () => {
    const b = await balance();
    expect(b.faltan.find((f) => f.categoriaId === falta)).toMatchObject({ acopios: 2 });
    expect(b.noTraigan.find((f) => f.categoriaId === sobra)).toMatchObject({ acopios: 2 });
    expect(b.faltan.find((f) => f.categoriaId === sobra)).toBeUndefined();
  });

  it('un acopio cerrado no cuenta', async () => {
    await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'CERRADO' } });
    try {
      const b = await balance();
      expect(b.faltan.find((f) => f.categoriaId === falta)).toMatchObject({ acopios: 1 });
      expect(b.noTraigan.find((f) => f.categoriaId === sobra)).toMatchObject({ acopios: 1 });
    } finally {
      await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'ACTIVO' } });
    }
  });

  it('una marca de «no recibir» que ya venció no cuenta', async () => {
    await a.prisma.noRecibir.update({
      where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: sobra } },
      data: { hasta: new Date('2000-01-01') },
    });
    const b = await balance();
    expect(b.noTraigan.find((f) => f.categoriaId === sobra)).toMatchObject({ acopios: 1 });
  });
});
