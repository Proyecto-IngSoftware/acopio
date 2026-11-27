import { readFileSync } from 'node:fs';
import { crearAppPrueba, type AppPrueba } from '../../test/app-prueba';

/** La comprobación posterior al despliegue compara esta versión con la etiqueta verificada. */
describe('salud', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  it('es pública y dice la versión de apps/api/package.json', async () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    const { body } = await a.http().get('/api/salud').expect(200);
    expect(body).toEqual({ estado: 'ok', base: 'ok', version });
  });
});
