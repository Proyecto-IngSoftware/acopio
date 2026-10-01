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
});
