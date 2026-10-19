import { HORARIO_VACIO } from '@acopio/shared';
import type { Prisma } from '../generado/prisma/client';
import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** 18 de octubre de 2026, 10:00 en Bogotá. */
const AHORA = Date.parse('2026-10-18T15:00:00Z');

/** Pieza E: CSV de categorías, inventario inicial y jornadas. */
describe('CSV de catálogo, inventario y turnos', () => {
  let a: AppPrueba;
  let admin: string;
  let acopioA: string;

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    acopioA = (await a.prisma.acopio.findUniqueOrThrow({ where: { id: ACOPIO_A } })).nombre;
  });
  afterAll(() => a.cerrar());

  const csv = (filas: string[]) => Buffer.from(filas.join('\n'), 'utf8');
  const enviar = (tipo: string, accion: 'revisar' | 'aplicar', contenido: Buffer) =>
    a
      .http()
      .post(`/api/importacion/csv/${tipo}/${accion}`)
      .set({ authorization: `Bearer ${admin}` })
      .attach('archivo', contenido, `${tipo}.csv`);
  const errorDe = (
    cuerpo: { filas: { numero: number; errores: { columna: string }[] }[] },
    n: number,
  ) => cuerpo.filas.find((f) => f.numero === n)?.errores[0];

  it('categorías: crea con grupo, unidad y sinónimos', async () => {
    const nombre = unico('Granola ');
    await enviar(
      'categorias',
      'aplicar',
      csv([
        'nombre,grupo,unidad_base,perecedero,sinonimos',
        `${nombre},ALIMENTOS,KILOGRAMO,si,avena|cereal`,
      ]),
    ).expect(200);
    expect(await a.prisma.categoria.findUnique({ where: { nombre } })).toMatchObject({
      grupo: 'ALIMENTOS',
      unidad_base: 'KILOGRAMO',
      perecedero: true,
      sinonimos: ['avena', 'cereal'],
    });
  });

  it('categorías: un grupo que no existe falla en su columna', async () => {
    const r = await enviar(
      'categorias',
      'revisar',
      csv(['nombre,grupo,unidad_base,perecedero,sinonimos', `${unico('X ')},COMIDA,KILOGRAMO,no,`]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'grupo' });
  });

  it('categorías: el mismo nombre dos veces en el archivo falla en la segunda', async () => {
    const nombre = unico('Doble ');
    const r = await enviar(
      'categorias',
      'revisar',
      csv([
        'nombre,grupo,unidad_base,perecedero,sinonimos',
        `${nombre},ALIMENTOS,KILOGRAMO,no,`,
        `${nombre.toUpperCase()},ALIMENTOS,KILOGRAMO,no,`,
      ]),
    ).expect(200);
    expect(r.body).toMatchObject({ validas: 1, invalidas: 1 });
    expect(errorDe(r.body, 2)).toMatchObject({ columna: 'nombre' });
  });

  it('inventario y jornadas: un acopio cerrado falla en revisar con la columna acopio', async () => {
    const cerrado = await a.prisma.acopio.create({
      data: {
        entidad_id: (await a.prisma.acopio.findUniqueOrThrow({ where: { id: ACOPIO_A } }))
          .entidad_id,
        nombre: unico('Cerrado CSV '),
        direccion: 'Calle 1',
        municipio: 'Bogotá',
        lat: 4.6,
        lng: -74.1,
        horario: HORARIO_VACIO as unknown as Prisma.InputJsonValue,
        estado: 'CERRADO',
      },
    });
    const inv = await enviar(
      'inventario',
      'revisar',
      csv(['acopio,categoria,cantidad,vence_en', `${cerrado.nombre},Arroz,2,`]),
    ).expect(200);
    expect(errorDe(inv.body, 1)).toMatchObject({ columna: 'acopio' });
    const jor = await enviar(
      'jornadas',
      'revisar',
      csv([
        'acopio,titulo,descripcion,fecha,hora_inicio,hora_fin,cupo_maximo,que_llevar,perfil_requerido',
        `${cerrado.nombre},${unico('T ')},D,2026-10-25,08:00,12:00,8,,`,
      ]),
    ).expect(200);
    expect(errorDe(jor.body, 1)).toMatchObject({ columna: 'acopio' });
  });

  it('inventario: cada fila es una entrada y el saldo es la suma del archivo', async () => {
    const categoria = await a.prisma.categoria.create({
      data: { nombre: unico('Arroz CSV '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
    });
    const cantidades = [3, 4.5];
    await enviar(
      'inventario',
      'aplicar',
      csv([
        'acopio,categoria,cantidad,vence_en',
        ...cantidades.map((c) => `${acopioA},${categoria.nombre},${c},`),
      ]),
    ).expect(200);
    const saldo = await a.prisma.saldo.findUniqueOrThrow({
      where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: categoria.id } },
    });
    expect(Number(saldo.cantidad)).toBe(cantidades.reduce((x, y) => x + y, 0));
    expect(
      await a.prisma.movimiento.count({
        where: { acopio_id: ACOPIO_A, categoria_id: categoria.id, tipo: 'ENTRADA' },
      }),
    ).toBe(cantidades.length);
  });

  it('inventario: sobre un punto de una fuente externa falla en la columna acopio', async () => {
    const externo = await a.prisma.acopio.create({
      data: {
        tipo: 'REFERENCIADO',
        fuente: unico('prueba-'),
        fuente_id: '1',
        nombre: unico('Externo '),
        direccion: 'Calle 1',
        municipio: 'Bogotá',
        lat: 4.6,
        lng: -74.1,
        horario: HORARIO_VACIO as unknown as Prisma.InputJsonValue,
      },
    });
    const r = await enviar(
      'inventario',
      'revisar',
      csv(['acopio,categoria,cantidad,vence_en', `${externo.nombre},Arroz,2,`]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'acopio' });
  });

  it('jornadas: con menos de 13 horas de anticipación falla en la columna fecha', async () => {
    const r = await enviar(
      'jornadas',
      'revisar',
      csv([
        'acopio,titulo,descripcion,fecha,hora_inicio,hora_fin,cupo_maximo,que_llevar,perfil_requerido',
        `${acopioA},${unico('Hoy ')},Clasificar ropa,2026-10-18,18:00,20:00,5,,`,
      ]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'fecha' });
  });

  it('jornadas: con anticipación se crea con las reglas de la consola', async () => {
    const titulo = unico('Armar kits CSV ');
    await enviar(
      'jornadas',
      'aplicar',
      csv([
        'acopio,titulo,descripcion,fecha,hora_inicio,hora_fin,cupo_maximo,que_llevar,perfil_requerido',
        `${acopioA},${titulo},Armar kits para familias,2026-10-25,08:00,12:00,8,Guantes,`,
      ]),
    ).expect(200);
    expect(await a.prisma.jornada.findFirst({ where: { titulo } })).toMatchObject({
      acopio_id: ACOPIO_A,
      cupo_maximo: 8,
      que_llevar: 'Guantes',
    });
  });
});
