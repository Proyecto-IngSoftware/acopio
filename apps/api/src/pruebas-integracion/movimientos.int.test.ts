import { randomUUID } from 'node:crypto';
import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** RF-INV-001, RF-INV-003, RF-INV-004 y RF-INV-011 (Bloque 2). */
describe('movimientos', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let op: { id: string; token: string };
  let auditor: { token: string };
  let arroz: string; // perecedero, en kilogramos
  let panal: string; // por unidad
  const como = (t: string) => ({ authorization: `Bearer ${t}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    op = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'OPERADOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    auditor = await crearUsuarioActivo(a, tokenAdmin, {
      rol: 'AUDITOR',
      asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
    });
    arroz = (
      await a.prisma.categoria.create({
        data: {
          nombre: unico('Arroz prueba '),
          grupo: 'ALIMENTOS',
          unidad_base: 'KILOGRAMO',
          perecedero: true,
        },
      })
    ).id;
    panal = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Pañal prueba '), grupo: 'ADULTO_MAYOR', unidad_base: 'UNIDAD' },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const entrada = (datos: Record<string, unknown>, token = op.token, acopio = ACOPIO_A) =>
    a.http().post(`/api/acopios/${acopio}/entradas`).set(como(token)).send(datos);

  describe('entradas', () => {
    it('registra la entrada, devuelve el saldo y deja la bitácora', async () => {
      const r = await entrada({ categoriaId: panal, cantidad: 24 }).expect(201);
      expect(r.body.saldo).toBe(24);
      expect(r.body.noRecibe).toBe(false);
      expect(r.body.movimiento).toMatchObject({
        tipo: 'ENTRADA',
        cantidad: 24,
        origenOffline: false,
      });
      const b = await a.prisma.bitacora.findFirst({
        where: { accion: 'movimiento.entrada', entidad_id: r.body.movimiento.id },
      });
      expect(b).not.toBeNull();
      expect(b!.ubicacion_id).toBe(ACOPIO_A);
    });

    it('un perecedero sin fecha de vencimiento: 422', async () => {
      const r = await entrada({ categoriaId: arroz, cantidad: 10 }).expect(422);
      expect(r.body.codigo).toBe('VENCIMIENTO_OBLIGATORIO');
    });

    it('un perecedero con fecha entra y guarda la fecha', async () => {
      const r = await entrada({ categoriaId: arroz, cantidad: 12.5, venceEn: '2026-12-31' }).expect(
        201,
      );
      expect(r.body.movimiento.venceEn).toBe('2026-12-31');
      expect(r.body.saldo).toBe(12.5);
    });

    it('una categoría por unidad no acepta decimales', async () => {
      const r = await entrada({ categoriaId: panal, cantidad: 2.5 }).expect(422);
      expect(r.body.codigo).toBe('CANTIDAD_ENTERA');
    });

    it('más de 3 decimales, cero o negativo: 400', async () => {
      await entrada({ categoriaId: arroz, cantidad: 0.0001, venceEn: '2026-12-31' }).expect(400);
      await entrada({ categoriaId: arroz, cantidad: 0, venceEn: '2026-12-31' }).expect(400);
      await entrada({ categoriaId: arroz, cantidad: -3, venceEn: '2026-12-31' }).expect(400);
    });

    it('el mismo id dos veces devuelve el original sin duplicar', async () => {
      const id = randomUUID();
      const datos = { id, categoriaId: panal, cantidad: 3, origenOffline: true };
      const primero = await entrada(datos).expect(201);
      const segundo = await entrada(datos).expect(200);
      expect(segundo.body.movimiento.id).toBe(id);
      expect(segundo.body.saldo).toBe(primero.body.saldo);
      expect(await a.prisma.movimiento.count({ where: { id } })).toBe(1);
    });

    it('reintento con venceEn en una categoría no perecedera: 200, no 409', async () => {
      const id = randomUUID();
      const datos = { id, categoriaId: panal, cantidad: 2, venceEn: '2026-12-01' };
      await entrada(datos).expect(201);
      const r = await entrada(datos).expect(200);
      expect(r.body.movimiento.id).toBe(id);
      expect(r.body.movimiento.venceEn).toBeNull();
    });

    it('reintento después de cerrar el acopio: 200 con el original', async () => {
      const id = randomUUID();
      const datos = { id, categoriaId: panal, cantidad: 1 };
      await entrada(datos).expect(201);
      await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'CERRADO' } });
      try {
        const r = await entrada(datos).expect(200);
        expect(r.body.movimiento.id).toBe(id);
      } finally {
        await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'ACTIVO' } });
      }
    });

    it('una cantidad diminuta (1e-10) no entra ni sale: 400', async () => {
      await entrada({ categoriaId: arroz, cantidad: 1e-10, venceEn: '2026-12-31' }).expect(400);
      await a
        .http()
        .post(`/api/acopios/${ACOPIO_A}/salidas`)
        .set(como(op.token))
        .send({ categoriaId: arroz, cantidad: 1e-10, motivoSalida: 'VENCIDO' })
        .expect(400);
    });

    it('una cantidad con ruido de punto flotante se guarda redondeada y su reintento coincide', async () => {
      const id = randomUUID();
      const datos = { id, categoriaId: arroz, cantidad: 1.0000000001, venceEn: '2026-12-31' };
      const r = await entrada(datos).expect(201);
      expect(r.body.movimiento.cantidad).toBe(1);
      await entrada(datos).expect(200);
    });

    it('el mismo id con otro contenido: 409', async () => {
      const id = randomUUID();
      await entrada({ id, categoriaId: panal, cantidad: 1 }).expect(201);
      const r = await entrada({ id, categoriaId: panal, cantidad: 2 }).expect(409);
      expect(r.body.codigo).toBe('MOVIMIENTO_DISTINTO');
    });

    it('ocurridoEn guarda la hora real y marca el origen sin conexión', async () => {
      const hace = new Date(Date.now() - 3 * 3600_000).toISOString();
      const r = await entrada({
        categoriaId: panal,
        cantidad: 1,
        ocurridoEn: hace,
        origenOffline: true,
      }).expect(201);
      expect(r.body.movimiento.ocurridoEn).toBe(hace);
      expect(r.body.movimiento.origenOffline).toBe(true);
    });

    it('ocurridoEn de hace 8 días o del futuro: 422', async () => {
      const viejo = new Date(Date.now() - 8 * 86400_000).toISOString();
      const futuro = new Date(Date.now() + 10 * 60_000).toISOString();
      for (const ocurridoEn of [viejo, futuro]) {
        const r = await entrada({ categoriaId: panal, cantidad: 1, ocurridoEn }).expect(422);
        expect(r.body.codigo).toBe('FECHA_FUERA_DE_RANGO');
      }
    });

    it('una categoría que no se recibe entra igual y lo avisa', async () => {
      await a
        .http()
        .put(`/api/acopios/${ACOPIO_A}/no-recibir/${panal}`)
        .set(como(op.token))
        .send({})
        .expect(200);
      const r = await entrada({ categoriaId: panal, cantidad: 1 }).expect(201);
      expect(r.body.noRecibe).toBe(true);
      await a
        .http()
        .delete(`/api/acopios/${ACOPIO_A}/no-recibir/${panal}`)
        .set(como(op.token))
        .expect(204);
    });

    it('acopio ajeno: 403; Auditor y Administrador: 403', async () => {
      await entrada({ categoriaId: panal, cantidad: 1 }, op.token, ACOPIO_B).expect(403);
      await entrada({ categoriaId: panal, cantidad: 1 }, auditor.token).expect(403);
      await entrada({ categoriaId: panal, cantidad: 1 }, tokenAdmin).expect(403);
    });

    it('categoría archivada: 422', async () => {
      const archivada = await a.prisma.categoria.create({
        data: {
          nombre: unico('Archivada inv '),
          grupo: 'HERRAMIENTAS',
          unidad_base: 'UNIDAD',
          archivada: true,
        },
      });
      const r = await entrada({ categoriaId: archivada.id, cantidad: 1 }).expect(422);
      expect(r.body.codigo).toBe('CATEGORIA_ARCHIVADA');
    });
  });

  const salida = (datos: Record<string, unknown>, token = op.token) =>
    a.http().post(`/api/acopios/${ACOPIO_A}/salidas`).set(como(token)).send(datos);
  const ajuste = (datos: Record<string, unknown>) =>
    a.http().post(`/api/acopios/${ACOPIO_A}/ajustes`).set(como(op.token)).send(datos);

  describe('salidas', () => {
    let agua: string;
    beforeAll(async () => {
      agua = (
        await a.prisma.categoria.create({
          data: { nombre: unico('Agua prueba '), grupo: 'AGUA_Y_BEBIDAS', unidad_base: 'LITRO' },
        })
      ).id;
    });

    it('la primera operación es una salida: 409 con saldo 0', async () => {
      const r = await salida({
        categoriaId: agua,
        cantidad: 1,
        motivoSalida: 'ENTREGA_FAMILIAS',
      }).expect(409);
      expect(r.body.codigo).toBe('SALDO_INSUFICIENTE');
      expect(r.body.detalles).toEqual({ saldo: 0 });
    });

    it('descuenta y deja la bitácora', async () => {
      await entrada({ categoriaId: agua, cantidad: 100 }).expect(201);
      const r = await salida({
        categoriaId: agua,
        cantidad: 40,
        motivoSalida: 'ENTREGA_FAMILIAS',
      }).expect(201);
      expect(r.body.saldo).toBe(60);
      expect(r.body.movimiento).toMatchObject({
        tipo: 'SALIDA',
        signo: -1,
        motivoSalida: 'ENTREGA_FAMILIAS',
      });
      expect(
        await a.prisma.bitacora.findFirst({
          where: { accion: 'movimiento.salida', entidad_id: r.body.movimiento.id },
        }),
      ).not.toBeNull();
    });

    it('más que el saldo: 409 con el saldo disponible, y no cambia nada', async () => {
      const r = await salida({ categoriaId: agua, cantidad: 61, motivoSalida: 'VENCIDO' }).expect(
        409,
      );
      expect(r.body.detalles).toEqual({ saldo: 60 });
      const s = await a.prisma.saldo.findUniqueOrThrow({
        where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: agua } },
      });
      expect(Number(s.cantidad)).toBe(60);
    });

    it('Traslado y Otro piden nota', async () => {
      const r = await salida({ categoriaId: agua, cantidad: 1, motivoSalida: 'TRASLADO' }).expect(
        422,
      );
      expect(r.body.codigo).toBe('NOTA_OBLIGATORIA');
      await salida({ categoriaId: agua, cantidad: 1, motivoSalida: 'OTRO', nota: '  ' }).expect(
        422,
      );
      await salida({
        categoriaId: agua,
        cantidad: 1,
        motivoSalida: 'TRASLADO',
        nota: 'A Cruz Roja Kennedy',
      }).expect(201);
    });

    it('motivo desconocido: 400', async () => {
      await salida({ categoriaId: agua, cantidad: 1, motivoSalida: 'REGALO' }).expect(400);
    });
  });

  describe('ajustes', () => {
    let jabon: string;
    beforeAll(async () => {
      jabon = (
        await a.prisma.categoria.create({
          data: { nombre: unico('Jabón prueba '), grupo: 'ASEO_PERSONAL', unidad_base: 'UNIDAD' },
        })
      ).id;
    });

    it('sin saldo y contando 0: 422 SIN_DIFERENCIA, sin movimiento', async () => {
      const r = await ajuste({
        categoriaId: jabon,
        cantidadContada: 0,
        motivo: 'Conteo de inicio de jornada',
      }).expect(422);
      expect(r.body.codigo).toBe('SIN_DIFERENCIA');
      expect(await a.prisma.movimiento.count({ where: { categoria_id: jabon } })).toBe(0);
    });

    it('contar de más registra un ajuste al alza, destacado en la bitácora', async () => {
      await entrada({ categoriaId: jabon, cantidad: 10 }).expect(201);
      const r = await ajuste({
        categoriaId: jabon,
        cantidadContada: 12,
        motivo: 'Aparecieron dos en otra caja',
      }).expect(201);
      expect(r.body.movimiento).toMatchObject({ tipo: 'AJUSTE', signo: 1, cantidad: 2 });
      expect(r.body.saldo).toBe(12);
      const b = await a.prisma.bitacora.findFirstOrThrow({
        where: { accion: 'movimiento.ajuste', entidad_id: r.body.movimiento.id },
      });
      expect(b.destacado).toBe(true);
    });

    it('contar de menos registra un ajuste a la baja', async () => {
      const r = await ajuste({
        categoriaId: jabon,
        cantidadContada: 9,
        motivo: 'Tres se mojaron en la bodega',
      }).expect(201);
      expect(r.body.movimiento).toMatchObject({ signo: -1, cantidad: 3 });
      expect(r.body.saldo).toBe(9);
    });

    it('motivo de menos de 10 caracteres: 400', async () => {
      await ajuste({ categoriaId: jabon, cantidadContada: 1, motivo: 'corto' }).expect(400);
    });

    it('contada negativa o con decimales en una por unidad: 400 y 422', async () => {
      await ajuste({
        categoriaId: jabon,
        cantidadContada: -1,
        motivo: 'Conteo de inicio de jornada',
      }).expect(400);
      const r = await ajuste({
        categoriaId: jabon,
        cantidadContada: 1.5,
        motivo: 'Conteo de inicio de jornada',
      }).expect(422);
      expect(r.body.codigo).toBe('CANTIDAD_ENTERA');
    });
  });

  describe('acopio cerrado', () => {
    it('no admite entradas, salidas ni ajustes: 409', async () => {
      const cat = (
        await a.prisma.categoria.create({
          data: { nombre: unico('Cierre prueba '), grupo: 'HERRAMIENTAS', unidad_base: 'UNIDAD' },
        })
      ).id;
      await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'CERRADO' } });
      try {
        const r = await entrada({ categoriaId: cat, cantidad: 1 }).expect(409);
        expect(r.body.codigo).toBe('ACOPIO_CERRADO');
        await salida({ categoriaId: cat, cantidad: 1, motivoSalida: 'VENCIDO' }).expect(409);
        await ajuste({
          categoriaId: cat,
          cantidadContada: 1,
          motivo: 'Conteo de cierre del acopio',
        }).expect(409);
      } finally {
        await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'ACTIVO' } });
      }
    });

    it('un acopio pausado sí registra', async () => {
      const cat = (
        await a.prisma.categoria.create({
          data: { nombre: unico('Pausa prueba '), grupo: 'HERRAMIENTAS', unidad_base: 'UNIDAD' },
        })
      ).id;
      await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'PAUSADO' } });
      try {
        await entrada({ categoriaId: cat, cantidad: 1 }).expect(201);
      } finally {
        await a.prisma.acopio.update({ where: { id: ACOPIO_A }, data: { estado: 'ACTIVO' } });
      }
    });
  });
});
