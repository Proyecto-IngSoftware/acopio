import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-CAT-006: los pesos del motor. */
describe('configuración del motor', () => {
  let a: AppPrueba;
  let token: string;
  const como = (t: string) => ({ authorization: `Bearer ${t}` });
  const POR_DEFECTO = { criticidad: 0.45, urgencia: 0.25, proximidad: 0.15, magnitud: 0.15 };

  beforeAll(async () => {
    a = await crearAppPrueba();
    token = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(async () => {
    // La base es compartida: las demás suites cuentan con los valores por defecto
    await a
      .http()
      .put('/api/motor/configuracion')
      .set(como(token))
      .send({ pesos: POR_DEFECTO, cantidadMinima: 5 });
    await a.cerrar();
  });

  it('lee los valores del seed', async () => {
    const r = await a.http().get('/api/motor/configuracion').set(como(token)).expect(200);
    expect(r.body).toMatchObject({ pesos: POR_DEFECTO, cantidadMinima: 5 });
  });

  it('guarda pesos que suman 1 con tolerancia, con bitácora', async () => {
    const pesos = { criticidad: 0.4995, urgencia: 0.25, proximidad: 0.15, magnitud: 0.1 };
    const r = await a
      .http()
      .put('/api/motor/configuracion')
      .set(como(token))
      .send({ pesos, cantidadMinima: 2 })
      .expect(200);
    expect(r.body).toMatchObject({ pesos, cantidadMinima: 2, actualizadoPor: expect.any(String) });
    expect(
      await a.prisma.bitacora.findFirst({ where: { accion: 'motor.configuracion' } }),
    ).not.toBeNull();
  });

  it('rechaza pesos que no suman 1', async () => {
    const r = await a
      .http()
      .put('/api/motor/configuracion')
      .set(como(token))
      .send({ pesos: { ...POR_DEFECTO, criticidad: 0.43 }, cantidadMinima: 5 })
      .expect(422);
    expect(r.body.codigo).toBe('PESOS_NO_SUMAN_UNO');
  });

  it('la vista previa devuelve los dos rankings y no guarda nada', async () => {
    const antes = await a.prisma.configuracionMotor.findUniqueOrThrow({ where: { id: 1 } });
    const r = await a
      .http()
      .post('/api/motor/configuracion/vista-previa')
      .set(como(token))
      .send({
        pesos: { criticidad: 0.1, urgencia: 0.1, proximidad: 0.7, magnitud: 0.1 },
        cantidadMinima: 5,
      })
      .expect(200);
    expect(r.body).toEqual({ actual: expect.any(Array), propuesta: expect.any(Array) });
    const despues = await a.prisma.configuracionMotor.findUniqueOrThrow({ where: { id: 1 } });
    expect(despues.actualizado_en).toEqual(antes.actualizado_en);
  });

  it('solo el Administrador', async () => {
    const op = await crearUsuarioActivo(a, token, { rol: 'OPERADOR' });
    await a.http().get('/api/motor/configuracion').set(como(op.token)).expect(403);
  });
});
