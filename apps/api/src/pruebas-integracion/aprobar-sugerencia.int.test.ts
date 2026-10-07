import {
  ACOPIO_A,
  ADMIN,
  EMERGENCIA_PRUEBA,
  ZONA_A,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-007: aprobar arma la remisión en borrador; descartar exige motivo. */
describe('aprobar y descartar sugerencias', () => {
  let a: AppPrueba;
  let motor: SugerenciasService;
  let token: string;
  let adminId: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  async function escenario(opciones: { saldo: number; necesidades: [string, number][] }) {
    const cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Aprobar '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: cat,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: opciones.saldo,
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: cat,
        minimo: 0,
        maximo: 0,
        actualizado_por: adminId,
      },
    });
    for (const [zona, cantidad] of opciones.necesidades)
      await a.prisma.necesidadManual.create({
        data: {
          zona_id: zona,
          categoria_id: cat,
          cantidad,
          motivo: 'Necesidad de la prueba de aprobar',
          puesta_por: adminId,
        },
      });
    await motor.recalcular();
    const s = await a.prisma.sugerencia.findMany({
      where: { categoria_id: cat, estado: 'PROPUESTA' },
      orderBy: { puntaje: 'desc' },
    });
    return { cat, sugerencias: s };
  }

  const aprobar = (id: string, cantidad?: number) =>
    a
      .http()
      .post(`/api/sugerencias/${id}/aprobar`)
      .set(como(token))
      .send(cantidad === undefined ? {} : { cantidad });

  beforeAll(async () => {
    a = await crearAppPrueba();
    motor = a.app.get(SugerenciasService);
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
  });
  afterAll(() => a.cerrar());

  it('aprobar crea la remisión en borrador, con la cantidad editada, y la bitácora', async () => {
    const { cat, sugerencias } = await escenario({ saldo: 500, necesidades: [[ZONA_A, 400]] });
    const r = await aprobar(sugerencias[0]!.id, 300).expect(200);
    expect(r.body.remision).toMatchObject({ codigo: expect.stringMatching(/^R-\d{4}-/) });
    const remision = await a.prisma.remision.findUniqueOrThrow({
      where: { codigo: r.body.remision.codigo },
      include: { lineas: true },
    });
    expect(remision).toMatchObject({
      estado: 'BORRADOR',
      acopio_origen_id: ACOPIO_A,
      zona_destino_id: ZONA_A,
    });
    expect(remision.lineas.find((l) => l.categoria_id === cat)?.cantidad_planeada.toNumber()).toBe(
      300,
    );
    const s = await a.prisma.sugerencia.findUniqueOrThrow({ where: { id: sugerencias[0]!.id } });
    expect(s).toMatchObject({
      estado: 'APROBADA',
      remision_id: remision.id,
      decidida_por: adminId,
    });
    expect(Number(s.cantidad_aprobada)).toBe(300);
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'sugerencia.aprobada', entidad_id: s.id },
      }),
    ).not.toBeNull();
  });

  it('dos aprobaciones del mismo acopio a la misma zona van en una remisión', async () => {
    const uno = await escenario({ saldo: 100, necesidades: [[ZONA_A, 100]] });
    const dos = await escenario({ saldo: 100, necesidades: [[ZONA_A, 100]] });
    // El segundo escenario recalculó: la propuesta del primero es la de la ronda nueva (M-04)
    const vigente = (cat: string) =>
      a.prisma.sugerencia.findFirstOrThrow({ where: { categoria_id: cat, estado: 'PROPUESTA' } });
    const r1 = await aprobar((await vigente(uno.cat)).id).expect(200);
    const r2 = await aprobar((await vigente(dos.cat)).id).expect(200);
    expect(r2.body.remision.codigo).toBe(r1.body.remision.codigo);
    expect(r2.body.remision.creada).toBe(false);
    const lineas = await a.prisma.lineaRemision.count({
      where: { remision: { codigo: r1.body.remision.codigo } },
    });
    expect(lineas).toBeGreaterThanOrEqual(2);
  });

  it('si el saldo bajó desde el cálculo, responde SUGERENCIA_DESACTUALIZADA', async () => {
    const { cat, sugerencias } = await escenario({ saldo: 200, necesidades: [[ZONA_A, 200]] });
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: cat,
        tipo: 'SALIDA',
        signo: -1,
        cantidad: 150,
        motivo_salida: 'ENTREGA_FAMILIAS',
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });
    const r = await aprobar(sugerencias[0]!.id).expect(409);
    expect(r.body).toMatchObject({ codigo: 'SUGERENCIA_DESACTUALIZADA', detalles: { maximo: 50 } });
  });

  it('dos aprobaciones simultáneas que juntas superan el movible: una pasa y la otra no', async () => {
    const zonaB = await a.prisma.zona.create({
      data: {
        emergencia_id: EMERGENCIA_PRUEBA,
        nombre: unico('Zona concurrencia '),
        municipio: 'Bogotá',
        lat: 4.55,
        lng: -74.1,
        poblacion_estimada: 100,
        poblacion_fuente: 'Prueba',
        poblacion_fecha: new Date(),
      },
    });
    const { cat, sugerencias } = await escenario({
      saldo: 500,
      necesidades: [
        [ZONA_A, 400],
        [zonaB.id, 400],
      ],
    });
    const haciaA = sugerencias.find((s) => s.zona_id === ZONA_A)!;
    const haciaB = sugerencias.find((s) => s.zona_id === zonaB.id)!;
    const respuestas = await Promise.all([aprobar(haciaA.id, 400), aprobar(haciaB.id, 300)]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 409]);
    const planeado = await a.prisma.lineaRemision.aggregate({
      where: { categoria_id: cat },
      _sum: { cantidad_planeada: true },
    });
    expect(Number(planeado._sum.cantidad_planeada)).toBeLessThanOrEqual(500);
  });

  it('no se aprueba hacia una zona cuya emergencia se cerró después del recálculo', async () => {
    const emergencia = await a.prisma.emergencia.create({
      data: {
        nombre: unico('Se cierra '),
        tipo: 'Inundación',
        inicio: new Date('2026-09-01T00:00:00Z'),
        destacada_hasta: new Date('2099-01-01T00:00:00Z'),
      },
    });
    const zona = await a.prisma.zona.create({
      data: {
        emergencia_id: emergencia.id,
        nombre: unico('Zona que se cierra '),
        municipio: 'Bogotá',
        lat: 4.58,
        lng: -74.1,
        poblacion_estimada: 100,
        poblacion_fuente: 'Prueba',
        poblacion_fecha: new Date(),
      },
    });
    const { sugerencias } = await escenario({ saldo: 80, necesidades: [[zona.id, 80]] });
    await a.prisma.emergencia.update({
      where: { id: emergencia.id },
      data: { estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: 'Terminó la atención' },
    });
    const r = await aprobar(sugerencias[0]!.id).expect(409);
    expect(r.body.codigo).toBe('ZONA_SOLO_LECTURA');
    expect(await a.prisma.remision.count({ where: { zona_destino_id: zona.id } })).toBe(0);
  });

  it('aprobar y descartar la misma sugerencia a la vez: solo una decisión queda', async () => {
    for (let i = 0; i < 5; i++) {
      const { sugerencias } = await escenario({ saldo: 40, necesidades: [[ZONA_A, 40]] });
      const id = sugerencias[0]!.id;
      const [ap, de] = await Promise.all([
        aprobar(id),
        a
          .http()
          .post(`/api/sugerencias/${id}/descartar`)
          .set(como(token))
          .send({ motivo: 'Descarte simultáneo de prueba' }),
      ]);
      expect([ap.status, de.status].sort()).toEqual([200, 409]);
      const s = await a.prisma.sugerencia.findUniqueOrThrow({ where: { id } });
      if (ap.status === 200) {
        expect(s).toMatchObject({ estado: 'APROBADA', motivo_descarte: null });
      } else {
        expect(s).toMatchObject({ estado: 'DESCARTADA', remision_id: null });
      }
    }
  });

  it('un descarte durante un recálculo no deja el par propuesto otra vez', async () => {
    for (let i = 0; i < 5; i++) {
      const { cat, sugerencias } = await escenario({ saldo: 30, necesidades: [[ZONA_A, 30]] });
      const s = sugerencias[0]!;
      const [, de] = await Promise.all([
        motor.recalcular(),
        a
          .http()
          .post(`/api/sugerencias/${s.id}/descartar`)
          .set(como(token))
          .send({ motivo: 'Descarte durante el recálculo' }),
      ]);
      if (de.status !== 200) continue; // el recálculo llegó primero y la reemplazó
      expect(
        await a.prisma.sugerencia.count({
          where: {
            categoria_id: cat,
            acopio_id: s.acopio_id,
            zona_id: ZONA_A,
            estado: 'PROPUESTA',
          },
        }),
      ).toBe(0);
    }
  });

  it('una sugerencia decidida no se aprueba otra vez; una inexistente da 404', async () => {
    const { sugerencias } = await escenario({ saldo: 50, necesidades: [[ZONA_A, 50]] });
    await aprobar(sugerencias[0]!.id).expect(200);
    expect((await aprobar(sugerencias[0]!.id).expect(409)).body.codigo).toBe('SUGERENCIA_DECIDIDA');
    expect((await aprobar('00000000-0000-4000-8000-000000000000').expect(404)).body.codigo).toBe(
      'SUGERENCIA_NO_ENCONTRADA',
    );
  });

  it('descartar exige motivo, deja bitácora y no se repite', async () => {
    const { sugerencias } = await escenario({ saldo: 60, necesidades: [[ZONA_A, 60]] });
    const id = sugerencias[0]!.id;
    const ruta = `/api/sugerencias/${id}/descartar`;
    await a.http().post(ruta).set(como(token)).send({ motivo: 'corto' }).expect(400);
    await a
      .http()
      .post(ruta)
      .set(como(token))
      .send({ motivo: 'La vía a la zona está cerrada' })
      .expect(200);
    expect(await a.prisma.sugerencia.findUniqueOrThrow({ where: { id } })).toMatchObject({
      estado: 'DESCARTADA',
      motivo_descarte: 'La vía a la zona está cerrada',
    });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'sugerencia.descartada', entidad_id: id },
      }),
    ).not.toBeNull();
    const r = await a
      .http()
      .post(ruta)
      .set(como(token))
      .send({ motivo: 'Otro motivo cualquiera' })
      .expect(409);
    expect(r.body.codigo).toBe('SUGERENCIA_DECIDIDA');
  });

  it('el informe agrega los motivos de descarte', async () => {
    const r = await a.http().get('/api/sugerencias/descartes').set(como(token)).expect(200);
    expect(r.body.total).toBeGreaterThanOrEqual(1);
    expect(r.body.porMotivo).toEqual(
      expect.arrayContaining([
        { nombre: 'la vía a la zona está cerrada', veces: expect.any(Number) },
      ]),
    );
  });
});
