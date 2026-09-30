import {
  ACOPIO_A,
  ACOPIO_B,
  ZONA_A,
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import { AlcanceService } from '../modulos/identidad/autenticacion/alcance.service';

/** T07 y T08: usuarios, invitaciones, asignaciones y gobierno (RF-IDE-001 a 010). */
describe('usuarios y accesos', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  let idAdmin: string;
  const comoAdmin = () => ({ authorization: `Bearer ${tokenAdmin}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    idAdmin = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: 'admin' } })).id;
  });
  afterAll(() => a.cerrar());

  describe('crear e invitar (RF-IDE-001, 002)', () => {
    it('nace INVITADO, con enlace, y el token en claro no se guarda', async () => {
      const username = unico('ana');
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({
          username,
          nombre: 'Ana',
          rol: 'OPERADOR',
          correo: `${username}@acopio.test`,
          asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
        })
        .expect(201);
      expect(r.body.usuario).toMatchObject({
        estado: 'INVITADO',
        invitacionPendiente: { venceEn: expect.any(String) },
      });
      const token = (r.body.invitacion.enlace as string).split('/').pop()!;
      expect(token.length).toBeGreaterThanOrEqual(43);
      const invitacion = await a.prisma.invitacion.findFirstOrThrow({
        where: { usuario_id: r.body.usuario.id },
      });
      expect(Buffer.from(invitacion.token_hash).toString('base64url')).not.toBe(token);
      expect(invitacion.expira_en.getTime() - invitacion.creada_en.getTime()).toBeCloseTo(
        7 * 24 * 3600 * 1000,
        -4,
      );
      // El correo de invitación queda en la cola
      const correo = await a.prisma.correoSaliente.findFirstOrThrow({
        where: { destinatario: `${username}@acopio.test` },
      });
      expect(correo.cuerpo_texto).toContain(token);
    });

    it('sin correo genera uno sintético y no encola correo', async () => {
      const username = unico('sin');
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({
          username,
          nombre: 'Sin correo',
          rol: 'RECEPTOR',
          asignaciones: [{ tipo: 'ZONA', ubicacionId: ZONA_A }],
        })
        .expect(201);
      expect(r.body.usuario).toMatchObject({ correo: null, sinCorreoReal: true });
      const fila = await a.prisma.usuario.findUniqueOrThrow({ where: { id: r.body.usuario.id } });
      expect(fila.correo).toBe(`${username.toLowerCase()}@usuarios.acopio.local`);
    });

    it('un operador necesita al menos una ubicación', async () => {
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({ username: unico('op'), nombre: 'X', rol: 'OPERADOR' })
        .expect(422);
      expect(r.body.codigo).toBe('ASIGNACION_REQUERIDA');
    });

    it('el nombre de usuario es único sin distinguir mayúsculas', async () => {
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({ username: 'ADMIN', nombre: 'X', rol: 'ADMIN' })
        .expect(409);
      expect(r.body.mensaje).toBe('Ese nombre de usuario ya existe');
    });

    it('no se crea un Donador desde la consola', async () => {
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({ username: unico('d'), nombre: 'X', rol: 'DONADOR' })
        .expect(400);
      expect(r.body.detalles[0].campo).toBe('rol');
    });

    it('solo el Administrador crea usuarios', async () => {
      const aud = await crearUsuarioActivo(a, tokenAdmin, { rol: 'AUDITOR' });
      await a
        .http()
        .post('/api/usuarios')
        .set('authorization', `Bearer ${aud.token}`)
        .send({ username: unico('x'), nombre: 'X', rol: 'ADMIN' })
        .expect(403);
      // El Auditor sí consulta
      await a.http().get('/api/usuarios').set('authorization', `Bearer ${aud.token}`).expect(200);
    });

    it('reinvitar revoca el enlace anterior', async () => {
      const username = unico('re');
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({ username, nombre: 'Re', rol: 'ADMIN' })
        .expect(201);
      const viejo = (r.body.invitacion.enlace as string).split('/').pop();
      const nuevo = await a
        .http()
        .post(`/api/usuarios/${r.body.usuario.id}/invitacion`)
        .set(comoAdmin())
        .expect(201);
      await a.http().get(`/api/invitaciones/${viejo}`).expect(404);
      await a
        .http()
        .get(`/api/invitaciones/${(nuevo.body.enlace as string).split('/').pop()}`)
        .expect(200);
    });
  });

  describe('ubicaciones reales (B-05)', () => {
    it('asignar una ubicación que no existe da 422 UBICACION_INEXISTENTE', async () => {
      const r = await a
        .http()
        .post('/api/usuarios')
        .set(comoAdmin())
        .send({
          username: unico('fantasma'),
          nombre: 'Sin acopio real',
          rol: 'OPERADOR',
          asignaciones: [{ tipo: 'ACOPIO', ubicacionId: '99999999-9999-4999-8999-999999999999' }],
        })
        .expect(422);
      expect(r.body.codigo).toBe('UBICACION_INEXISTENTE');
    });

    it('el correo de asignación nombra el acopio', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a
        .http()
        .post(`/api/usuarios/${op.id}/asignaciones`)
        .set(comoAdmin())
        .send({ tipo: 'ACOPIO', ubicacionId: ACOPIO_B })
        .expect(201);
      const correo = await a.prisma.correoSaliente.findFirst({
        where: {
          destinatario: `${op.username}@acopio.test`,
          cuerpo_texto: { contains: 'Acopio B' },
        },
      });
      expect(correo).not.toBeNull();
    });
  });

  describe('último administrador (RF-IDE-008)', () => {
    it('un administrador no puede cambiarse su propio rol ni suspenderse', async () => {
      await a
        .http()
        .patch(`/api/usuarios/${idAdmin}`)
        .set(comoAdmin())
        .send({ rol: 'AUDITOR' })
        .expect(403);
      await a.http().post(`/api/usuarios/${idAdmin}/suspender`).set(comoAdmin()).expect(403);
    });

    // Degradar o suspender a otro administrador siempre deja al menos uno: quien actúa.
    // El caso real, dos administradores que se suspenden a la vez, está en
    // concurrencia.int.test.ts.
  });

  describe('asignaciones y alcance (RF-IDE-005, 006, 010)', () => {
    it('el alcance se lee de la base: operador en A, no en B', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      const alcance = a.app.get(AlcanceService);
      const usuario = { id: op.id, username: op.username, nombre: 'x', rol: 'OPERADOR' as const };
      expect(await alcance.puede(usuario, 'ACOPIO', ACOPIO_A)).toBe(true);
      expect(await alcance.puede(usuario, 'ACOPIO', ACOPIO_B)).toBe(false);
      await a
        .http()
        .post(`/api/usuarios/${op.id}/asignaciones`)
        .set(comoAdmin())
        .send({ tipo: 'ACOPIO', ubicacionId: ACOPIO_B })
        .expect(201);
      expect(await alcance.puede(usuario, 'ACOPIO', ACOPIO_B)).toBe(true);
    });

    it('quitar la última asignación responsable pide confirmación', async () => {
      const zona = ZONA_A;
      const rec = await crearUsuarioActivo(a, tokenAdmin, {
        rol: 'RECEPTOR',
        asignaciones: [{ tipo: 'ZONA', ubicacionId: zona }],
      });
      const sinConfirmar = await a
        .http()
        .delete(`/api/usuarios/${rec.id}/asignaciones/ZONA/${zona}`)
        .set(comoAdmin())
        .expect(409);
      expect(sinConfirmar.body.codigo).toBe('UBICACION_SIN_RESPONSABLE');
      const r = await a
        .http()
        .delete(`/api/usuarios/${rec.id}/asignaciones/ZONA/${zona}?confirmar=true`)
        .set(comoAdmin())
        .expect(200);
      expect(r.body.asignaciones).toHaveLength(0);
    });

    it('asignar dos veces la misma ubicación: 409 con mensaje claro', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      const r = await a
        .http()
        .post(`/api/usuarios/${op.id}/asignaciones`)
        .set(comoAdmin())
        .send({ tipo: 'ACOPIO', ubicacionId: ACOPIO_A })
        .expect(409);
      expect(r.body.mensaje).toBe('El usuario ya tiene esa ubicación asignada');
    });
  });

  describe('bitácora (RF-IDE-012)', () => {
    it('restablecer acceso y cambiar el rol quedan destacados; se avisa a los administradores', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a
        .http()
        .post(`/api/usuarios/${op.id}/restablecer`)
        .set(comoAdmin())
        .send({ motivo: 'corto' })
        .expect(400);
      await a
        .http()
        .post(`/api/usuarios/${op.id}/restablecer`)
        .set(comoAdmin())
        .send({ motivo: 'Lo pidió por teléfono al coordinador' })
        .expect(201);
      await a
        .http()
        .patch(`/api/usuarios/${op.id}`)
        .set(comoAdmin())
        .send({ rol: 'AUDITOR' })
        .expect(200);
      const r = await a.http().get(`/api/bitacora?destacado=true`).set(comoAdmin()).expect(200);
      const acciones = (r.body.registros as { accion: string; entidad_id: string }[])
        .filter((x) => x.entidad_id === op.id)
        .map((x) => x.accion);
      expect(acciones).toEqual(
        expect.arrayContaining(['acceso.restablecido', 'usuario.rol_cambiado']),
      );
      const avisos = await a.prisma.correoSaliente.count({
        where: { asunto: 'Aviso: se restableció un acceso en Acopio' },
      });
      expect(avisos).toBeGreaterThanOrEqual(1);
      const detalle = await a.http().get(`/api/usuarios/${op.id}`).set(comoAdmin()).expect(200);
      expect(detalle.body.restablecimientoPendiente).not.toBeNull();
    });

    it('un operador no ve la bitácora', async () => {
      const op = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a.http().get('/api/bitacora').set('authorization', `Bearer ${op.token}`).expect(403);
    });
  });
});
