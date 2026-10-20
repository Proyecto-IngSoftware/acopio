import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

interface Cat {
  categoriaId: string;
  categoria: string;
}
interface Fila {
  acopioId: string;
  faltan: Cat[];
  sobran: Cat[];
  alDia: Cat[];
  noRecibe: Cat[];
}

/** Mapa de necesidades: qué falta, sobra, está al día o no recibe cada acopio, solo por categoría. */
describe('necesidades públicas', () => {
  let a: AppPrueba;
  let adminId: string;
  const ids: Record<'falta' | 'sobra' | 'rango' | 'cerca' | 'noRecibe', string> = {
    falta: '',
    sobra: '',
    rango: '',
    cerca: '',
    noRecibe: '',
  };

  beforeAll(async () => {
    a = await crearAppPrueba();
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
    const nueva = async (nombre: string) =>
      (
        await a.prisma.categoria.create({
          data: { nombre: unico(`${nombre} `), grupo: 'ALIMENTOS', unidad_base: 'UNIDAD' },
        })
      ).id;
    ids.falta = await nueva('Falta');
    ids.sobra = await nueva('Sobra');
    ids.rango = await nueva('Rango');
    ids.cerca = await nueva('Cerca');
    ids.noRecibe = await nueva('NoRecibe');
    const umbral = (categoria_id: string, minimo: number, maximo: number) =>
      a.prisma.umbral.create({
        data: { acopio_id: ACOPIO_A, categoria_id, minimo, maximo, actualizado_por: adminId },
      });
    const entrada = (categoria_id: string, cantidad: number) =>
      a.prisma.movimiento.create({
        data: {
          acopio_id: ACOPIO_A,
          categoria_id,
          tipo: 'ENTRADA',
          signo: 1,
          cantidad,
          usuario_id: adminId,
          ocurrido_en: new Date(),
        },
      });
    await umbral(ids.falta, 5, 20);
    await umbral(ids.sobra, 1, 2);
    await entrada(ids.sobra, 5);
    await umbral(ids.rango, 1, 10);
    await entrada(ids.rango, 5);
    await umbral(ids.cerca, 4, 10);
    await entrada(ids.cerca, 4);
    await a.prisma.noRecibir.create({
      data: { acopio_id: ACOPIO_A, categoria_id: ids.noRecibe, marcado_por: adminId },
    });
  });
  afterAll(() => a.cerrar());

  const leer = async () =>
    (await a.http().get('/api/publico/necesidades').expect(200)).body as Fila[];
  const idsDe = (l: Cat[]) => l.map((c) => c.categoriaId);

  it('sin sesión clasifica cada categoría del acopio', async () => {
    const fila = (await leer()).find((f) => f.acopioId === ACOPIO_A)!;
    expect(idsDe(fila.faltan)).toContain(ids.falta);
    expect(idsDe(fila.sobran)).toContain(ids.sobra);
    expect(idsDe(fila.alDia)).toEqual(expect.arrayContaining([ids.rango, ids.cerca]));
    expect(idsDe(fila.noRecibe)).toContain(ids.noRecibe);
  });

  it('una categoría con umbral y marca vigente solo sale en noRecibe', async () => {
    const id = (
      await a.prisma.categoria.create({
        data: { nombre: unico('FaltaMarcada '), grupo: 'ALIMENTOS', unidad_base: 'UNIDAD' },
      })
    ).id;
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: id,
        minimo: 5,
        maximo: 20,
        actualizado_por: adminId,
      },
    });
    await a.prisma.noRecibir.create({
      data: { acopio_id: ACOPIO_A, categoria_id: id, marcado_por: adminId },
    });
    const fila = (await leer()).find((f) => f.acopioId === ACOPIO_A)!;
    expect(idsDe(fila.noRecibe)).toContain(id);
    expect(idsDe(fila.faltan)).not.toContain(id);
    expect(idsDe(fila.sobran)).not.toContain(id);
    expect(idsDe(fila.alDia)).not.toContain(id);
  });

  it('no publica cantidades', async () => {
    const texto = JSON.stringify(await leer());
    expect(texto).not.toContain('"cantidad"');
    expect(texto).not.toContain('"minimo"');
    expect(texto).not.toContain('"maximo"');
  });

  it('un acopio cerrado no aparece', async () => {
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_B,
        categoria_id: ids.falta,
        minimo: 5,
        maximo: 20,
        actualizado_por: adminId,
      },
    });
    await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'CERRADO' } });
    try {
      expect((await leer()).some((f) => f.acopioId === ACOPIO_B)).toBe(false);
    } finally {
      await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'ACTIVO' } });
    }
  });

  it('una marca vencida no cuenta', async () => {
    await a.prisma.noRecibir.update({
      where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: ids.noRecibe } },
      data: { hasta: new Date('2000-01-01') },
    });
    const fila = (await leer()).find((f) => f.acopioId === ACOPIO_A)!;
    expect(idsDe(fila.noRecibe)).not.toContain(ids.noRecibe);
  });
});
