import { crearAppPrueba, crearDonador, type AppPrueba } from '../../test/app-prueba';

describe('el Donador y la consola', () => {
  let a: AppPrueba;
  let token: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    token = (await crearDonador(a)).token;
  });
  afterAll(() => a.cerrar());

  const pedir = (ruta: string) => a.http().get(ruta).set('authorization', `Bearer ${token}`);

  it('ve su propia sesión', async () => {
    const r = await pedir('/api/auth/yo').expect(200);
    expect(r.body.rol).toBe('DONADOR');
  });

  it('busca categorías para armar su donación', async () => {
    await pedir('/api/categorias/buscar?q=arroz').expect(200);
  });

  it.each(['/api/categorias', '/api/acopios/gestion', '/api/bitacora', '/api/usuarios'])(
    'no entra a %s, que es de la consola',
    async (ruta) => {
      const r = await pedir(ruta).expect(403);
      expect(r.body.mensaje).toBe('Esta sección es de la consola');
    },
  );
});
