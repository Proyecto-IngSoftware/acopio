import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/**
 * T17: esqueleto de la prueba de concurrencia (RTA-02). Lanza operaciones
 * simultáneas contra el PostgreSQL real. En el Bloque 2 se suma aquí la prueba del
 * saldo con dos operadores registrando a la vez.
 */
async function simultaneas<T>(n: number, operacion: (i: number) => Promise<T>): Promise<T[]> {
  return Promise.all(Array.from({ length: n }, (_, i) => operacion(i)));
}

describe('concurrencia', () => {
  let a: AppPrueba;
  let tokenAdmin: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(() => a.cerrar());

  it('10 canjes simultáneos de la misma invitación: uno gana, nueve reciben el mensaje genérico', async () => {
    const username = unico('conc');
    const creado = await a
      .http()
      .post('/api/usuarios')
      .set('authorization', `Bearer ${tokenAdmin}`)
      .send({ username, nombre: 'Concurrente', rol: 'ADMIN', correo: `${username}@acopio.test` })
      .expect(201);
    const token = (creado.body.invitacion.enlace as string).split('/').pop();

    const respuestas = await simultaneas(10, (i) =>
      a
        .http()
        .post(`/api/invitaciones/${token}/canje`)
        .send({ contrasena: `frase larga número ${i} de prueba` }),
    );

    const estados = respuestas.map((r) => r.status).sort();
    expect(estados.filter((s) => s === 200)).toHaveLength(1);
    expect(estados.filter((s) => s === 404)).toHaveLength(9);
    for (const r of respuestas.filter((x) => x.status === 404)) {
      expect(r.body.codigo).toBe('INVITACION_INVALIDA');
    }
    const usuario = await a.prisma.usuario.findUniqueOrThrow({
      where: { id: creado.body.usuario.id },
    });
    expect(usuario.estado).toBe('ACTIVO');
    expect(
      await a.prisma.identidadLocal.count({ where: { correo: `${username}@acopio.test` } }),
    ).toBe(1);
  });

  it('dos administradores que se suspenden a la vez: el sistema conserva al menos uno (RF-IDE-008)', async () => {
    // Deja solo dos administradores activos
    const x = await crearUsuarioActivo(a, tokenAdmin, { rol: 'ADMIN', asignaciones: [] });
    const y = await crearUsuarioActivo(a, tokenAdmin, { rol: 'ADMIN', asignaciones: [] });
    await a.prisma.usuario.updateMany({
      where: { rol: 'ADMIN', estado: 'ACTIVO', id: { notIn: [x.id, y.id] } },
      data: { estado: 'SUSPENDIDO' },
    });

    try {
      const [xSuspendeY, ySuspendeX] = await Promise.all([
        a.http().post(`/api/usuarios/${y.id}/suspender`).set('authorization', `Bearer ${x.token}`),
        a.http().post(`/api/usuarios/${x.id}/suspender`).set('authorization', `Bearer ${y.token}`),
      ]);

      const exitos = [xSuspendeY, ySuspendeX].filter((r) => r.status === 201);
      expect(exitos).toHaveLength(1);
      const perdedor = [xSuspendeY, ySuspendeX].find((r) => r.status !== 201)!;
      // Pierde por ser el último (409) o porque ya lo suspendieron (403)
      expect([403, 409]).toContain(perdedor.status);
      expect(await a.prisma.usuario.count({ where: { rol: 'ADMIN', estado: 'ACTIVO' } })).toBe(1);
    } finally {
      // Deja el estado como estaba para las demás pruebas
      await a.prisma.usuario.updateMany({
        where: { username: 'admin' },
        data: { estado: 'ACTIVO' },
      });
    }
  });
});
