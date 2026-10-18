import { ADMIN, crearAppPrueba, type AppPrueba } from '../../test/app-prueba';
import { AlmacenamientoService } from '../modulos/almacenamiento/almacenamiento.service';
import { sembrarCausasDemo } from '../seed/demo';
import { sembrarImagenesDemo } from '../seed/imagenes-demo';

/** Las causas de la demo con imagen y sus entidades con logotipo (P3 y P4 sin recuadros vacíos). */
describe('imágenes de la demo', () => {
  let a: AppPrueba;

  beforeAll(async () => {
    a = await crearAppPrueba();
    const admin = await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } });
    await sembrarCausasDemo(a.prisma, admin.id);
  });
  afterAll(() => a.cerrar());

  const demo = () =>
    a.prisma.causa.findMany({
      where: { titulo: { endsWith: '(demo)' } },
      include: { entidad: true },
    });

  it('cada causa de la demo queda con imagen y su entidad con logotipo, y la API los sirve', async () => {
    await sembrarImagenesDemo(a.prisma, a.app.get(AlmacenamientoService));
    const causas = await demo();
    expect(causas.length).toBeGreaterThan(0);
    for (const c of causas) {
      expect(c.imagen_key).not.toBeNull();
      expect(c.entidad.logo_key).not.toBeNull();
    }
    const r = await a.http().get(`/api/causas/${causas[0]!.id}/imagen`).expect(200);
    expect(r.headers['content-type']).toMatch(/image\/webp/);
    await a.http().get(`/api/entidades/${causas[0]!.entidad_id}/logo`).expect(200);
  });

  it('una segunda corrida no cambia las imágenes', async () => {
    const antes = (await demo()).map((c) => [c.imagen_key, c.entidad.logo_key]);
    await sembrarImagenesDemo(a.prisma, a.app.get(AlmacenamientoService));
    expect((await demo()).map((c) => [c.imagen_key, c.entidad.logo_key])).toEqual(antes);
  });
});
