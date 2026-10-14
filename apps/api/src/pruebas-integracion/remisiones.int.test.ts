import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-MOT-008: remisiones creadas a mano, listadas, vistas y editadas en borrador. */
describe('remisiones', () => {
  let a: AppPrueba;
  let admin: string;
  let adminId: string;
  let operadorA: string;
  let operadorB: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const post = (url: string, t: string, cuerpo: object) =>
    a.http().post(url).set(como(t)).send(cuerpo);
  const put = (url: string, t: string, cuerpo: object) =>
    a.http().put(url).set(como(t)).send(cuerpo);
  const patch = (url: string, t: string, cuerpo: object) =>
    a.http().patch(url).set(como(t)).send(cuerpo);
  const get = (url: string, t: string) => a.http().get(url).set(como(t));

  /** Una categoría nueva con ese saldo en ACOPIO_A y umbral 0/0: todo es movible. */
  async function categoria(saldo: number) {
    const id = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Remisión '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: id,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: saldo,
        usuario_id: adminId,
        ocurrido_en: new Date(),
      },
    });
    await a.prisma.umbral.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: id,
        minimo: 0,
        maximo: 0,
        actualizado_por: adminId,
      },
    });
    return id;
  }

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
    operadorA = (await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' })).token;
    operadorB = (
      await crearUsuarioActivo(a, admin, {
        rol: 'OPERADOR',
        asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
      })
    ).token;
  });
  afterAll(() => a.cerrar());

  it('el Operador del origen crea una remisión con zona y sus líneas', async () => {
    const cat = await categoria(40);
    const r = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: ZONA_A,
      responsable: 'Camión de la alcaldía',
      lineas: [{ categoriaId: cat, cantidad: 15 }],
    }).expect(201);
    expect(r.body.codigo).toMatch(/^R-\d{4}-[A-HJ-NP-Z2-9]{5}$/);
    expect(r.body.estado).toBe('BORRADOR');
    expect(r.body.zona).toMatchObject({ id: ZONA_A });
    expect(r.body.lineas).toEqual([
      expect.objectContaining({ categoriaId: cat, cantidadPlaneada: 15, cantidadRecibida: null }),
    ]);
    const b = await a.prisma.bitacora.findFirst({
      where: { accion: 'remision.creada', entidad_id: r.body.id },
    });
    expect(b).not.toBeNull();
  });

  it('una línea mayor que el movible responde 422 con el máximo', async () => {
    const cat = await categoria(40);
    const r = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: null,
      lineas: [{ categoriaId: cat, cantidad: 41 }],
    }).expect(422);
    expect(r.body).toMatchObject({
      codigo: 'LINEA_EXCEDE_MOVIBLE',
      detalles: { categoriaId: cat, maximo: 40 },
    });
  });

  it('el Operador de otro acopio no crea remisiones desde este', async () => {
    const cat = await categoria(5);
    await post('/api/remisiones', operadorB, {
      acopioId: ACOPIO_A,
      zonaId: ZONA_A,
      lineas: [{ categoriaId: cat, cantidad: 1 }],
    }).expect(403);
  });

  it('reemplazar las líneas con las mismas cantidades no choca con su propio compromiso', async () => {
    const cat = await categoria(40);
    const creada = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: ZONA_A,
      lineas: [{ categoriaId: cat, cantidad: 40 }],
    }).expect(201);
    const r = await put(`/api/remisiones/${creada.body.codigo}/lineas`, operadorA, {
      lineas: [{ categoriaId: cat, cantidad: 40 }],
    }).expect(200);
    expect(r.body.lineas).toEqual([expect.objectContaining({ cantidadPlaneada: 40 })]);
  });

  it('fuera de BORRADOR no se editan las líneas', async () => {
    const cat = await categoria(10);
    const creada = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: ZONA_A,
      lineas: [{ categoriaId: cat, cantidad: 1 }],
    }).expect(201);
    await a.prisma.remision.update({
      where: { id: creada.body.id },
      data: { estado: 'EN_TRANSITO', responsable: 'Ana', despachada_en: new Date() },
    });
    const r = await put(`/api/remisiones/${creada.body.codigo}/lineas`, operadorA, {
      lineas: [{ categoriaId: cat, cantidad: 1 }],
    }).expect(409);
    expect(r.body).toMatchObject({
      codigo: 'REMISION_ESTADO_INVALIDO',
      detalles: { estado: 'EN_TRANSITO' },
    });
  });

  it('PATCH cambia el responsable y la zona de un borrador y lo registra', async () => {
    const cat = await categoria(5);
    const creada = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: null,
      lineas: [{ categoriaId: cat, cantidad: 1 }],
    }).expect(201);
    const r = await patch(`/api/remisiones/${creada.body.codigo}`, operadorA, {
      responsable: 'Moto de la Cruz Roja',
      zonaId: ZONA_A,
    }).expect(200);
    expect(r.body).toMatchObject({ responsable: 'Moto de la Cruz Roja', zona: { id: ZONA_A } });
    const b = await a.prisma.bitacora.findFirst({
      where: { accion: 'remision.editada', entidad_id: r.body.id },
    });
    expect(b).not.toBeNull();
  });

  it('GET /remisiones muestra al Operador solo las de su acopio, y GET por código exige alcance', async () => {
    const cat = await categoria(5);
    const creada = await post('/api/remisiones', operadorA, {
      acopioId: ACOPIO_A,
      zonaId: null,
      lineas: [{ categoriaId: cat, cantidad: 1 }],
    }).expect(201);
    const lista = await get('/api/remisiones', operadorB).expect(200);
    expect(lista.body.map((x: { codigo: string }) => x.codigo)).not.toContain(creada.body.codigo);
    await get(`/api/remisiones/${creada.body.codigo}`, operadorB).expect(403);
    await get(`/api/remisiones/${creada.body.codigo}`, admin).expect(200);
    await get('/api/remisiones/R-2026-ZZZZZ', admin).expect(404);
  });
});
