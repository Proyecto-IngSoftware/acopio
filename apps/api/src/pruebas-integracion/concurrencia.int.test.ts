import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { URL_APP_PRUEBAS } from '../../test/entorno-pruebas';
import {
  ACOPIO_A,
  ADMIN,
  ENTIDAD_PRUEBA,
  HORARIO_PRUEBA,
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

  it('un Operador que pausa mientras el Administrador cierra no reabre el acopio', async () => {
    const creado = await a
      .http()
      .post('/api/acopios')
      .set({ authorization: `Bearer ${tokenAdmin}` })
      .send({
        entidadId: ENTIDAD_PRUEBA,
        nombre: unico('Acopio carrera '),
        direccion: 'Calle 1 # 2-3',
        municipio: 'Bogotá',
        lat: 4.6,
        lng: -74.08,
        horario: HORARIO_PRUEBA,
      })
      .expect(201);
    const id = creado.body.id as string;

    // Otra transacción tiene la fila: así es como el cierre llega en medio de la operación
    const cierre = new Client({ connectionString: URL_APP_PRUEBAS });
    await cierre.connect();
    await cierre.query('BEGIN');
    await cierre.query('SELECT id FROM acopio WHERE id = $1 FOR UPDATE', [id]);

    const operacion = a
      .http()
      .patch(`/api/acopios/${id}/operacion`)
      .set({ authorization: `Bearer ${tokenAdmin}` })
      .send({ estado: 'PAUSADO' })
      .then((r) => r);
    await new Promise((r) => setTimeout(r, 500));
    await cierre.query(`UPDATE acopio SET estado = 'CERRADO' WHERE id = $1`, [id]);
    await cierre.query('COMMIT');
    await cierre.end();

    const r = await operacion;
    expect(r.status).toBe(409);
    const fila = await a.prisma.acopio.findUniqueOrThrow({ where: { id } });
    expect(fila.estado).toBe('CERRADO');
  });

  describe('saldo con registros simultáneos (RF-INV-011, la prueba más importante)', () => {
    let op1: { token: string };
    let op2: { token: string };
    const como = (t: string) => ({ authorization: `Bearer ${t}` });
    const nuevaCategoria = async () =>
      (
        await a.prisma.categoria.create({
          data: { nombre: unico('Concurrencia '), grupo: 'HERRAMIENTAS', unidad_base: 'UNIDAD' },
        })
      ).id;
    const sumaReal = async (categoriaId: string) => {
      const filas = await a.prisma.movimiento.findMany({
        where: { acopio_id: ACOPIO_A, categoria_id: categoriaId },
        select: { cantidad: true, signo: true },
      });
      return filas.reduce((s, f) => s + Number(f.cantidad) * f.signo, 0);
    };
    const saldoGuardado = async (categoriaId: string) => {
      const s = await a.prisma.saldo.findUnique({
        where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: categoriaId } },
      });
      return s ? Number(s.cantidad) : 0;
    };

    beforeAll(async () => {
      op1 = await crearUsuarioActivo(a, tokenAdmin, {
        rol: 'OPERADOR',
        asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
      });
      op2 = await crearUsuarioActivo(a, tokenAdmin, {
        rol: 'OPERADOR',
        asignaciones: [{ tipo: 'ACOPIO', ubicacionId: ACOPIO_A }],
      });
    });

    it('20 salidas simultáneas de 1 sobre un saldo de 12: pasan 12 y el saldo queda en 0', async () => {
      const cat = await nuevaCategoria();
      await a
        .http()
        .post(`/api/acopios/${ACOPIO_A}/entradas`)
        .set(como(op1.token))
        .send({ categoriaId: cat, cantidad: 12 })
        .expect(201);

      const respuestas = await simultaneas(20, (i) =>
        a
          .http()
          .post(`/api/acopios/${ACOPIO_A}/salidas`)
          .set(como(i % 2 ? op1.token : op2.token))
          .send({ categoriaId: cat, cantidad: 1, motivoSalida: 'ENTREGA_FAMILIAS' }),
      );

      const estados = respuestas.map((r) => r.status);
      expect(estados.filter((s) => s === 201)).toHaveLength(12);
      expect(estados.filter((s) => s === 409)).toHaveLength(8);
      for (const r of respuestas.filter((x) => x.status === 409)) {
        expect(r.body.codigo).toBe('SALDO_INSUFICIENTE');
      }
      expect(await saldoGuardado(cat)).toBe(0);
      expect(await sumaReal(cat)).toBe(0);
    });

    it('entradas y salidas cruzadas de dos operadores en dos categorías: saldo = suma de movimientos', async () => {
      const [x, y] = [await nuevaCategoria(), await nuevaCategoria()];
      for (const c of [x, y]) {
        await a
          .http()
          .post(`/api/acopios/${ACOPIO_A}/entradas`)
          .set(como(op1.token))
          .send({ categoriaId: c, cantidad: 50 })
          .expect(201);
      }
      await simultaneas(40, (i) => {
        const categoriaId = i % 2 ? x : y;
        const token = i % 3 ? op1.token : op2.token;
        return i % 4 === 0
          ? a
              .http()
              .post(`/api/acopios/${ACOPIO_A}/entradas`)
              .set(como(token))
              .send({ categoriaId, cantidad: 3 })
          : a
              .http()
              .post(`/api/acopios/${ACOPIO_A}/salidas`)
              .set(como(token))
              .send({ categoriaId, cantidad: 2, motivoSalida: 'VENCIDO' });
      });
      for (const c of [x, y]) {
        const guardado = await saldoGuardado(c);
        expect(guardado).toBe(await sumaReal(c));
        expect(guardado).toBeGreaterThanOrEqual(0);
      }
    });

    it('el mismo id llega 5 veces a la vez: un solo movimiento y todas las respuestas exitosas', async () => {
      const cat = await nuevaCategoria();
      const id = randomUUID();
      const respuestas = await simultaneas(5, () =>
        a
          .http()
          .post(`/api/acopios/${ACOPIO_A}/entradas`)
          .set(como(op1.token))
          .send({ id, categoriaId: cat, cantidad: 4, origenOffline: true }),
      );
      expect(respuestas.every((r) => r.status === 200 || r.status === 201)).toBe(true);
      expect(respuestas.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await a.prisma.movimiento.count({ where: { id } })).toBe(1);
      expect(await saldoGuardado(cat)).toBe(4);
    });

    it('20 entradas simultáneas: el antes y después de cada bitácora cuadran con su cantidad', async () => {
      const cat = await nuevaCategoria();
      await simultaneas(20, (i) =>
        a
          .http()
          .post(`/api/acopios/${ACOPIO_A}/entradas`)
          .set(como(i % 2 ? op1.token : op2.token))
          .send({ categoriaId: cat, cantidad: i + 1 })
          .expect(201),
      );
      const filas = await a.prisma.bitacora.findMany({
        where: { accion: 'movimiento.entrada', datos_despues: { path: ['categoria'], not: '' } },
      });
      const nombre = (await a.prisma.categoria.findUniqueOrThrow({ where: { id: cat } })).nombre;
      const deEsta = filas.filter(
        (f) => (f.datos_despues as { categoria: string }).categoria === nombre,
      );
      expect(deEsta).toHaveLength(20);
      for (const f of deEsta) {
        const antes = f.datos_antes as { saldo: number };
        const despues = f.datos_despues as { saldo: number; cantidad: number };
        expect(despues.saldo - antes.saldo).toBe(despues.cantidad);
      }
    });

    it('60 salidas simultáneas de la misma categoría: ninguna termina en 500', async () => {
      const cat = await nuevaCategoria();
      await a
        .http()
        .post(`/api/acopios/${ACOPIO_A}/entradas`)
        .set(como(op1.token))
        .send({ categoriaId: cat, cantidad: 30 })
        .expect(201);
      const respuestas = await simultaneas(60, (i) =>
        a
          .http()
          .post(`/api/acopios/${ACOPIO_A}/salidas`)
          .set(como(i % 2 ? op1.token : op2.token))
          .send({ categoriaId: cat, cantidad: 1, motivoSalida: 'VENCIDO' }),
      );
      const estados = respuestas.map((r) => r.status);
      expect(estados.filter((s) => s === 201)).toHaveLength(30);
      expect(estados.filter((s) => s === 409)).toHaveLength(30);
      expect(await saldoGuardado(cat)).toBe(0);
    });
  });
});
