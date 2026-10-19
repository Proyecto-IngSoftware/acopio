import { ADMIN, crearAppPrueba, type AppPrueba } from '../../test/app-prueba';
import { AlmacenamientoService } from '../modulos/almacenamiento/almacenamiento.service';
import { sembrarCausasDemo } from '../seed/demo';
import { sembrarImagenesDemo, sembrarImagenesPlataformas } from '../seed/imagenes-demo';
import { unico } from '../../test/app-prueba';

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

  it('una causa de la demo con la ilustración vieja pasa a la nueva', async () => {
    const [c] = await demo();
    await a.prisma.causa.update({
      where: { id: c!.id },
      data: { imagen_key: `causas/${c!.id}/vieja.webp` },
    });
    await sembrarImagenesDemo(a.prisma, a.app.get(AlmacenamientoService));
    const despues = await a.prisma.causa.findUniqueOrThrow({ where: { id: c!.id } });
    expect(despues.imagen_key).toContain('/ilustracion-v2/');
  });

  it('cada plataforma con imagen guardada para su dominio la recibe, una sola vez', async () => {
    const conFoto = await a.prisma.plataforma.create({
      data: {
        nombre: unico('Reconstruyo '),
        categoria: 'Donaciones',
        descripcion: 'D',
        url: 'https://reconstruyocolombia.com/',
      },
    });
    const sinFoto = await a.prisma.plataforma.create({
      data: {
        nombre: unico('Sin foto '),
        categoria: 'Mapa',
        descripcion: 'D',
        url: 'https://no-hay-foto.test/',
      },
    });
    await sembrarImagenesPlataformas(a.prisma, a.app.get(AlmacenamientoService));
    const clave = (await a.prisma.plataforma.findUniqueOrThrow({ where: { id: conFoto.id } }))
      .imagen_key;
    expect(clave).toMatch(/^plataformas\//);
    expect(
      (await a.prisma.plataforma.findUniqueOrThrow({ where: { id: sinFoto.id } })).imagen_key,
    ).toBeNull();
    await sembrarImagenesPlataformas(a.prisma, a.app.get(AlmacenamientoService));
    expect(
      (await a.prisma.plataforma.findUniqueOrThrow({ where: { id: conFoto.id } })).imagen_key,
    ).toBe(clave);
  });
});
