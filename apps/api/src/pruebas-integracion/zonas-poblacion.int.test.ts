import {
  ADMIN,
  EMERGENCIA_PRUEBA,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-MOT-012: la población cambia con su fuente y su fecha. */
describe('población de una zona', () => {
  let a: AppPrueba;
  let token: string;
  let zona: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    zona = (
      await a.prisma.zona.create({
        data: {
          emergencia_id: EMERGENCIA_PRUEBA,
          nombre: unico('Zona población '),
          municipio: 'Mocoa',
          lat: 1.15,
          lng: -76.65,
          poblacion_estimada: 1000,
          poblacion_fuente: 'DANE 2020-2035',
          poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const patch = (cuerpo: object) =>
    a.http().patch(`/api/zonas/${zona}`).set(como(token)).send(cuerpo);

  it('un número nuevo sin fuente ni fecha no se guarda', async () => {
    const r = await patch({ poblacionEstimada: 1500 }).expect(422);
    expect(r.body.codigo).toBe('POBLACION_SIN_FUENTE_NUEVA');
  });

  it('con la misma fecha tampoco', async () => {
    const r = await patch({
      poblacionEstimada: 1500,
      poblacionFuente: 'Alcaldía de Mocoa',
      poblacionFecha: '2026-09-01',
    }).expect(422);
    expect(r.body.codigo).toBe('POBLACION_SIN_FUENTE_NUEVA');
  });

  it('con fuente y fecha nuevas se guarda y la bitácora tiene el antes y el después', async () => {
    const r = await patch({
      poblacionEstimada: 1500,
      poblacionFuente: 'Alcaldía de Mocoa',
      poblacionFecha: '2026-10-05',
    }).expect(200);
    expect(r.body).toMatchObject({ poblacionEstimada: 1500, poblacionFuente: 'Alcaldía de Mocoa' });
    const b = await a.prisma.bitacora.findFirst({
      where: { accion: 'zona.actualizada', entidad_id: zona },
      orderBy: { ocurrido_en: 'desc' },
    });
    expect(b?.datos_antes).toMatchObject({ poblacionEstimada: 1000 });
    expect(b?.datos_despues).toMatchObject({ poblacionEstimada: 1500 });
  });

  it('cambiar otro campo sin tocar la población no exige fuente', async () => {
    await patch({ nombre: unico('Zona renombrada ') }).expect(200);
  });
});
