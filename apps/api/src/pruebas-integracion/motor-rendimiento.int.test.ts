import {
  ADMIN,
  ENTIDAD_PRUEBA,
  HORARIO_PRUEBA,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { SugerenciasService } from '../modulos/motor/sugerencias.service';

/** RF-MOT-005: con 50 zonas, 20 acopios y 40 categorías, el recálculo tarda menos de 5 s. */
describe('rendimiento del motor', () => {
  let a: AppPrueba;
  let emergencia: string;
  let acopios: string[];

  beforeAll(async () => {
    a = await crearAppPrueba();
    const adminId = (
      await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })
    ).id;
    emergencia = (
      await a.prisma.emergencia.create({
        data: {
          nombre: unico('Rendimiento '),
          tipo: 'Inundación',
          inicio: new Date('2026-09-01T00:00:00Z'),
          destacada_hasta: new Date('2099-01-01T00:00:00Z'),
        },
      })
    ).id;
    const categorias: string[] = [];
    for (let i = 0; i < 40; i++)
      categorias.push(
        (
          await a.prisma.categoria.create({
            data: { nombre: unico(`Rend ${i} `), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
          })
        ).id,
      );
    const zonas: string[] = [];
    for (let i = 0; i < 50; i++)
      zonas.push(
        (
          await a.prisma.zona.create({
            data: {
              emergencia_id: emergencia,
              nombre: unico(`Rend zona ${i} `),
              municipio: 'Mocoa',
              lat: 1 + i * 0.01,
              lng: -76.6,
              poblacion_estimada: 500,
              poblacion_fuente: 'Prueba',
              poblacion_fecha: new Date(),
            },
          })
        ).id,
      );
    acopios = [];
    for (let i = 0; i < 20; i++)
      acopios.push(
        (
          await a.prisma.acopio.create({
            data: {
              entidad_id: ENTIDAD_PRUEBA,
              nombre: unico(`Rend acopio ${i} `),
              direccion: 'Calle 1',
              municipio: 'Mocoa',
              lat: 1.2 + i * 0.01,
              lng: -76.5,
              horario: HORARIO_PRUEBA,
            },
          })
        ).id,
      );
    await a.prisma.necesidadManual.createMany({
      data: zonas.flatMap((z) =>
        categorias.map((c) => ({
          zona_id: z,
          categoria_id: c,
          cantidad: 100,
          motivo: 'Carga de rendimiento',
          puesta_por: adminId,
        })),
      ),
    });
    await a.prisma.movimiento.createMany({
      data: acopios.flatMap((ac) =>
        categorias.map((c) => ({
          acopio_id: ac,
          categoria_id: c,
          tipo: 'ENTRADA' as const,
          signo: 1,
          cantidad: 300,
          usuario_id: adminId,
          ocurrido_en: new Date(),
        })),
      ),
    });
    await a.prisma.umbral.createMany({
      data: acopios.flatMap((ac) =>
        categorias.map((c) => ({
          acopio_id: ac,
          categoria_id: c,
          minimo: 10,
          maximo: 50,
          actualizado_por: adminId,
        })),
      ),
    });
  }, 120_000);

  afterAll(async () => {
    // La base es una para todas las suites: estas zonas y acopios salen del cálculo
    await a.prisma.emergencia.update({
      where: { id: emergencia },
      data: { estado: 'CERRADA', cerrada_en: new Date(), motivo_cierre: 'Fin de la prueba' },
    });
    await a.prisma.acopio.updateMany({
      where: { id: { in: acopios } },
      data: { estado: 'CERRADO' },
    });
    await a.cerrar();
  });

  it('recalcula en menos de 5 s', async () => {
    const motor = a.app.get(SugerenciasService);
    const inicio = performance.now();
    const r = await motor.recalcular();
    const ms = performance.now() - inicio;
    expect(r.generadas).toBeGreaterThan(0);
    expect(ms).toBeLessThan(5000);
  }, 30_000);
});
