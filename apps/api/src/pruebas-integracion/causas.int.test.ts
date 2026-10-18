import sharp from 'sharp';
import { Client } from 'pg';
import { URL_APP_PRUEBAS, URL_DUENO_PRUEBAS } from '../../test/entorno-pruebas';
import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Hoy, para toda la suite: 17 de octubre de 2026 en Bogotá. */
const AHORA = Date.parse('2026-10-17T15:00:00Z');

/** Pieza C: verificación de entidades y causas (RF-RED-006 a 010, HU-02, HU-15). */
describe('causas', () => {
  let a: AppPrueba;
  let admin: string;
  let adminId: string;
  const app = new Client({ connectionString: URL_APP_PRUEBAS });
  const dueno = new Client({ connectionString: URL_DUENO_PRUEBAS });

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: AHORA });
    await Promise.all([app.connect(), dueno.connect()]);
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
  });
  afterAll(async () => {
    await Promise.all([app.end(), dueno.end()]);
    await a.cerrar();
  });

  const como = (token: string) => ({ authorization: `Bearer ${token}` });

  async function crearEntidad(sitioWeb: string | null = 'https://www.fundacion.org') {
    const r = await a
      .http()
      .post('/api/entidades')
      .set(como(admin))
      .send({ nombre: unico('Fundación '), tipo: 'Fundación', sitioWeb })
      .expect(201);
    return r.body.id as string;
  }

  const verificar = (id: string, cuerpo: object = { confirmo: true }) =>
    a.http().post(`/api/entidades/${id}/verificar`).set(como(admin)).send(cuerpo);

  /** Una causa activa insertada directo, para no depender todavía de la API de causas. */
  const insertarCausa = (entidadId: string, cierra = '2026-12-01') =>
    a.prisma.causa.create({
      data: {
        entidad_id: entidadId,
        categoria: 'PERSONAS',
        titulo: 'Mercados para familias',
        descripcion: 'Alimentos no perecederos para familias damnificadas',
        pasos: ['Entra al sitio oficial'],
        url_oficial: 'https://www.fundacion.org/donar',
        cierra_el: new Date(`${cierra}T00:00:00Z`),
        creada_por: adminId,
      },
    });

  describe('lo que hace cumplir la base', () => {
    it('acopio_app no borra ni trunca causas', async () => {
      await expect(app.query(`DELETE FROM causa WHERE false`)).rejects.toThrow(/permission denied/);
      await expect(app.query(`TRUNCATE causa`)).rejects.toThrow(/permission denied/);
    });

    it('una entidad verificada tiene fecha de verificación', async () => {
      const e = await a.prisma.entidad.create({
        data: { nombre: unico('Entidad check'), tipo: 'Fundación' },
      });
      await expect(
        dueno.query(`UPDATE entidad SET verificacion = 'VERIFICADA' WHERE id = $1`, [e.id]),
      ).rejects.toThrow(/check/i);
    });
  });

  describe('verificar una entidad (RF-RED-006, HU-15)', () => {
    it('sin confirmar el aviso no deja verificar', async () => {
      const id = await crearEntidad();
      const r = await verificar(id, {}).expect(422);
      expect(r.body.codigo).toBe('CONFIRMACION_REQUERIDA');
      await verificar(id, { confirmo: false }).expect(422);
    });

    it('una entidad sin sitio web no se puede verificar', async () => {
      const id = await crearEntidad(null);
      const r = await verificar(id).expect(422);
      expect(r.body.codigo).toBe('ENTIDAD_SIN_SITIO');
    });

    it('verificar guarda quién y cuándo, y deja la confirmación en la bitácora', async () => {
      const id = await crearEntidad();
      const r = await verificar(id).expect(200);
      expect(r.body.verificacion).toBe('VERIFICADA');
      expect(r.body.verificadaEn).toBe(new Date(AHORA).toISOString());
      const fila = await a.prisma.entidad.findUniqueOrThrow({ where: { id } });
      expect(fila.verificada_por).toBe(adminId);
      const b = await a.prisma.bitacora.findFirstOrThrow({
        where: { accion: 'entidad.verificada', entidad_id: id },
      });
      expect(b.usuario_id).toBe(adminId);
      expect(b.datos_despues).toMatchObject({ verificacion: 'VERIFICADA', confirmo: true });
    });

    it('solo el Administrador verifica', async () => {
      const id = await crearEntidad();
      const operador = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
      await a
        .http()
        .post(`/api/entidades/${id}/verificar`)
        .set(como(operador.token))
        .send({ confirmo: true })
        .expect(403);
    });

    it('quitar la verificación archiva sus causas activas', async () => {
      const id = await crearEntidad();
      await verificar(id).expect(200);
      const [c1, c2] = [await insertarCausa(id), await insertarCausa(id)];
      const r = await a
        .http()
        .post(`/api/entidades/${id}/quitar-verificacion`)
        .set(como(admin))
        .expect(200);
      expect(r.body).toEqual({ archivadas: 2 });
      const filas = await a.prisma.causa.findMany({ where: { id: { in: [c1.id, c2.id] } } });
      for (const c of filas) {
        expect(c.archivo_motivo).toBe('ENTIDAD_SIN_VERIFICAR');
        expect(c.archivada_por).toBe(adminId);
      }
      const e = await a.prisma.entidad.findUniqueOrThrow({ where: { id } });
      expect(e.verificacion).toBe('SIN_VERIFICAR');
      expect(e.verificada_en).toBeNull();
      expect(
        await a.prisma.bitacora.count({
          where: { accion: 'causa.archivada', entidad_id: { in: [c1.id, c2.id] } },
        }),
      ).toBe(2);
    });

    it('la lista de entidades trae la verificación, el logotipo y las causas activas', async () => {
      const id = await crearEntidad();
      await verificar(id).expect(200);
      await insertarCausa(id);
      const r = await a.http().get('/api/entidades').set(como(admin)).expect(200);
      const fila = (r.body as { id: string }[]).find((e) => e.id === id);
      expect(fila).toMatchObject({
        verificadaEn: new Date(AHORA).toISOString(),
        tieneLogo: false,
        causasActivas: 1,
      });
    });
  });

  describe('logotipo', () => {
    it('se sube como Administrador y se lee sin sesión', async () => {
      const id = await crearEntidad();
      const jpeg = await sharp({
        create: { width: 400, height: 400, channels: 3, background: '#ccc' },
      })
        .jpeg()
        .toBuffer();
      await a
        .http()
        .put(`/api/entidades/${id}/logo`)
        .set(como(admin))
        .attach('logo', jpeg, 'logo.jpg')
        .expect(200);
      const r = await a.http().get(`/api/entidades/${id}/logo`).expect(200);
      expect(r.headers['content-type']).toMatch(/image\/webp/);
      expect(r.headers['cache-control']).toBe('public, max-age=300');
      await a.http().delete(`/api/entidades/${id}/logo`).set(como(admin)).expect(200);
      await a.http().get(`/api/entidades/${id}/logo`).expect(404);
    });
  });
});
