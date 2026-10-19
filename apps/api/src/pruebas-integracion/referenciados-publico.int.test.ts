import { HORARIO_VACIO } from '@acopio/shared';
import type { Prisma } from '../generado/prisma/client';
import { crearAppPrueba, unico, type AppPrueba } from '../../test/app-prueba';

interface Publico {
  id: string;
  tipo: string;
  entidad: unknown;
  fuente: { nombre: string; estadoOriginal: string; necesidades: unknown } | null;
}

/** Pieza E: los referenciados y las otras plataformas en la API pública. */
describe('referenciados en la API pública', () => {
  let a: AppPrueba;
  let visible: string;
  let oculto: string;

  const referenciado = (extra: Prisma.AcopioUncheckedCreateInput | object = {}) =>
    a.prisma.acopio.create({
      data: {
        tipo: 'REFERENCIADO',
        fuente: 'redacopio',
        fuente_id: unico('punto-'),
        nombre: unico('Punto público '),
        direccion: 'Calle 9 # 8-7',
        municipio: 'Bogotá',
        lat: 4.65,
        lng: -74.06,
        horario: HORARIO_VACIO as unknown as Prisma.InputJsonValue,
        estado: 'CERRADO',
        fuente_estado: 'cerrado',
        fuente_necesidades: [{ nivel: 'urgente', texto: 'Camión' }],
        fuente_url: 'https://redacopiobogota.com/',
        ...extra,
      },
    });

  beforeAll(async () => {
    a = await crearAppPrueba();
    visible = (await referenciado()).id;
    oculto = (await referenciado({ oculto_por_admin: true, estado: 'ACTIVO' })).id;
  });
  afterAll(() => a.cerrar());

  const ids = (filas: Publico[]) => filas.map((f) => f.id);

  it('sin «tipos», el mapa devuelve lo de siempre: ningún referenciado', async () => {
    const r = await a.http().get('/api/acopios').expect(200);
    expect(ids(r.body)).not.toContain(visible);
  });

  it('con «tipos», trae los referenciados, cerrados incluidos, con su fuente y sin entidad', async () => {
    const r = await a.http().get('/api/acopios?tipos=OPERADO,REFERENCIADO').expect(200);
    const fila = (r.body as Publico[]).find((f) => f.id === visible);
    expect(fila).toMatchObject({
      tipo: 'REFERENCIADO',
      entidad: null,
      fuente: {
        nombre: 'RedAcopio Bogotá',
        nombreCorto: 'RedAcopio',
        estadoOriginal: 'cerrado',
        necesidades: [{ nivel: 'urgente', texto: 'Camión' }],
      },
    });
    expect((r.body as Publico[]).some((f) => f.tipo === 'OPERADO')).toBe(true);
  });

  it('un referenciado que ocultó el Administrador no sale nunca', async () => {
    const r = await a.http().get('/api/acopios?tipos=REFERENCIADO').expect(200);
    expect(ids(r.body)).not.toContain(oculto);
    await a.http().get(`/api/acopios/${oculto}`).expect(404);
  });

  it('la ficha de un referenciado trae su fuente', async () => {
    const r = await a.http().get(`/api/acopios/${visible}`).expect(200);
    expect(r.body).toMatchObject({ tipo: 'REFERENCIADO', fuente: { estadoOriginal: 'cerrado' } });
  });

  it('un operado trae tipo OPERADO y fuente nula', async () => {
    const r = await a.http().get('/api/acopios').expect(200);
    expect((r.body as Publico[])[0]).toMatchObject({ tipo: 'OPERADO', fuente: null });
  });

  it('las otras plataformas se ven sin sesión, en su orden', async () => {
    const nombre = unico('Plataforma ');
    await a.prisma.plataforma.create({
      data: {
        nombre,
        categoria: 'Donaciones',
        descripcion: 'De prueba',
        url: 'https://x.test/',
        orden: 0,
      },
    });
    const r = await a.http().get('/api/publico/plataformas').expect(200);
    expect(r.body.find((p: { nombre: string }) => p.nombre === nombre)).toMatchObject({
      categoria: 'Donaciones',
      url: 'https://x.test/',
    });
  });
});
