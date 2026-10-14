import {
  ACOPIO_A,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  crearDonador,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';
import { generarFolio } from '../modulos/comprobantes/folio';
import { generarCodigoRemision } from '../modulos/motor/codigo-remision';

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

describe('seguimiento de una donación rechazada', () => {
  it('dice «No se pudo conciliar» y no revela el motivo ni la nota', async () => {
    const a = await crearAppPrueba();
    try {
      const donador = await crearDonador(a);
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
        .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId: cat.id, cantidad: 5 }] })
        .expect(201);
      await a
        .http()
        .post(`/api/comprobantes/${d.body.folio}/recepcion`)
        .set('authorization', `Bearer ${op.token}`)
        .send({
          acopioId: ACOPIO_A,
          lineas: [{ lineaId: d.body.lineas[0].id, cantidadConfirmada: 5 }],
        })
        .expect(200);
      await a
        .http()
        .post(`/api/comprobantes/${d.body.folio}/rechazar`)
        .set('authorization', `Bearer ${auditor.token}`)
        .send({ motivo: 'DIFERENCIA_SIN_EXPLICAR', nota: 'nota-secreta-del-auditor' })
        .expect(200);
      const r = await a.http().get(`/api/seguimiento/${d.body.folio}`).expect(200);
      expect(r.body.estado).toBe('No se pudo conciliar');
      const texto = JSON.stringify(r.body);
      expect(texto).not.toContain('nota-secreta-del-auditor');
      expect(texto).not.toContain('DIFERENCIA_SIN_EXPLICAR');
      expect(texto).not.toMatch(/diferencia sin explicar/i);
      expect(texto).not.toMatch(/motivo|nota/i);
    } finally {
      await a.cerrar();
    }
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

describe('recibido en destino en el seguimiento (RF-CMP-007)', () => {
  let a: AppPrueba;
  let adminId: string;

  async function folioConciliado() {
    const c = await a.prisma.comprobante.create({
      data: {
        folio: generarFolio(2026),
        donador_id: adminId,
        acopio_id: ACOPIO_A,
        estado: 'CONCILIADO',
      },
    });
    return c;
  }

  async function remision(estado: 'EN_TRANSITO' | 'RECIBIDA' | 'CANCELADA') {
    const ahora = new Date();
    return a.prisma.remision.create({
      data: {
        codigo: generarCodigoRemision(2026),
        acopio_origen_id: ACOPIO_A,
        zona_destino_id: ZONA_A,
        qr_token: `seg-${Math.random()}`,
        creada_por: adminId,
        estado,
        responsable: 'Ana',
        despachada_en: ahora,
        ...(estado === 'RECIBIDA'
          ? { recibida_en: ahora, evidencia_keys: ['remisiones/prueba.webp'] }
          : {}),
        ...(estado === 'CANCELADA'
          ? { cancelada_en: ahora, motivo_cancelacion: 'El camión no salió del acopio' }
          : {}),
      },
    });
  }

  const vincular = (remisionId: string, comprobanteId: string) =>
    a.prisma.remisionComprobante.create({
      data: { remision_id: remisionId, comprobante_id: comprobanteId, vinculado_por: adminId },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    adminId = (await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } })).id;
  });
  afterAll(() => a.cerrar());

  it('un folio vinculado a una remisión recibida dice «recibido en destino»', async () => {
    const c = await folioConciliado();
    await vincular((await remision('RECIBIDA')).id, c.id);
    const r = await a.http().get(`/api/seguimiento/${c.folio}`).expect(200);
    expect(r.body.recibidoEnDestino).toBe(true);
    expect(r.body.pasos.at(-1)).toMatchObject({ paso: 'RECIBIDA_EN_DESTINO' });
    expect(r.body.remisiones).toEqual([
      { estado: 'RECIBIDA', despachadaEn: expect.any(String), recibidaEn: expect.any(String) },
    ]);
    expect(r.body.parteDeTuDonacion).toBe(false);
    expect(JSON.stringify(r.body)).not.toMatch(/R-\d{4}-/);
  });

  it('con dos remisiones avisa que es parte de la donación', async () => {
    const c = await folioConciliado();
    await vincular((await remision('RECIBIDA')).id, c.id);
    await vincular((await remision('EN_TRANSITO')).id, c.id);
    const r = await a.http().get(`/api/seguimiento/${c.folio}`).expect(200);
    expect(r.body.parteDeTuDonacion).toBe(true);
    expect(r.body.remisiones.map((x: { estado: string }) => x.estado).sort()).toEqual([
      'EN_TRANSITO',
      'RECIBIDA',
    ]);
  });

  it('una remisión cancelada no aparece en el seguimiento', async () => {
    const c = await folioConciliado();
    await vincular((await remision('CANCELADA')).id, c.id);
    const r = await a.http().get(`/api/seguimiento/${c.folio}`).expect(200);
    expect(r.body.remisiones).toEqual([]);
    expect(r.body.recibidoEnDestino).toBe(false);
    expect(r.body.parteDeTuDonacion).toBe(false);
  });
});
