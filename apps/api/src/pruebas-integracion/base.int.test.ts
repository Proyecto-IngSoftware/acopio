import { Client } from 'pg';
import { URL_APP_PRUEBAS, URL_DUENO_PRUEBAS } from '../../test/entorno-pruebas';
import { ADMIN, crearAppPrueba, type AppPrueba } from '../../test/app-prueba';
import { PROVEEDOR_IDENTIDAD } from '../modulos/identidad/proveedor/proveedor-identidad';
import { CANASTA, CATEGORIAS } from '../seed/datos-catalogo';
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
