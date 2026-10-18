import { Client } from 'pg';
import { URL_APP_PRUEBAS, URL_DUENO_PRUEBAS } from '../../test/entorno-pruebas';
import { crearAppPrueba, unico, type AppPrueba } from '../../test/app-prueba';

/** Pieza C: verificación de entidades y causas (RF-RED-006 a 010, HU-02, HU-15). */
describe('causas', () => {
  let a: AppPrueba;
  const app = new Client({ connectionString: URL_APP_PRUEBAS });
  const dueno = new Client({ connectionString: URL_DUENO_PRUEBAS });

  beforeAll(async () => {
    a = await crearAppPrueba();
    await Promise.all([app.connect(), dueno.connect()]);
  });
  afterAll(async () => {
    await Promise.all([app.end(), dueno.end()]);
    await a.cerrar();
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
});
