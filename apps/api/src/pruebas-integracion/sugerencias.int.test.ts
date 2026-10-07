import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-005 y 006: el recálculo y el ranking. */
describe('sugerencias', () => {
  let a: AppPrueba;
  let motor: SugerenciasService;
  let tokenAdmin: string;
  let adminId: string;
  let cat: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  const propuestas = () =>
    a.prisma.sugerencia.findMany({
      where: { categoria_id: cat, estado: 'PROPUESTA' },
      orderBy: { puntaje: 'desc' },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    motor = a.app.get(SugerenciasService);
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Agua ranking '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
    await a.prisma.necesidadManual.create({
      data: {
        zona_id: ZONA_A,
        categoria_id: cat,
        cantidad: 1000,
        motivo: 'Necesidad de prueba del motor',
        puesta_por: adminId,
      },
    });
    for (const acopio of [ACOPIO_A, ACOPIO_B]) {
      await a.prisma.movimiento.create({
        data: {
          acopio_id: acopio,
          categoria_id: cat,
          tipo: 'ENTRADA',
          signo: 1,
          cantidad: 900,
          usuario_id: adminId,
          ocurrido_en: new Date(),
        },
      });
      await a.prisma.umbral.create({
        data: {
          acopio_id: acopio,
          categoria_id: cat,
          minimo: 100,
          maximo: 400,
          actualizado_por: adminId,
        },
      });
    }
  });
  afterAll(() => a.cerrar());

  it('propone desde los dos acopios, el más cercano primero, con justificación y desglose', async () => {
    const r = await motor.recalcular();
    expect(r.generadas).toBeGreaterThanOrEqual(2);
    const s = await propuestas();
    expect(s.map((x) => [x.acopio_id, Number(x.cantidad)])).toEqual([
      [ACOPIO_A, 500],
      [ACOPIO_B, 500],
    ]);
    expect(s[0]!.justificacion).toMatch(/Zona A tiene 0 % de cobertura/);
    expect(s[0]!.desglose).toEqual(
      expect.objectContaining({ criticidad: 1, urgencia: 0, magnitud: 0.5 }),
    );
    expect(s[0]!.emergencia_id).toBe(EMERGENCIA_PRUEBA);
  });

  it('un recálculo reemplaza las propuestas', async () => {
    const antes = (await propuestas()).map((x) => x.id);
    await motor.recalcular();
    const despues = (await propuestas()).map((x) => x.id);
    expect(despues).toHaveLength(antes.length);
    expect(despues.some((id) => antes.includes(id))).toBe(false);
  });

  it('un par descartado hace menos de 24 horas no se propone; después sí', async () => {
    const descartada = await a.prisma.sugerencia.create({
      data: {
        ronda: new Date(),
        emergencia_id: EMERGENCIA_PRUEBA,
        acopio_id: ACOPIO_B,
        zona_id: ZONA_A,
        categoria_id: cat,
        cantidad: 10,
        puntaje: 0.1,
        desglose: {},
        justificacion: 'Descartada en la prueba',
        estado: 'DESCARTADA',
        motivo_descarte: 'El camino está cerrado',
        decidida_por: adminId,
        decidida_en: new Date(),
      },
    });
    await motor.recalcular();
    expect((await propuestas()).map((x) => x.acopio_id)).toEqual([ACOPIO_A]);
    await motor.recalcular(new Date(descartada.decidida_en!.getTime() + 25 * 3_600_000));
    expect((await propuestas()).map((x) => x.acopio_id)).toContain(ACOPIO_B);
  });

  it('un acopio cerrado no propone', async () => {
    await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'CERRADO' } });
    try {
      await motor.recalcular(new Date(Date.now() + 25 * 3_600_000));
      expect((await propuestas()).map((x) => x.acopio_id)).toEqual([ACOPIO_A]);
    } finally {
      await a.prisma.acopio.update({ where: { id: ACOPIO_B }, data: { estado: 'ACTIVO' } });
    }
  });

  it('una zona de una emergencia cerrada no recibe propuestas', async () => {
    const cerrada = await a.prisma.emergencia.create({
      data: {
        nombre: unico('Cerrada motor '),
        tipo: 'Sequía',
        inicio: new Date('2026-01-01T00:00:00Z'),
        destacada_hasta: new Date('2026-02-01T00:00:00Z'),
        estado: 'CERRADA',
        cerrada_en: new Date(),
        motivo_cierre: 'Terminó',
      },
    });
    const z = await a.prisma.zona.create({
      data: {
        emergencia_id: cerrada.id,
        nombre: unico('Zona cerrada motor '),
        municipio: 'Bogotá',
        lat: 4.6,
        lng: -74.08,
        poblacion_estimada: 100,
        poblacion_fuente: 'Prueba',
        poblacion_fecha: new Date(),
      },
    });
    await a.prisma.necesidadManual.create({
      data: {
        zona_id: z.id,
        categoria_id: cat,
        cantidad: 300,
        motivo: 'Necesidad en zona cerrada',
        puesta_por: adminId,
      },
    });
    await motor.recalcular();
    expect((await propuestas()).some((x) => x.zona_id === z.id)).toBe(false);
  });

  it('el ranking por la API se filtra por categoría y es solo del Administrador', async () => {
    const r = await a.http().post('/api/sugerencias/recalcular').set(como(tokenAdmin)).expect(200);
    expect(r.body.generadas).toEqual(expect.any(Number));
    const lista = await a
      .http()
      .get(`/api/sugerencias?categoria=${cat}`)
      .set(como(tokenAdmin))
      .expect(200);
    expect(lista.body[0]).toMatchObject({
      estado: 'PROPUESTA',
      acopio: { id: ACOPIO_A, nombre: 'Acopio A' },
      zona: { id: ZONA_A, nombre: 'Zona A' },
      categoria: { id: cat, unidad: 'LITRO' },
      cantidad: 500,
      justificacion: expect.stringContaining('Acopio A'),
    });
    const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
    await a.http().get('/api/sugerencias').set(como(op.token)).expect(403);
  });
});
