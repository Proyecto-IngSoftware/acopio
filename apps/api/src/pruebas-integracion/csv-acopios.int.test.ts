import {
  ADMIN,
  EMERGENCIA_PRUEBA,
  ENTIDAD_PRUEBA,
  crearAppPrueba,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Pieza E: CSV de entidades, acopios, zonas y causas, con las reglas de cada módulo. */
describe('CSV de la red', () => {
  let a: AppPrueba;
  let admin: string;
  let entidadPrueba: string;
  let emergenciaPrueba: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    entidadPrueba = (await a.prisma.entidad.findUniqueOrThrow({ where: { id: ENTIDAD_PRUEBA } }))
      .nombre;
    emergenciaPrueba = (
      await a.prisma.emergencia.findUniqueOrThrow({ where: { id: EMERGENCIA_PRUEBA } })
    ).nombre;
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

  it('entidades: entran sin verificar y con su bitácora', async () => {
    const nombre = unico('Fundación CSV ');
    await enviar('entidades', 'aplicar', csv(['nombre,tipo', `${nombre},Fundación`])).expect(200);
    const e = await a.prisma.entidad.findUniqueOrThrow({ where: { nombre } });
    expect(e.verificacion).toBe('SIN_VERIFICAR');
    expect(
      await a.prisma.bitacora.count({ where: { accion: 'entidad.creada', entidad_id: e.id } }),
    ).toBe(1);
  });

  it('entidades: un nombre que ya existe falla en revisar', async () => {
    const r = await enviar(
      'entidades',
      'revisar',
      csv(['nombre,tipo', `${entidadPrueba},ONG`]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'nombre' });
  });

  it('acopios: busca la entidad por su nombre y exige coordenadas', async () => {
    const nombre = unico('Acopio CSV ');
    const r = await enviar(
      'acopios',
      'revisar',
      csv([
        'entidad,nombre,direccion,municipio,lat,lng,telefono,indicaciones',
        `${entidadPrueba},${nombre},Calle 1 # 2-3,Bogotá,4.65,-74.06,601 555 0199,Timbre 2`,
        `${entidadPrueba},${unico('Sin lat ')},Calle 4,Bogotá,,-74.06,,`,
        `No existe ${unico('x')},${unico('Huérfano ')},Calle 5,Bogotá,4.6,-74.1,,`,
      ]),
    ).expect(200);
    expect(r.body).toMatchObject({ validas: 1, invalidas: 2 });
    expect(errorDe(r.body, 2)).toMatchObject({ columna: 'lat' });
    expect(errorDe(r.body, 3)).toMatchObject({ columna: 'entidad' });

    await enviar(
      'acopios',
      'aplicar',
      csv([
        'entidad,nombre,direccion,municipio,lat,lng,telefono,indicaciones',
        `${entidadPrueba},${nombre},Calle 1 # 2-3,Bogotá,4.65,-74.06,601 555 0199,Timbre 2`,
      ]),
    ).expect(200);
    expect(await a.prisma.acopio.findFirst({ where: { nombre } })).toMatchObject({
      entidad_id: ENTIDAD_PRUEBA,
      tipo: 'OPERADO',
      telefono: '601 555 0199',
      indicaciones_acceso: 'Timbre 2',
    });
  });

  it('acopios y zonas: coordenadas fuera de Colombia fallan en revisar, no con un 500', async () => {
    const acopio = await enviar(
      'acopios',
      'revisar',
      csv([
        'entidad,nombre,direccion,municipio,lat,lng,telefono,indicaciones',
        `${entidadPrueba},${unico('Fuera ')},Calle 1,Bogotá,400,-74.06,,`,
        `${entidadPrueba},${unico('Cero ')},Calle 1,Bogotá,4.6,0,,`,
      ]),
    ).expect(200);
    expect(errorDe(acopio.body, 1)).toMatchObject({ columna: 'lat' });
    expect(errorDe(acopio.body, 2)).toMatchObject({ columna: 'lng' });
    const zona = await enviar(
      'zonas',
      'revisar',
      csv([
        'emergencia,nombre,municipio,lat,lng,poblacion_estimada,poblacion_fuente,poblacion_fecha',
        `${emergenciaPrueba},${unico('Zona 0 ')},Mocoa,0,0,10,Censo,2026-09-01`,
      ]),
    ).expect(200);
    expect(errorDe(zona.body, 1)).toMatchObject({ columna: 'lng' });
  });

  it('causas: un enlace sin https o un cierre fuera de rango fallan en revisar con su columna', async () => {
    const verificada = unico('Verificada R ');
    await a.prisma.entidad.create({
      data: {
        nombre: verificada,
        tipo: 'ONG',
        sitio_web: 'https://ong.test',
        verificacion: 'VERIFICADA',
        verificada_en: new Date(),
      },
    });
    const bien = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const r = await enviar(
      'causas',
      'revisar',
      csv([
        'entidad,categoria,titulo,descripcion,url_oficial,cierra_el,paso_1',
        `${verificada},PERSONAS,${unico('Http ')},D,http://ong.test/donar,${bien},Entra`,
        `${verificada},PERSONAS,${unico('Vieja ')},D,https://ong.test/donar,2020-01-01,Entra`,
      ]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'url_oficial' });
    expect(errorDe(r.body, 2)).toMatchObject({ columna: 'cierra_el' });
  });

  it('zonas: busca la emergencia por su nombre', async () => {
    const nombre = unico('Zona CSV ');
    await enviar(
      'zonas',
      'aplicar',
      csv([
        'emergencia,nombre,municipio,lat,lng,poblacion_estimada,poblacion_fuente,poblacion_fecha',
        `${emergenciaPrueba},${nombre},Mocoa,1.15,-76.65,350,Censo de prueba,2026-09-01`,
      ]),
    ).expect(200);
    expect(await a.prisma.zona.findFirst({ where: { nombre } })).toMatchObject({
      emergencia_id: EMERGENCIA_PRUEBA,
      poblacion_estimada: 350,
    });
  });

  it('causas: una entidad sin verificar falla en revisar, no en aplicar', async () => {
    const sinVerificar = unico('Sin verificar ');
    await a.prisma.entidad.create({ data: { nombre: sinVerificar, tipo: 'ONG' } });
    const cierre = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const r = await enviar(
      'causas',
      'revisar',
      csv([
        'entidad,categoria,titulo,descripcion,url_oficial,cierra_el,paso_1',
        `${sinVerificar},PERSONAS,${unico('Causa ')},Descripción,https://ong.test/donar,${cierre},Entra al sitio`,
      ]),
    ).expect(200);
    expect(errorDe(r.body, 1)).toMatchObject({ columna: 'entidad' });
  });

  it('causas: con una entidad verificada se publica, con sus pasos y su bitácora', async () => {
    const verificada = unico('Verificada ');
    await a.prisma.entidad.create({
      data: {
        nombre: verificada,
        tipo: 'ONG',
        sitio_web: 'https://ong.test',
        verificacion: 'VERIFICADA',
        verificada_en: new Date(),
      },
    });
    const titulo = unico('Kits CSV ');
    const cierre = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await enviar(
      'causas',
      'aplicar',
      csv([
        'entidad,categoria,titulo,descripcion,url_oficial,cierra_el,paso_1,paso_2',
        `${verificada},PERSONAS,${titulo},Kits para familias,https://ong.test/donar,${cierre},Entra al sitio,Elige donar`,
      ]),
    ).expect(200);
    const c = await a.prisma.causa.findFirstOrThrow({ where: { titulo } });
    expect(c.pasos).toEqual(['Entra al sitio', 'Elige donar']);
    expect(
      await a.prisma.bitacora.count({ where: { accion: 'causa.creada', entidad_id: c.id } }),
    ).toBe(1);
  });
});
