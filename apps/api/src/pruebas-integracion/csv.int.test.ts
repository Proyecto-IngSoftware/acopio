import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Pieza E: la carga por CSV, revisar y aplicar, con el formato de plataformas. */
describe('carga por CSV', () => {
  let a: AppPrueba;
  let admin: string;

  beforeAll(async () => {
    a = await crearAppPrueba();
    admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(() => a.cerrar());

  const conAdmin = () => ({ authorization: `Bearer ${admin}` });
  /** Diez plataformas con nombre único; `sinUrlEn` deja vacía la url de esa fila. */
  const archivo = (prefijo: string, sinUrlEn?: number) => {
    const filas = Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      const url = n === sinUrlEn ? '' : `https://plataforma-${n}.test/`;
      return `${prefijo} ${n},Donaciones,Plataforma de prueba ${n},${url}`;
    });
    return Buffer.from(['nombre,categoria,descripcion,url', ...filas].join('\n'), 'utf8');
  };
  const enviar = (accion: 'revisar' | 'aplicar', contenido: Buffer, tipo = 'plataformas') =>
    a
      .http()
      .post(`/api/importacion/csv/${tipo}/${accion}`)
      .set(conAdmin())
      .attach('archivo', contenido, 'datos.csv');
  const creadas = (prefijo: string) =>
    a.prisma.plataforma.count({ where: { nombre: { startsWith: prefijo } } });

  it('revisar dice qué fila falla y en qué columna, sin escribir nada', async () => {
    const prefijo = unico('Revisar ');
    const r = await enviar('revisar', archivo(prefijo, 7)).expect(200);
    expect(r.body).toMatchObject({ validas: 9, invalidas: 1 });
    const mala = r.body.filas.find((f: { numero: number }) => f.numero === 7);
    expect(mala).toMatchObject({
      valida: false,
      errores: [expect.objectContaining({ columna: 'url' })],
    });
    expect(await creadas(prefijo)).toBe(0);
  });

  it('aplicar con una fila mala responde 422 con el reporte y no escribe ninguna', async () => {
    const prefijo = unico('Mala ');
    const r = await enviar('aplicar', archivo(prefijo, 7)).expect(422);
    expect(r.body.codigo).toBe('CSV_INVALIDO');
    expect(r.body.detalles).toMatchObject({ invalidas: 1 });
    expect(await creadas(prefijo)).toBe(0);
  });

  it('aplicar un archivo bueno crea todas las filas', async () => {
    const prefijo = unico('Buena ');
    const r = await enviar('aplicar', archivo(prefijo)).expect(200);
    expect(r.body).toMatchObject({ validas: 10, invalidas: 0 });
    expect(await creadas(prefijo)).toBe(10);
  });

  it('lista los formatos con sus columnas, para la pantalla futura', async () => {
    const r = await a.http().get('/api/importacion/formatos').set(conAdmin()).expect(200);
    const plataformas = r.body.find((f: { tipo: string }) => f.tipo === 'plataformas');
    expect(plataformas.columnas.map((c: { nombre: string }) => c.nombre)).toEqual([
      'nombre',
      'categoria',
      'descripcion',
      'url',
    ]);
  });

  it('un tipo que no existe da 404', async () => {
    const r = await enviar('revisar', archivo('x'), 'cosas').expect(404);
    expect(r.body.codigo).toBe('FORMATO_CSV_DESCONOCIDO');
  });

  it('sin archivo da 400', async () => {
    const r = await a
      .http()
      .post('/api/importacion/csv/plataformas/revisar')
      .set(conAdmin())
      .expect(400);
    expect(r.body.codigo).toBe('SIN_ARCHIVO');
  });

  it('un Operador no carga CSV', async () => {
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    await a
      .http()
      .post('/api/importacion/csv/plataformas/revisar')
      .set({ authorization: `Bearer ${op.token}` })
      .attach('archivo', archivo('x'), 'datos.csv')
      .expect(403);
  });
});
