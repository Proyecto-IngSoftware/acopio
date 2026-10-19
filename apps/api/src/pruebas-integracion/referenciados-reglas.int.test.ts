import { HORARIO_VACIO } from '@acopio/shared';
import type { Prisma } from '../generado/prisma/client';
import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Pieza E: un acopio referenciado solo se muestra; no recibe escrituras ni personas (P-022). */
describe('acopio referenciado: reglas', () => {
  let a: AppPrueba;
  let admin: string;
  let referenciado: string;
  let categoria: string;

  beforeAll(async () => {
    a = await crearAppPrueba({ ahora: Date.parse('2026-10-18T15:00:00Z') });
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    referenciado = (
      await a.prisma.acopio.create({
        data: {
          tipo: 'REFERENCIADO',
          fuente: unico('prueba-'),
          fuente_id: '1',
          nombre: unico('Punto externo '),
          direccion: 'Calle 1 # 2-3',
          municipio: 'Bogotá',
          lat: 4.6,
          lng: -74.1,
          horario: HORARIO_VACIO as unknown as Prisma.InputJsonValue,
        },
      })
    ).id;
    categoria = (
      await a.prisma.categoria.create({
        data: {
          nombre: unico('Categoría referenciado '),
          grupo: 'ALIMENTOS',
          unidad_base: 'UNIDAD',
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const conAdmin = () => ({ authorization: `Bearer ${admin}` });

  it('no recibe entradas: solo las registra un Operador asignado, y no se le puede asignar', async () => {
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    await a
      .http()
      .post(`/api/acopios/${referenciado}/entradas`)
      .set({ authorization: `Bearer ${op.token}` })
      .send({ categoriaId: categoria, cantidad: 3 })
      .expect(403);
  });

  it('no recibe umbrales', async () => {
    const r = await a
      .http()
      .put(`/api/acopios/${referenciado}/umbrales/${categoria}`)
      .set(conAdmin())
      .send({ minimo: 1, maximo: 5 })
      .expect(409);
    expect(r.body.codigo).toBe('ACOPIO_REFERENCIADO');
  });

  it('no recibe jornadas de voluntariado', async () => {
    const r = await a
      .http()
      .post('/api/turnos/gestion/jornadas')
      .set(conAdmin())
      .send({
        acopioId: referenciado,
        titulo: unico('Jornada '),
        descripcion: 'No debería crearse en un punto externo',
        fechas: ['2026-10-25'],
        horaInicio: '08:00',
        horaFin: '12:00',
        cupoMaximo: 5,
        requisitos: { ropaCerrada: false, carga: false },
      })
      .expect(409);
    expect(r.body.codigo).toBe('ACOPIO_REFERENCIADO');
  });

  it('no se asigna a una persona: cuenta como una ubicación que no existe', async () => {
    const r = await a
      .http()
      .post('/api/usuarios')
      .set(conAdmin())
      .send({
        username: unico('operador'),
        nombre: 'Persona de prueba',
        rol: 'OPERADOR',
        correo: `${unico('op')}@acopio.test`,
        asignaciones: [{ tipo: 'ACOPIO', ubicacionId: referenciado }],
      })
      .expect(422);
    expect(r.body.codigo).toBe('UBICACION_INEXISTENTE');
  });

  it('no sale en la consola ni en el mapa de siempre', async () => {
    const gestion = await a.http().get('/api/acopios/gestion').set(conAdmin()).expect(200);
    expect(gestion.body.map((x: { id: string }) => x.id)).not.toContain(referenciado);
    const mapa = await a.http().get('/api/acopios').expect(200);
    expect(mapa.body.map((x: { id: string }) => x.id)).not.toContain(referenciado);
  });

  it('un operador nuevo con un acopio operado sigue funcionando', async () => {
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    expect(op.token).toBeTruthy();
  });
});
