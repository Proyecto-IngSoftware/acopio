import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  crearDonador,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';

describe('seguimiento público por folio (RF-CMP-006)', () => {
  let a: AppPrueba;
  let donador: Awaited<ReturnType<typeof crearDonador>>;
  let folio: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    donador = await crearDonador(a);
    const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    const auditor = await crearUsuarioActivo(a, admin, { rol: 'AUDITOR' });
    const cat = await a.prisma.categoria.findFirstOrThrow({
      where: { perecedero: false, unidad_base: 'UNIDAD', archivada: false },
    });
    const d = await a
      .http()
      .post('/api/donaciones')
      .set('authorization', `Bearer ${donador.token}`)
      .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId: cat.id, cantidad: 10 }] })
      .expect(201);
    folio = d.body.folio;
    await a
      .http()
      .post(`/api/comprobantes/${folio}/recepcion`)
      .set('authorization', `Bearer ${op.token}`)
      .send({
        acopioId: ACOPIO_A,
        lineas: [{ lineaId: d.body.lineas[0].id, cantidadConfirmada: 8 }],
      })
      .expect(200);
    await a
      .http()
      .post(`/api/comprobantes/${folio}/conciliar`)
      .set('authorization', `Bearer ${auditor.token}`)
      .expect(200);
  });
  afterAll(() => a.cerrar());

  it('muestra el recorrido y lo que entró, sin sesión', async () => {
    const r = await a.http().get(`/api/seguimiento/${folio}`).expect(200);
    expect(r.body.estado).toBe('Conciliada, en el acopio');
    expect(r.body.pasos.map((p: { paso: string }) => p.paso)).toEqual([
      'PREPARADA',
      'RECIBIDA',
      'CONCILIADA',
    ]);
    expect(r.body.pasos.every((p: { en: string | null }) => p.en !== null)).toBe(true);
    const acopio = await a.prisma.acopio.findUniqueOrThrow({ where: { id: ACOPIO_A } });
    expect(r.body.pasos[1].acopio).toBe(acopio.nombre);
    expect(r.body.lineas).toEqual([expect.objectContaining({ cantidad: 8, confirmada: true })]);
  });

  it('no revela al Donador ni la factura (foco de revisión 4)', async () => {
    const r = await a.http().get(`/api/seguimiento/${folio}`).expect(200);
    const texto = JSON.stringify(r.body);
    const persona = await a.prisma.usuario.findUniqueOrThrow({ where: { id: donador.id } });
    expect(texto).not.toContain(donador.correo);
    expect(texto).not.toContain(persona.nombre);
    expect(texto).not.toMatch(/factura|donador|usuario/i);
  });

  it('encuentra el folio escrito en minúsculas y con espacios (foco de revisión 4)', async () => {
    await a
      .http()
      .get(`/api/seguimiento/${encodeURIComponent(` ${folio.toLowerCase()} `)}`)
      .expect(200);
  });

  it('un folio que no existe y uno mal escrito responden lo mismo', async () => {
    const x = await a.http().get('/api/seguimiento/ACO-2026-ZZZZZ').expect(404);
    const y = await a.http().get('/api/seguimiento/hola').expect(404);
    expect(x.body).toEqual(y.body);
  });
});

describe('seguimiento con el límite por IP', () => {
  it('el undécimo intento del minuto recibe 429', async () => {
    const b = await crearAppPrueba({ limiteDeIntentos: true });
    try {
      for (let i = 0; i < 10; i++)
        await b.http().get('/api/seguimiento/ACO-2026-ZZZZZ').expect(404);
      await b.http().get('/api/seguimiento/ACO-2026-ZZZZZ').expect(429);
    } finally {
      await b.cerrar();
    }
  });
});
