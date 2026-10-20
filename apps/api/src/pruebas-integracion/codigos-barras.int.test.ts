import { Transacciones } from '../comun/prisma/transacciones';
import { CodigosBarrasService } from '../modulos/catalogo/codigos-barras.service';
import {
  ACOPIO_A,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-CAT-004, RF-INV-002 y ADR-0021: cada código apunta a una presentación. */
describe('códigos de barras', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { id: string; token: string; username: string };
  let auditor: { token: string };
  let agua: string;
  let otra: string;
  let panal: string;
  let nombreAgua: string;
  let botella: string; // suelta de 0.6 L en `agua`
  let botellaPropuesta: string; // suelta PROPUESTO en `agua`
  let botellaOtra: string; // suelta en `otra`
  let paquetePanal: string; // suelta de 12 en `panal`
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  let n = 0;
  /** Un EAN de 13 dígitos que no se repite entre pruebas ni entre corridas. */
  const nuevoEan = () => `77${String(Date.now()).slice(-8)}${String(++n).padStart(3, '0')}`;
  const sembrar = (e: string, over: Record<string, unknown> = {}) =>
    a.prisma.codigoBarras.create({
      data: {
        ean: e,
        categoria_id: agua,
        presentacion_id: botella,
        creado_por: op.id,
        ...over,
      },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const o = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    op = { id: o.id, token: o.token, username: o.username };
    auditor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    nombreAgua = unico('Agua EAN ');
    agua = (
      await a.prisma.categoria.create({
        data: { nombre: nombreAgua, grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
    otra = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Otra EAN '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
      })
    ).id;
    panal = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Pañal EAN '), grupo: 'ADULTO_MAYOR', unidad_base: 'UNIDAD' },
      })
    ).id;
    const presentacion = (
      categoria_id: string,
      nombre: string,
      tamano: number,
      estado = 'VALIDADO',
    ) =>
      a.prisma.presentacion
        .create({
          data: {
            categoria_id,
            nombre: unico(nombre),
            tamano,
            estado: estado as 'VALIDADO',
            creado_por: op.id,
          },
        })
        .then((p) => p.id);
    botella = await presentacion(agua, 'Botella pequeña ', 0.6);
    botellaPropuesta = await presentacion(agua, 'Garrafón nuevo ', 5, 'PROPUESTO');
    botellaOtra = await presentacion(otra, 'Bolsa ', 1);
    paquetePanal = await presentacion(panal, 'Pañal x12 ', 12);
  });
  afterAll(() => a.cerrar());

  it('un EAN desconocido: 404', async () => {
    const r = await a
      .http()
      .get(`/api/codigos-barras/${nuevoEan()}`)
      .set(como(op.token))
      .expect(404);
    expect(r.body.codigo).toBe('EAN_DESCONOCIDO');
  });

  it('el Operador asocia: queda VALIDADO con el contenido de la presentación', async () => {
    const e = nuevoEan();
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: e, presentacionId: botella })
      .expect(201);
    expect(r.body).toMatchObject({
      ean: e,
      categoriaId: agua,
      unidad: 'LITRO',
      contenido: 0.6,
      estado: 'VALIDADO',
      porRevisar: false,
      grupo: 'AGUA_Y_BEBIDAS',
      perecedero: false,
      creadoPor: `Persona ${op.username}`,
    });
    expect(r.body.presentacion).toMatchObject({ id: botella, tamano: 0.6 });
    expect(r.body).not.toHaveProperty('descripcion');
    expect(r.body).not.toHaveProperty('revisado');
    expect(Date.parse(r.body.creadoEn as string)).not.toBeNaN();
    const g = await a.http().get(`/api/codigos-barras/${e}`).set(como(op.token)).expect(200);
    expect(g.body).toMatchObject({ categoriaId: agua, contenido: 0.6, estado: 'VALIDADO' });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.asociado', entidad_id: e },
      }),
    ).not.toBeNull();
  });

  it('asociar con una presentación propuesta la deja validada', async () => {
    const e = nuevoEan();
    await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: e, presentacionId: botellaPropuesta })
      .expect(201);
    const p = await a.prisma.presentacion.findUniqueOrThrow({ where: { id: botellaPropuesta } });
    expect(p.estado).toBe('VALIDADO');
    await a.prisma.presentacion.update({
      where: { id: botellaPropuesta },
      data: { estado: 'PROPUESTO' },
    });
  });

  it('el mismo EAN dos veces: 409 EAN_YA_ASOCIADO, sin pisar la asociación', async () => {
    const e = nuevoEan();
    await sembrar(e);
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: e, presentacionId: botellaOtra })
      .expect(409);
    expect(r.body.codigo).toBe('EAN_YA_ASOCIADO');
    const g = await a.http().get(`/api/codigos-barras/${e}`).set(como(op.token)).expect(200);
    expect(g.body.categoriaId).toBe(agua);
  });

  it('presentación inexistente: 404; EAN malo o sin presentación: 400', async () => {
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: nuevoEan(), presentacionId: '99999999-9999-4999-8999-999999999999' })
      .expect(404);
    expect(r.body.codigo).toBe('PRESENTACION_NO_ENCONTRADA');
    for (const malo of ['77020A1043220', '123456789']) {
      await a
        .http()
        .post('/api/codigos-barras')
        .set(como(op.token))
        .send({ ean: malo, presentacionId: botella })
        .expect(400);
    }
    await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: nuevoEan() })
      .expect(400);
  });

  it('el GET trae también los PROPUESTO', async () => {
    const e = nuevoEan();
    await sembrar(e, { estado: 'PROPUESTO' });
    const g = await a.http().get(`/api/codigos-barras/${e}`).set(como(op.token)).expect(200);
    expect(g.body.estado).toBe('PROPUESTO');
  });

  it('q busca por EAN (prefijo), categoría y presentación, sin tildes; PROPUESTO primero', async () => {
    const pres = await a.prisma.presentacion.create({
      data: {
        categoria_id: agua,
        nombre: unico('Botellón útil '),
        tamano: 20,
        estado: 'VALIDADO',
        creado_por: op.id,
      },
    });
    const e1 = nuevoEan();
    const e2 = nuevoEan();
    await sembrar(e1, { presentacion_id: pres.id });
    await sembrar(e2, { presentacion_id: pres.id, estado: 'PROPUESTO' });
    const eans = async (qs: string) =>
      (
        (await a.http().get(`/api/codigos-barras?${qs}`).set(como(tokenAdmin)).expect(200))
          .body as { ean: string }[]
      ).map((x) => x.ean);
    const porPresentacion = await eans(
      `q=${encodeURIComponent(pres.nombre.toUpperCase().replace('Ú', 'u'))}`,
    );
    expect(porPresentacion).toEqual([e2, e1]);
    expect(
      await eans(`q=${encodeURIComponent(nombreAgua.toLowerCase())}&estado=PROPUESTO`),
    ).toContain(e2);
    expect(await eans(`q=${e1.slice(0, 10)}`)).toContain(e1);
    expect(await eans(`q=${e1.slice(0, 10)}&categoriaId=${otra}`)).not.toContain(e1);
    expect(await eans(`q=${e1}&estado=VALIDADO`)).toEqual([e1]);
  });

  it('validar un PROPUESTO lo deja VALIDADO (con la presentación corregida); sobre un VALIDADO: 409', async () => {
    const e = nuevoEan();
    await sembrar(e, { estado: 'PROPUESTO', categoria_id: otra, presentacion_id: botellaOtra });
    const r = await a
      .http()
      .post(`/api/codigos-barras/${e}/validar`)
      .set(como(op.token))
      .send({ presentacionId: botellaPropuesta })
      .expect(201);
    expect(r.body).toMatchObject({ estado: 'VALIDADO', categoriaId: agua, contenido: 5 });
    expect(r.body.presentacion.id).toBe(botellaPropuesta);
    const p = await a.prisma.presentacion.findUniqueOrThrow({ where: { id: botellaPropuesta } });
    expect(p.estado).toBe('VALIDADO');
    await a.prisma.presentacion.update({
      where: { id: botellaPropuesta },
      data: { estado: 'PROPUESTO' },
    });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.validado', entidad_id: e },
      }),
    ).not.toBeNull();
    const dos = await a
      .http()
      .post(`/api/codigos-barras/${e}/validar`)
      .set(como(op.token))
      .send({ presentacionId: botella })
      .expect(409);
    expect(dos.body.codigo).toBe('CODIGO_YA_VALIDADO');
  });

  it('validar un EAN desconocido: 404', async () => {
    const r = await a
      .http()
      .post(`/api/codigos-barras/${nuevoEan()}/validar`)
      .set(como(op.token))
      .send({ presentacionId: botella })
      .expect(404);
    expect(r.body.codigo).toBe('EAN_DESCONOCIDO');
  });

  it('el PATCH mueve un VALIDADO a una presentación de otra categoría: la categoría la sigue', async () => {
    const e = nuevoEan();
    await sembrar(e);
    const r = await a
      .http()
      .patch(`/api/codigos-barras/${e}`)
      .set(como(tokenAdmin))
      .send({ presentacionId: botellaOtra })
      .expect(200);
    expect(r.body).toMatchObject({ categoriaId: otra, estado: 'VALIDADO' });
    expect(r.body.presentacion.id).toBe(botellaOtra);
    expect(
      (await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean: e } })).categoria_id,
    ).toBe(otra);
    const fila = await a.prisma.bitacora.findFirst({
      where: { accion: 'codigo_barras.editado', entidad_id: e },
    });
    expect(fila!.datos_antes).toMatchObject({ categoriaId: agua });
    expect(fila!.datos_despues).toMatchObject({ categoriaId: otra });
  });

  it('un PATCH que no cambia nada no escribe bitácora', async () => {
    const e = nuevoEan();
    await sembrar(e);
    await a
      .http()
      .patch(`/api/codigos-barras/${e}`)
      .set(como(tokenAdmin))
      .send({ presentacionId: botella, porRevisar: false })
      .expect(200);
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.editado', entidad_id: e },
      }),
    ).toBeNull();
  });

  it('el PATCH cambia de presentación en la misma categoría y quita porRevisar', async () => {
    const e = nuevoEan();
    await sembrar(e, { por_revisar: true });
    const r = await a
      .http()
      .patch(`/api/codigos-barras/${e}`)
      .set(como(tokenAdmin))
      .send({ presentacionId: botellaPropuesta, porRevisar: false })
      .expect(200);
    expect(r.body).toMatchObject({ porRevisar: false, contenido: 5, categoriaId: agua });
    await a.prisma.presentacion.update({
      where: { id: botellaPropuesta },
      data: { estado: 'PROPUESTO' },
    });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.editado', entidad_id: e },
      }),
    ).not.toBeNull();
  });

  it('el PATCH con estado VALIDADO valida un PROPUESTO', async () => {
    const e = nuevoEan();
    await sembrar(e, { estado: 'PROPUESTO' });
    const r = await a
      .http()
      .patch(`/api/codigos-barras/${e}`)
      .set(como(tokenAdmin))
      .send({ estado: 'VALIDADO' })
      .expect(200);
    expect(r.body.estado).toBe('VALIDADO');
  });

  it('un contenido de pañal en categoría por unidades sale entero', async () => {
    const e = nuevoEan();
    const r = await a
      .http()
      .post('/api/codigos-barras')
      .set(como(op.token))
      .send({ ean: e, presentacionId: paquetePanal })
      .expect(201);
    expect(r.body).toMatchObject({ unidad: 'UNIDAD', contenido: 12 });
  });

  it('el Operador no lista ni edita', async () => {
    const e = nuevoEan();
    await sembrar(e);
    await a.http().get('/api/codigos-barras').set(como(op.token)).expect(403);
    await a
      .http()
      .patch(`/api/codigos-barras/${e}`)
      .set(como(op.token))
      .send({ porRevisar: false })
      .expect(403);
  });

  it('el Auditor recibe 403 en todas las rutas', async () => {
    const e = nuevoEan();
    await sembrar(e);
    const t = como(auditor.token);
    await a.http().get('/api/codigos-barras').set(t).expect(403);
    await a.http().get(`/api/codigos-barras/${e}`).set(t).expect(403);
    await a
      .http()
      .post('/api/codigos-barras')
      .set(t)
      .send({ ean: nuevoEan(), presentacionId: botella })
      .expect(403);
    await a
      .http()
      .post(`/api/codigos-barras/${e}/validar`)
      .set(t)
      .send({ presentacionId: botella })
      .expect(403);
    await a.http().patch(`/api/codigos-barras/${e}`).set(t).send({ porRevisar: false }).expect(403);
  });

  it('para otros módulos: proponer, marcar para revisar y validar en la transacción de quien llama', async () => {
    const servicio = a.app.get(CodigosBarrasService);
    const usuario = { id: op.id, rol: 'OPERADOR' } as Parameters<
      CodigosBarrasService['proponerEnTransaccion']
    >[1];
    const e = nuevoEan();
    await a.app
      .get(Transacciones)
      .ejecutar((tx) => servicio.proponerEnTransaccion(tx, usuario, e, botella));
    expect(await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean: e } })).toMatchObject({
      estado: 'PROPUESTO',
      por_revisar: false,
    });
    await a.app
      .get(Transacciones)
      .ejecutar((tx) =>
        servicio.marcarParaRevisarEnTransaccion(tx, usuario, e, 'Llegó un garrafón de 5 L'),
      );
    expect(await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean: e } })).toMatchObject({
      por_revisar: true,
    });
    const marcado = await a.prisma.bitacora.findFirst({
      where: { accion: 'codigo_barras.marcado', entidad_id: e },
    });
    expect(marcado!.datos_despues).toMatchObject({ motivo: 'Llegó un garrafón de 5 L' });
    expect(
      await a.prisma.bitacora.findFirst({
        where: { accion: 'codigo_barras.propuesto', entidad_id: e },
      }),
    ).not.toBeNull();
    await a.app
      .get(Transacciones)
      .ejecutar((tx) => servicio.validarEnTransaccion(tx, usuario, e, botella));
    expect(await a.prisma.codigoBarras.findUniqueOrThrow({ where: { ean: e } })).toMatchObject({
      estado: 'VALIDADO',
    });
  });
});
