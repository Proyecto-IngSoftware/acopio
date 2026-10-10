import {
  ADMIN,
  EMERGENCIA_PRUEBA,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-MOT-011 y RF-RED-009: el Receptor reporta lo que falta y el mapa público lo muestra (M-09). */
describe('reportes de necesidad y capa pública', () => {
  let a: AppPrueba;
  let admin: string;
  let receptor: string;
  let receptorId: string;
  let otroReceptor: string;
  let zona: string;
  let panales: { id: string; nombre: string };
  let agua: { id: string; nombre: string };
  let jabon: { id: string; nombre: string };
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const publico = async () =>
    (await a.http().get('/api/publico/zonas-necesidad').expect(200)).body as {
      zonaId: string;
      centro: { lat: number; lng: number };
      radioKm: number;
      necesidades: { categoria: string; nota: string | null; reportadoEn: string }[];
    }[];

  async function crearZona(emergenciaId: string, lat: number) {
    return (
      await a.prisma.zona.create({
        data: {
          emergencia_id: emergenciaId,
          nombre: unico('Zona reportes '),
          municipio: 'Bogotá',
          lat,
          lng: -74.08789,
          poblacion_estimada: 300,
          poblacion_fuente: 'Censo de prueba',
          poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
        },
      })
    ).id;
  }
  const categoria = async (nombre: string) =>
    a.prisma.categoria.create({
      data: { nombre: unico(nombre), grupo: 'BEBE', unidad_base: 'UNIDAD' },
      select: { id: true, nombre: true },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    zona = await crearZona(EMERGENCIA_PRUEBA, 4.61234);
    const otra = await crearZona(EMERGENCIA_PRUEBA, 4.7);
    const r = await crearUsuarioActivo(a, admin, {
      rol: 'RECEPTOR',
      asignaciones: [{ tipo: 'ZONA', ubicacionId: zona }],
    });
    receptor = r.token;
    receptorId = r.id;
    otroReceptor = (
      await crearUsuarioActivo(a, admin, {
        rol: 'RECEPTOR',
        asignaciones: [{ tipo: 'ZONA', ubicacionId: otra }],
      })
    ).token;
    panales = await categoria('Pañales ');
    agua = await categoria('Agua ');
    jabon = await categoria('Jabón ');
  });
  afterAll(() => a.cerrar());

  it('el Receptor reporta dos categorías con una nota y queda en la bitácora', async () => {
    await a
      .http()
      .post(`/api/zonas/${zona}/reportes`)
      .set(como(receptor))
      .send({
        categorias: [panales.id, agua.id],
        nota: 'Hay 12 bebés en el coliseo',
        resuelta: false,
      })
      .expect(201);
    const r = await a.http().get(`/api/zonas/${zona}/reportes`).set(como(receptor)).expect(200);
    expect(r.body.map((x: { categoriaId: string }) => x.categoriaId)).toEqual(
      expect.arrayContaining([panales.id, agua.id]),
    );
    expect(
      await a.prisma.bitacora.count({ where: { accion: 'reporte.necesidad', ubicacion_id: zona } }),
    ).toBe(2);
  });

  it('un Receptor no reporta en una zona ajena', async () => {
    const r = await a
      .http()
      .post(`/api/zonas/${zona}/reportes`)
      .set(como(otroReceptor))
      .send({ categorias: [agua.id], resuelta: false })
      .expect(403);
    expect(r.body.codigo).toBe('ZONA_NO_ASIGNADA');
  });

  it('el público ve el círculo redondeado y la necesidad, y nada más', async () => {
    const z = (await publico()).find((x) => x.zonaId === zona)!;
    expect(Object.keys(z).sort()).toEqual(['centro', 'necesidades', 'radioKm', 'zonaId']);
    expect(z.radioKm).toBe(3);
    expect(z.centro).toEqual({ lat: 4.61, lng: -74.09 });
    expect(z.necesidades).toEqual(
      expect.arrayContaining([
        {
          categoria: panales.nombre,
          nota: 'Hay 12 bebés en el coliseo',
          reportadoEn: expect.any(String),
        },
      ]),
    );
  });

  it('un reporte resuelto o de hace 8 días no se publica', async () => {
    await a
      .http()
      .post(`/api/zonas/${zona}/reportes`)
      .set(como(receptor))
      .send({ categorias: [panales.id], resuelta: true })
      .expect(201);
    await a.prisma.reporteNecesidad.create({
      data: {
        zona_id: zona,
        categoria_id: jabon.id,
        reportado_por: receptorId,
        nota: 'Viejo',
        reportado_en: new Date(Date.now() - 8 * 86_400_000),
      },
    });
    const z = (await publico()).find((x) => x.zonaId === zona)!;
    const nombres = z.necesidades.map((n) => n.categoria);
    expect(nombres).toContain(agua.nombre);
    expect(nombres).not.toContain(panales.nombre);
    expect(nombres).not.toContain(jabon.nombre);
  });

  it('una zona de una emergencia cerrada no aparece', async () => {
    const cerrada = (
      await a.prisma.emergencia.create({
        data: {
          nombre: unico('Cerrada '),
          tipo: 'Inundación',
          inicio: new Date('2026-08-01T00:00:00Z'),
          destacada_hasta: new Date('2026-08-30T00:00:00Z'),
          estado: 'CERRADA',
          cerrada_en: new Date(),
          motivo_cierre: 'La emergencia terminó hace semanas',
        },
      })
    ).id;
    const z = await crearZona(cerrada, 4.8);
    expect((await publico()).map((x) => x.zonaId)).not.toContain(z);
  });
});
