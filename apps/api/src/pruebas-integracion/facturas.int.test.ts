import sharp from 'sharp';
import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  almacenPrueba,
  crearAppPrueba,
  crearDonador,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';

describe('foto de factura (RF-CMP-002)', () => {
  let a: AppPrueba;
  let donador: Awaited<ReturnType<typeof crearDonador>>;
  let folio: string;
  let jpeg: Buffer;

  beforeAll(async () => {
    a = await crearAppPrueba();
    donador = await crearDonador(a);
    const arroz = (await a.prisma.categoria.findFirstOrThrow({ where: { nombre: 'Arroz' } })).id;
    const r = await a
      .http()
      .post('/api/donaciones')
      .set('authorization', `Bearer ${donador.token}`)
      .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId: arroz, cantidad: 1 }] })
      .expect(201);
    folio = r.body.folio;
    jpeg = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#ccc' } })
      .jpeg()
      .withExif({ IFD0: { Artist: 'Ana' } })
      .toBuffer();
  });
  afterAll(() => a.cerrar());

  const subir = (token: string, datos: Buffer, nombre = 'factura.jpg') =>
    a
      .http()
      .post(`/api/donaciones/${folio}/factura`)
      .set('authorization', `Bearer ${token}`)
      .attach('factura', datos, nombre);

  it('guarda la foto como WebP sin metadatos y marca la donación', async () => {
    const r = await subir(donador.token, jpeg).expect(200);
    expect(r.body.tieneFactura).toBe(true);
    const c = await a.prisma.comprobante.findUniqueOrThrow({ where: { folio } });
    const guardada = almacenPrueba.objetos.get(c.factura_key!)!;
    expect(guardada.tipo).toBe('image/webp');
    expect((await sharp(guardada.datos).metadata()).exif).toBeUndefined();
  });

  it('una foto de 9 MB da 413 ARCHIVO_GRANDE con el mensaje de la API', async () => {
    const r = await subir(donador.token, Buffer.alloc(9 * 1024 * 1024)).expect(413);
    expect(r.body).toEqual({
      estado: 413,
      codigo: 'ARCHIVO_GRANDE',
      mensaje: 'La foto pesa más de 8 MB',
    });
  });

  it('un campo con otro nombre da 400 en español que nombra «factura»', async () => {
    const r = await a
      .http()
      .post(`/api/donaciones/${folio}/factura`)
      .set('authorization', `Bearer ${donador.token}`)
      .attach('otro', jpeg, 'f.jpg')
      .expect(400);
    expect(r.body.estado).toBe(400);
    expect(r.body.codigo).toBe('SOLICITUD_INVALIDA');
    expect(r.body.mensaje).toContain('factura');
    expect(r.body.mensaje).not.toMatch(/Unexpected/);
  });

  it('una segunda foto reemplaza a la primera y borra la anterior', async () => {
    const antes = await a.prisma.comprobante.findUniqueOrThrow({ where: { folio } });
    await subir(donador.token, jpeg).expect(200);
    expect(almacenPrueba.objetos.has(antes.factura_key!)).toBe(false);
    expect(almacenPrueba.objetos.has(antes.miniatura_key!)).toBe(false);
  });

  it('un PDF renombrado se rechaza', async () => {
    const r = await subir(donador.token, Buffer.from('%PDF-1.7 hola'), 'factura.jpg').expect(415);
    expect(r.body.codigo).toBe('TIPO_NO_ADMITIDO');
  });

  it('otro Donador no puede subirla ni verla', async () => {
    const otro = await crearDonador(a);
    await subir(otro.token, jpeg).expect(404);
    await a
      .http()
      .get(`/api/comprobantes/${folio}/factura`)
      .set('authorization', `Bearer ${otro.token}`)
      .expect(404);
  });

  it('el dueño y el Auditor del acopio ven una URL firmada; el de otro acopio no', async () => {
    const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const auditorA = await crearUsuarioActivo(a, admin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    const auditorB = await crearUsuarioActivo(a, admin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_B }],
    });
    for (const token of [donador.token, auditorA.token]) {
      const r = await a
        .http()
        .get(`/api/comprobantes/${folio}/factura`)
        .set('authorization', `Bearer ${token}`)
        .expect(200);
      expect(r.body.url).toMatch(/^memoria:\/\/facturas\//);
    }
    await a
      .http()
      .get(`/api/comprobantes/${folio}/factura`)
      .set('authorization', `Bearer ${auditorB.token}`)
      .expect(403);
  });

  it('si la donación ya no está preparada, responde 409 y no deja objetos huérfanos', async () => {
    const arroz = (await a.prisma.categoria.findFirstOrThrow({ where: { nombre: 'Arroz' } })).id;
    const nueva = await a
      .http()
      .post('/api/donaciones')
      .set('authorization', `Bearer ${donador.token}`)
      .send({ acopioId: ACOPIO_A, lineas: [{ categoriaId: arroz, cantidad: 1 }] })
      .expect(201);
    await a
      .http()
      .post(`/api/donaciones/${nueva.body.folio}/cancelar`)
      .set('authorization', `Bearer ${donador.token}`)
      .expect(200);
    const antes = almacenPrueba.objetos.size;
    await a
      .http()
      .post(`/api/donaciones/${nueva.body.folio}/factura`)
      .set('authorization', `Bearer ${donador.token}`)
      .attach('factura', jpeg, 'f.jpg')
      .expect(409);
    expect(almacenPrueba.objetos.size).toBe(antes);
  });
});
