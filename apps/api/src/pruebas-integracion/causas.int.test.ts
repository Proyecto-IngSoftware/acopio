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
import { CausasService } from '../modulos/acopios/causas.service';
import { sembrarCausasDemo } from '../seed/demo';

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

  /** Una entidad verificada con sitio `https://www.fundacion.org`. */
  async function entidadVerificada() {
    const id = await crearEntidad();
    await verificar(id).expect(200);
    return id;
  }

  const datosCausa = (entidadId: string, extra: object = {}) => ({
    entidadId,
    categoria: 'PERSONAS',
    titulo: 'Mercados para familias damnificadas',
    descripcion: 'Alimentos no perecederos y elementos de aseo para 300 familias',
    pasos: ['Entra al sitio oficial', 'Elige «Donar»'],
    urlOficial: 'https://www.fundacion.org/donar',
    cierraEl: '2026-12-01',
    confirmo: true,
    ...extra,
  });

  const crearCausa = (entidadId: string, extra: object = {}) =>
    a.http().post('/api/causas').set(como(admin)).send(datosCausa(entidadId, extra));

  const accion = (id: string, que: string, cuerpo: object = {}) =>
    a.http().post(`/api/causas/${id}/${que}`).set(como(admin)).send(cuerpo);

  describe('gestionar causas (RF-RED-007, RF-RED-010)', () => {
    it('una entidad sin verificar no publica causas', async () => {
      const id = await crearEntidad();
      const r = await crearCausa(id).expect(409);
      expect(r.body.codigo).toBe('ENTIDAD_SIN_VERIFICAR');
    });

    it('publicar pide confirmar el aviso', async () => {
      const id = await entidadVerificada();
      const r = await crearCausa(id, { confirmo: undefined }).expect(422);
      expect(r.body.codigo).toBe('CONFIRMACION_REQUERIDA');
    });

    it.each(['https://u:c@fundacion.org/donar', 'http://fundacion.org', 'javascript:alert(1)'])(
      'rechaza el enlace %s',
      async (urlOficial) => {
        const id = await entidadVerificada();
        const r = await crearCausa(id, { urlOficial });
        expect([400, 422]).toContain(r.status);
        if (r.status === 422) expect(r.body.codigo).toBe('URL_NO_SEGURA');
      },
    );

    it('la fecha de cierre va de hoy a seis meses', async () => {
      const id = await entidadVerificada();
      const tarde = await crearCausa(id, { cierraEl: '2027-04-18' }).expect(422);
      expect(tarde.body.codigo).toBe('CIERRE_FUERA_DE_RANGO');
      await crearCausa(id, { cierraEl: '2026-10-16' }).expect(422);
      const r = await crearCausa(id, { cierraEl: '2027-04-17' }).expect(201);
      expect(r.body).toMatchObject({
        estado: 'ACTIVA',
        cierraEl: '2027-04-17',
        dominio: 'fundacion.org',
        dominioDistinto: false,
      });
    });

    it('personas desaparecidas no admite causas', async () => {
      const id = await entidadVerificada();
      await crearCausa(id, { categoria: 'PERSONAS_DESAPARECIDAS' }).expect(400);
    });

    it('renovar mueve la fecha de publicación y editar no', async () => {
      const id = await entidadVerificada();
      const creada = (await crearCausa(id).expect(201)).body;
      const editada = (
        await a
          .http()
          .patch(`/api/causas/${creada.id}`)
          .set(como(admin))
          .send({ titulo: 'Mercados para familias de Mocoa' })
          .expect(200)
      ).body;
      expect(editada.publicadaEn).toBe(creada.publicadaEn);
      await a.prisma.causa.update({
        where: { id: creada.id },
        data: { publicada_en: new Date('2026-10-01T00:00:00Z') },
      });
      await accion(creada.id, 'renovar', { cierraEl: '2026-10-16', confirmo: true }).expect(422);
      const renovada = (
        await accion(creada.id, 'renovar', { cierraEl: '2027-03-01', confirmo: true }).expect(200)
      ).body;
      expect(renovada.publicadaEn).toBe(new Date(AHORA).toISOString());
      expect(renovada.cierraEl).toBe('2027-03-01');
    });

    it('editar el título mandando el mismo enlace y la misma entidad no pide confirmar', async () => {
      const id = await entidadVerificada();
      const creada = (await crearCausa(id).expect(201)).body;
      const r = await a
        .http()
        .patch(`/api/causas/${creada.id}`)
        .set(como(admin))
        .send({
          entidadId: id,
          urlOficial: 'https://www.fundacion.org/donar',
          titulo: 'Mercados para familias de Mocoa',
        })
        .expect(200);
      expect(r.body.titulo).toBe('Mercados para familias de Mocoa');
    });

    it('cambiar el enlace al editar pide confirmar', async () => {
      const id = await entidadVerificada();
      const creada = (await crearCausa(id).expect(201)).body;
      const r = await a
        .http()
        .patch(`/api/causas/${creada.id}`)
        .set(como(admin))
        .send({ urlOficial: 'https://www.fundacion.org/otra' })
        .expect(422);
      expect(r.body.codigo).toBe('CONFIRMACION_REQUERIDA');
    });

    it('una causa atendida no se edita, y se reactiva solo con la entidad verificada', async () => {
      const id = await entidadVerificada();
      const creada = (await crearCausa(id).expect(201)).body;
      const archivada = (await accion(creada.id, 'archivar').expect(200)).body;
      expect(archivada).toMatchObject({ estado: 'ATENDIDA', motivo: 'MANUAL' });
      const r = await a
        .http()
        .patch(`/api/causas/${creada.id}`)
        .set(como(admin))
        .send({ titulo: 'Otro título para la causa' })
        .expect(409);
      expect(r.body.codigo).toBe('CAUSA_ATENDIDA');
      await a.http().post(`/api/entidades/${id}/quitar-verificacion`).set(como(admin)).expect(200);
      const sin = await accion(creada.id, 'reactivar', { cierraEl: '2027-01-01', confirmo: true });
      expect(sin.status).toBe(409);
      expect(sin.body.codigo).toBe('ENTIDAD_SIN_VERIFICAR');
      await verificar(id).expect(200);
      const reactivada = (
        await accion(creada.id, 'reactivar', { cierraEl: '2027-01-01', confirmo: true }).expect(200)
      ).body;
      expect(reactivada).toMatchObject({ estado: 'ACTIVA', motivo: null });
    });

    it('por cerrar son las que cierran en los próximos 15 días', async () => {
      const id = await entidadVerificada();
      const pronto = (await crearCausa(id, { cierraEl: '2026-11-01' }).expect(201)).body;
      const luego = (await crearCausa(id, { cierraEl: '2026-11-02' }).expect(201)).body;
      const r = await a.http().get('/api/causas/gestion?estado=por-cerrar').set(como(admin));
      const ids = (r.body as { id: string }[]).map((c) => c.id);
      expect(ids).toContain(pronto.id);
      expect(ids).not.toContain(luego.id);
      const activas = await a.http().get('/api/causas/gestion?estado=activas').set(como(admin));
      const fila = (activas.body as { id: string; porCerrar: boolean }[]).find(
        (c) => c.id === pronto.id,
      );
      expect(fila?.porCerrar).toBe(true);
    });

    it('un enlace a otro dominio que el de la entidad queda marcado', async () => {
      const id = await entidadVerificada();
      const r = await crearCausa(id, { urlOficial: 'https://donaciones-mocoa.co/x' }).expect(201);
      expect(r.body.dominioDistinto).toBe(true);
    });

    it('cada operación deja su fila en la bitácora', async () => {
      const id = await entidadVerificada();
      const c = (await crearCausa(id).expect(201)).body;
      await accion(c.id, 'renovar', { cierraEl: '2027-02-01', confirmo: true }).expect(200);
      await accion(c.id, 'archivar').expect(200);
      await accion(c.id, 'reactivar', { cierraEl: '2027-02-01', confirmo: true }).expect(200);
      const filas = await a.prisma.bitacora.findMany({
        where: { entidad: 'causa', entidad_id: c.id },
        orderBy: { ocurrido_en: 'asc' },
      });
      expect(filas.map((f) => f.accion)).toEqual([
        'causa.creada',
        'causa.renovada',
        'causa.archivada',
        'causa.reactivada',
      ]);
    });

    it('la imagen se sube y se cambia', async () => {
      const id = await entidadVerificada();
      const c = (await crearCausa(id).expect(201)).body;
      const png = await sharp({
        create: { width: 800, height: 450, channels: 3, background: '#888' },
      })
        .png()
        .toBuffer();
      const r = await a
        .http()
        .put(`/api/causas/${c.id}/imagen`)
        .set(como(admin))
        .attach('imagen', png, 'causa.png')
        .expect(200);
      expect(r.body.tieneImagen).toBe(true);
      await a.http().delete(`/api/causas/${c.id}/imagen`).set(como(admin)).expect(200);
    });

    it('un Operador no gestiona causas', async () => {
      const operador = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
      await a
        .http()
        .get('/api/causas/gestion?estado=activas')
        .set(como(operador.token))
        .expect(403);
    });
  });

  describe('lo público (RF-RED-008, HU-02)', () => {
    it('una causa vencida no sale aunque la tarea diaria no haya corrido', async () => {
      const id = await entidadVerificada();
      const vencida = await insertarCausa(id, '2026-10-16');
      const activas = (await a.http().get('/api/causas').expect(200)).body as { id: string }[];
      expect(activas.map((c) => c.id)).not.toContain(vencida.id);
      const atendidas = (await a.http().get('/api/causas/atendidas').expect(200)).body as {
        id: string;
        cerroEl: string;
      }[];
      expect(atendidas.find((c) => c.id === vencida.id)?.cerroEl).toBe('2026-10-17');
      const servicio = a.app.get(CausasService);
      expect(await servicio.archivarVencidas()).toBeGreaterThanOrEqual(1);
      const fila = await a.prisma.causa.findUniqueOrThrow({ where: { id: vencida.id } });
      expect(fila.archivo_motivo).toBe('VENCIDA');
      expect(fila.archivada_por).toBeNull();
      const b = await a.prisma.bitacora.findFirstOrThrow({
        where: { accion: 'causa.archivada', entidad_id: vencida.id },
      });
      expect(b.usuario_id).toBeNull();
    });

    it('lo más reciente sale primero', async () => {
      const id = await entidadVerificada();
      const vieja = (await crearCausa(id).expect(201)).body;
      await a.prisma.causa.update({
        where: { id: vieja.id },
        data: { publicada_en: new Date('2026-09-01T00:00:00Z') },
      });
      const nueva = (await crearCausa(id).expect(201)).body;
      const ids = ((await a.http().get('/api/causas').expect(200)).body as { id: string }[]).map(
        (c) => c.id,
      );
      expect(ids.indexOf(nueva.id)).toBeLessThan(ids.indexOf(vieja.id));
    });

    it('filtra por categoría', async () => {
      const id = await entidadVerificada();
      const gatos = (await crearCausa(id, { categoria: 'ANIMALES' }).expect(201)).body;
      const r = await a.http().get('/api/causas?categoria=ANIMALES').expect(200);
      const filas = r.body as { id: string; categoria: string }[];
      expect(filas.map((c) => c.id)).toContain(gatos.id);
      expect(filas.every((c) => c.categoria === 'ANIMALES')).toBe(true);
    });

    it('si la entidad perdió la verificación, la ficha no trae sello ni enlace', async () => {
      const id = await entidadVerificada();
      const c = (await crearCausa(id).expect(201)).body;
      const antes = (await a.http().get(`/api/causas/${c.id}`).expect(200)).body;
      expect(antes.urlOficial).toBe('https://www.fundacion.org/donar');
      expect(antes.entidad.verificadaEn).toBe(new Date(AHORA).toISOString());
      await a.http().post(`/api/entidades/${id}/quitar-verificacion`).set(como(admin)).expect(200);
      const despues = (await a.http().get(`/api/causas/${c.id}`).expect(200)).body;
      expect(despues).toMatchObject({
        urlOficial: null,
        dominio: null,
        motivo: 'ENTIDAD_SIN_VERIFICAR',
        cerroEl: '2026-10-17',
      });
      expect(despues.entidad.verificadaEn).toBeNull();
    });

    it('lo público nunca dice quién creó o archivó la causa', async () => {
      const id = await entidadVerificada();
      const c = (await crearCausa(id).expect(201)).body;
      await accion(c.id, 'archivar').expect(200);
      for (const ruta of ['/api/causas', '/api/causas/atendidas', `/api/causas/${c.id}`]) {
        const texto = JSON.stringify((await a.http().get(ruta).expect(200)).body);
        expect(texto).not.toContain('creadaPor');
        expect(texto).not.toContain('archivadaPor');
        expect(texto).not.toContain(adminId);
      }
    });

    it('un id que no existe da 404', async () => {
      await a.http().get('/api/causas/00000000-0000-4000-8000-000000000000').expect(404);
    });

    it('la imagen se lee sin sesión', async () => {
      const id = await entidadVerificada();
      const c = (await crearCausa(id).expect(201)).body;
      await a.http().get(`/api/causas/${c.id}/imagen`).expect(404);
      const png = await sharp({
        create: { width: 320, height: 180, channels: 3, background: '#777' },
      })
        .png()
        .toBuffer();
      await a
        .http()
        .put(`/api/causas/${c.id}/imagen`)
        .set(como(admin))
        .attach('imagen', png, 'c.png')
        .expect(200);
      const r = await a.http().get(`/api/causas/${c.id}/imagen`).expect(200);
      expect(r.headers['content-type']).toMatch(/image\/webp/);
    });
  });

  describe('demo (seed:demo)', () => {
    it('crea dos entidades verificadas con causas «(demo)», sin duplicar', async () => {
      await sembrarCausasDemo(a.prisma, adminId, new Date(AHORA));
      await sembrarCausasDemo(a.prisma, adminId, new Date(AHORA));
      const entidades = await a.prisma.entidad.findMany({
        where: { nombre: { in: ['Cruz Roja Colombiana', 'UNICEF Colombia'] } },
      });
      expect(entidades.map((e) => e.verificacion)).toEqual(['VERIFICADA', 'VERIFICADA']);
      const demo = await a.prisma.causa.findMany({ where: { titulo: { endsWith: '(demo)' } } });
      expect(demo).toHaveLength(4);
      expect(demo.filter((c) => c.archivo_motivo === 'VENCIDA')).toHaveLength(1);
      const publicas = (
        (await a.http().get('/api/causas').expect(200)).body as {
          titulo: string;
        }[]
      ).filter((c) => c.titulo.endsWith('(demo)'));
      expect(publicas).toHaveLength(3);
      for (const c of demo)
        expect(['cruzrojacolombiana.org', 'unicef.org']).toContain(
          new URL(c.url_oficial).hostname.replace(/^www\./, ''),
        );
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
