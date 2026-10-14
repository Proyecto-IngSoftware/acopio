import sharp from 'sharp';
import {
  ACOPIO_A,
  ADMIN,
  EMERGENCIA_PRUEBA,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-MOT-009: el Receptor confirma en la zona con una foto; un despacho general toma su zona. */
describe('recepción en zona', () => {
  let a: AppPrueba;
  let admin: string;
  let adminId: string;
  let operador: string;
  let receptorA: string;
  let receptorB: string;
  let zonaA: string;
  let zonaB: string;
  let jpeg: Buffer;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const post = (url: string, t: string, cuerpo: object) =>
    a.http().post(url).set(como(t)).send(cuerpo);
  const get = (url: string, t: string) => a.http().get(url).set(como(t));
  const subirFoto = (codigo: string, t: string) =>
    a
      .http()
      .post(`/api/remisiones/${codigo}/evidencia`)
      .set(como(t))
      .attach('foto', jpeg, 'foto.jpg');

  /** Una remisión en tránsito desde ACOPIO_A, con zona o general, con una línea de 2. */
  async function enTransito(zonaId: string | null) {
    const cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Recepción '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: cat,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: 10,
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
    const r = await post('/api/remisiones', operador, {
      acopioId: ACOPIO_A,
      zonaId,
      responsable: 'Ana',
      lineas: [{ categoriaId: cat, cantidad: 2 }],
    }).expect(201);
    await post(`/api/remisiones/${r.body.codigo}/despachar`, operador, {}).expect(200);
    return r.body as { id: string; codigo: string; qrToken: string };
  }

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    operador = (await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' })).token;
    // Zonas propias: un Receptor asignado a zonaA cambiaría las pruebas de usuarios
    const zona = (nombre: string) =>
      a.prisma.zona.create({
        data: {
          emergencia_id: EMERGENCIA_PRUEBA,
          nombre: unico(nombre),
          municipio: 'Bogotá',
          lat: 4.62,
          lng: -74.08,
          poblacion_estimada: 300,
          poblacion_fuente: 'Censo de prueba',
          poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
        },
      });
    zonaA = (await zona('Zona recepción A ')).id;
    zonaB = (
      await a.prisma.zona.create({
        data: {
          emergencia_id: EMERGENCIA_PRUEBA,
          nombre: unico('Zona B '),
          municipio: 'Bogotá',
          lat: 4.62,
          lng: -74.08,
          poblacion_estimada: 300,
          poblacion_fuente: 'Censo de prueba',
          poblacion_fecha: new Date('2026-09-01T00:00:00Z'),
        },
      })
    ).id;
    receptorA = (
      await crearUsuarioActivo(a, admin, {
        rol: 'RECEPTOR',
        asignaciones: [{ tipo: 'ZONA', ubicacionId: zonaA }],
      })
    ).token;
    receptorB = (
      await crearUsuarioActivo(a, admin, {
        rol: 'RECEPTOR',
        asignaciones: [{ tipo: 'ZONA', ubicacionId: zonaB }],
      })
    ).token;
    jpeg = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#ccc' } })
      .jpeg()
      .toBuffer();
  });
  afterAll(() => a.cerrar());

  it('el Receptor ve lo que va a su zona y los despachos generales', async () => {
    const conZona = await enTransito(zonaA);
    const general = await enTransito(null);
    const r = await get('/api/recepciones', receptorA).expect(200);
    const codigos = r.body.map((x: { codigo: string }) => x.codigo);
    expect(codigos).toEqual(expect.arrayContaining([conZona.codigo, general.codigo]));
    const otro = await get('/api/recepciones', receptorB).expect(200);
    const deB = otro.body.map((x: { codigo: string }) => x.codigo);
    expect(deB).not.toContain(conZona.codigo);
    expect(deB).toContain(general.codigo);
  });

  it('por QR, el Receptor de otra zona recibe 403 ZONA_NO_ASIGNADA', async () => {
    const conZona = await enTransito(zonaA);
    await get(`/api/recepciones/qr/${conZona.qrToken}`, receptorA).expect(200);
    const r = await get(`/api/recepciones/qr/${conZona.qrToken}`, receptorB).expect(403);
    expect(r.body.codigo).toBe('ZONA_NO_ASIGNADA');
  });

  it('sin foto no se recibe', async () => {
    const conZona = await enTransito(zonaA);
    const r = await post(`/api/remisiones/${conZona.codigo}/recibir`, receptorA, {}).expect(422);
    expect(r.body.codigo).toBe('SIN_EVIDENCIA');
  });

  it('con foto recibe: RECEPCION por línea, recibido = planeado, estado RECIBIDA', async () => {
    const conZona = await enTransito(zonaA);
    await subirFoto(conZona.codigo, receptorA).expect(200);
    const r = await post(`/api/remisiones/${conZona.codigo}/recibir`, receptorA, {
      nota: 'Llegó una caja mojada',
    }).expect(200);
    expect(r.body).toMatchObject({ estado: 'RECIBIDA', notaRecepcion: 'Llegó una caja mojada' });
    expect(r.body.lineas.every((l: { cantidadRecibida: number }) => l.cantidadRecibida === 2)).toBe(
      true,
    );
    const rec = await a.prisma.movimiento.findMany({
      where: { remision_id: conZona.id, tipo: 'RECEPCION' },
    });
    expect(rec).toHaveLength(1);
    expect(rec[0]).toMatchObject({ zona_id: zonaA, acopio_id: null });
  });

  it('un despacho general toma la zona del Receptor, que es obligatoria y suya', async () => {
    const general = await enTransito(null);
    await subirFoto(general.codigo, receptorB).expect(200);
    const sin = await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, {}).expect(400);
    expect(sin.body.codigo).toBe('ZONA_OBLIGATORIA');
    const ajena = await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, {
      zonaId: zonaA,
    }).expect(403);
    expect(ajena.body.codigo).toBe('ZONA_NO_ASIGNADA');
    await post(`/api/remisiones/${general.codigo}/recibir`, receptorB, { zonaId: zonaB }).expect(
      200,
    );
    const rem = await a.prisma.remision.findUniqueOrThrow({ where: { id: general.id } });
    expect(rem.zona_destino_id).toBe(zonaB);
  });

  it('dos Receptores confirman a la vez el mismo despacho general: uno gana', async () => {
    const g = await enTransito(null);
    await subirFoto(g.codigo, receptorA).expect(200);
    const [x, y] = await Promise.all([
      post(`/api/remisiones/${g.codigo}/recibir`, receptorA, { zonaId: zonaA }),
      post(`/api/remisiones/${g.codigo}/recibir`, receptorB, { zonaId: zonaB }),
    ]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect(
      await a.prisma.movimiento.count({ where: { remision_id: g.id, tipo: 'RECEPCION' } }),
    ).toBe(1);
  });

  it('la sexta foto responde 422 EVIDENCIA_MAXIMA', async () => {
    const g = await enTransito(null);
    for (let i = 0; i < 5; i++) await subirFoto(g.codigo, receptorA).expect(200);
    const r = await subirFoto(g.codigo, receptorA).expect(422);
    expect(r.body.codigo).toBe('EVIDENCIA_MAXIMA');
  });

  it('la API sirve la foto con su tipo y sin caché; un Receptor ajeno no la ve', async () => {
    const conZona = await enTransito(zonaA);
    await subirFoto(conZona.codigo, receptorA).expect(200);
    const r = await get(`/api/remisiones/${conZona.codigo}/evidencia/0`, receptorA).expect(200);
    expect(r.headers['content-type']).toBe('image/webp');
    expect(r.headers['cache-control']).toBe('private, no-store');
    await get(`/api/remisiones/${conZona.codigo}/evidencia/0`, receptorB).expect(403);
    await get(`/api/remisiones/${conZona.codigo}/evidencia/0`, operador).expect(200);
    await get(`/api/remisiones/${conZona.codigo}/evidencia/9`, admin).expect(404);
  });
});
