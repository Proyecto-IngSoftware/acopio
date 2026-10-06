import { Client } from 'pg';
import { URL_APP_PRUEBAS, URL_DUENO_PRUEBAS } from '../../test/entorno-pruebas';
import {
  ACOPIO_A,
  ACOPIO_B,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  type AppPrueba,
} from '../../test/app-prueba';
import { PROVEEDOR_IDENTIDAD } from '../modulos/identidad/proveedor/proveedor-identidad';
import { CANASTA, CATEGORIAS } from '../seed/datos-catalogo';
import { sembrarDemo } from '../seed/demo';
import { sembrar } from '../seed/sembrar';

/** T03: lo que la base hace cumplir, más allá del código de la API. */
describe('base de datos', () => {
  let a: AppPrueba;
  const app = new Client({ connectionString: URL_APP_PRUEBAS });

  beforeAll(async () => {
    a = await crearAppPrueba();
    await app.connect();
  });
  afterAll(async () => {
    await app.end();
    await a.cerrar();
  });

  describe('la bitácora es append-only para el rol de la API (RF-IDE-012, RNF-10)', () => {
    it('acopio_app puede insertar', async () => {
      await expect(
        app.query(`INSERT INTO bitacora (accion, entidad) VALUES ('prueba.insercion', 'prueba')`),
      ).resolves.toBeDefined();
    });

    it('acopio_app no puede modificar', async () => {
      await expect(app.query(`UPDATE bitacora SET accion = 'alterada'`)).rejects.toThrow(
        /permission denied/,
      );
    });

    it('acopio_app no puede borrar ni truncar', async () => {
      await expect(app.query(`DELETE FROM bitacora`)).rejects.toThrow(/permission denied/);
      await expect(app.query(`TRUNCATE bitacora`)).rejects.toThrow(/permission denied/);
    });

    it('acopio_app no toca el historial de migraciones', async () => {
      await expect(app.query(`SELECT * FROM _prisma_migrations`)).rejects.toThrow(
        /permission denied/,
      );
    });
  });

  describe('red (Bloque 1)', () => {
    it.each(['entidad', 'acopio', 'zona'])('acopio_app no puede borrar %s', async (tabla) => {
      await expect(app.query(`DELETE FROM ${tabla} WHERE false`)).rejects.toThrow(
        /permission denied/,
      );
    });

    it('acopio_app sí puede borrar no_recibir', async () => {
      await expect(app.query(`DELETE FROM no_recibir WHERE false`)).resolves.toBeDefined();
    });

    it('las coordenadas del acopio quedan dentro de Colombia', async () => {
      await expect(
        app.query(`UPDATE acopio SET lat = 40 WHERE id = '${ACOPIO_A}'`),
      ).rejects.toThrow(/acopio_coordenadas_colombia/);
    });

    it('la población de una zona no es negativa', async () => {
      await expect(
        app.query(`UPDATE zona SET poblacion_estimada = -1 WHERE id = '${ZONA_A}'`),
      ).rejects.toThrow(/zona_poblacion_no_negativa/);
    });
  });

  describe('inventario (Bloque 2)', () => {
    let categoria: string;

    beforeAll(async () => {
      const c = await a.prisma.categoria.create({
        data: {
          nombre: `Base inventario ${Date.now()}`,
          grupo: 'HERRAMIENTAS',
          unidad_base: 'UNIDAD',
        },
      });
      categoria = c.id;
      const admin = await a.prisma.usuario.findFirstOrThrow({
        where: { username: ADMIN.username },
      });
      // El usuario del movimiento: basta el administrador del seed
      await app.query(`SELECT set_config('acopio.prueba_usuario', $1, false)`, [admin.id]);
    });

    const insertar = (tipo: string, cantidad: number, signo: number, extra = '') =>
      app.query(
        `INSERT INTO movimiento (id, acopio_id, categoria_id, tipo, cantidad, signo, usuario_id, ocurrido_en ${extra ? ', ' + extra.split('=')[0] : ''})
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, current_setting('acopio.prueba_usuario')::uuid, now() ${extra ? ', ' + extra.split('=')[1] : ''})`,
        [ACOPIO_A, categoria, tipo, cantidad, signo],
      );

    it('una entrada crea la fila de saldo', async () => {
      await insertar('ENTRADA', 5, 1);
      const r = await app.query(
        `SELECT cantidad FROM saldo WHERE acopio_id = $1 AND categoria_id = $2`,
        [ACOPIO_A, categoria],
      );
      expect(Number(r.rows[0].cantidad)).toBe(5);
    });

    it('una salida que no deja el saldo negativo descuenta', async () => {
      await insertar('SALIDA', 2, -1, `motivo_salida='VENCIDO'`);
      const r = await app.query(
        `SELECT cantidad FROM saldo WHERE acopio_id = $1 AND categoria_id = $2`,
        [ACOPIO_A, categoria],
      );
      expect(Number(r.rows[0].cantidad)).toBe(3);
    });

    it('el saldo nunca queda negativo, aunque se salte la API', async () => {
      await expect(insertar('SALIDA', 4, -1, `motivo_salida='VENCIDO'`)).rejects.toThrow(
        /saldo_cantidad_no_negativa/,
      );
    });

    it('acopio_app no puede modificar ni borrar movimientos', async () => {
      await expect(app.query(`UPDATE movimiento SET cantidad = 1`)).rejects.toThrow(
        /permission denied/,
      );
      await expect(app.query(`DELETE FROM movimiento`)).rejects.toThrow(/permission denied/);
    });

    it('acopio_app no puede escribir en saldo', async () => {
      await expect(
        app.query(`UPDATE saldo SET cantidad = 999 WHERE acopio_id = $1`, [ACOPIO_A]),
      ).rejects.toThrow(/permission denied/);
      await expect(
        app.query(
          `INSERT INTO saldo (acopio_id, categoria_id, cantidad, ultimo_movimiento) VALUES ($1, $2, 1, now())`,
          [ACOPIO_B, categoria],
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('un ajuste sin motivo suficiente no entra', async () => {
      await expect(insertar('AJUSTE', 1, 1, `motivo='corto'`)).rejects.toThrow(
        /movimiento_ajuste_con_motivo/,
      );
    });

    it('un ajuste sin motivo tampoco entra (un CHECK con NULL pasaría)', async () => {
      await expect(insertar('AJUSTE', 1, 1)).rejects.toThrow(/movimiento_ajuste_con_motivo/);
    });

    it('una salida por «Otro» sin nota no entra', async () => {
      await expect(insertar('SALIDA', 1, -1, `motivo_salida='OTRO'`)).rejects.toThrow(
        /movimiento_nota_obligatoria/,
      );
    });

    it('el umbral exige mínimo <= máximo', async () => {
      await expect(
        app.query(
          `INSERT INTO umbral (acopio_id, categoria_id, minimo, maximo, actualizado_por)
           VALUES ($1, $2, 10, 5, current_setting('acopio.prueba_usuario')::uuid)`,
          [ACOPIO_A, categoria],
        ),
      ).rejects.toThrow(/umbral_rango/);
    });
  });

  describe('custodia (Bloque 3)', () => {
    it('acopio_app no cambia ni borra vínculos de donaciones', async () => {
      await expect(
        app.query(`UPDATE comprobante_movimiento SET origen = 'AUDITOR'`),
      ).rejects.toThrow(/permission denied/);
      await expect(app.query(`DELETE FROM comprobante_movimiento`)).rejects.toThrow(
        /permission denied/,
      );
    });

    it('acopio_app no borra comprobantes', async () => {
      await expect(app.query(`DELETE FROM comprobante`)).rejects.toThrow(/permission denied/);
    });

    it('un folio fuera de formato no entra', async () => {
      const admin = await a.prisma.usuario.findFirstOrThrow({
        where: { username: ADMIN.username },
      });
      await expect(
        app.query(
          `INSERT INTO comprobante (folio, donador_id, acopio_id) VALUES ('ACO-2026-0OI1L', $1, $2)`,
          [admin.id, ACOPIO_A],
        ),
      ).rejects.toThrow(/comprobante_folio_formato/);
    });
  });

  describe('restricciones CHECK', () => {
    const dueno = new Client({ connectionString: URL_DUENO_PRUEBAS });
    beforeAll(() => dueno.connect());
    afterAll(() => dueno.end());

    it('la canasta exige fuente', async () => {
      await expect(
        dueno.query(`
          INSERT INTO canasta_estandar (categoria_id, cantidad_persona_dia, fuente, vigente_desde)
          SELECT id, 1, '   ', '2030-01-01' FROM categoria LIMIT 1`),
      ).rejects.toThrow(/canasta_con_fuente/);
    });

    it('un usuario interno exige username', async () => {
      await expect(
        dueno.query(`INSERT INTO usuario (nombre, rol) VALUES ('Sin usuario', 'OPERADOR')`),
      ).rejects.toThrow(/usuario_interno_con_username/);
    });

    it('un Donador exige correo real', async () => {
      await expect(
        dueno.query(
          `INSERT INTO usuario (nombre, rol, correo, correo_sintetico) VALUES ('D', 'DONADOR', 'd@x.co', true)`,
        ),
      ).rejects.toThrow(/usuario_donador_con_correo_real/);
    });

    it('restablecer acceso exige motivo de 20 caracteres', async () => {
      await expect(
        dueno.query(`
          INSERT INTO invitacion (usuario_id, token_hash, expira_en, es_restablecimiento, motivo)
          SELECT id, '\\x01', now(), true, 'corto' FROM usuario LIMIT 1`),
      ).rejects.toThrow(/invitacion_restablecimiento_con_motivo/);
    });
  });

  it('el seed de demostración es idempotente: 2 entidades y 4 acopios con «(prueba)»', async () => {
    await sembrarDemo(a.prisma);
    await sembrarDemo(a.prisma);
    const acopios = await a.prisma.acopio.count({ where: { nombre: { endsWith: '(prueba)' } } });
    expect(acopios).toBe(4);
    const entidades = await a.prisma.entidad.count({ where: { nombre: { endsWith: '(prueba)' } } });
    expect(entidades).toBe(2);
    // Inventario de ejemplo para C3, solo en el primer acopio y sin duplicarse
    const primero = await a.prisma.acopio.findFirstOrThrow({
      where: { nombre: { endsWith: '(prueba)' } },
      orderBy: { nombre: 'asc' },
    });
    expect(await a.prisma.movimiento.count({ where: { acopio_id: primero.id } })).toBe(6);
  });

  it('el seed es idempotente: 39 categorías y 10 filas de canasta (T12)', async () => {
    expect(CATEGORIAS).toHaveLength(39);
    expect(CANASTA).toHaveLength(10);
    const antes = {
      categorias: await a.prisma.categoria.count(),
      canasta: await a.prisma.canastaEstandar.count(),
    };
    const resumen = await sembrar(a.prisma, a.app.get(PROVEEDOR_IDENTIDAD), ADMIN);
    expect(resumen).toEqual({ ...antes, adminCreado: false });
    expect(antes.categorias).toBeGreaterThanOrEqual(39);
    expect(await a.prisma.usuario.count({ where: { username: ADMIN.username } })).toBe(1);
  });
});
