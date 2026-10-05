import { corregirFecha, descartar, encolar, enviarCola, esperaReintento, listarCola } from './cola';

const YO = 'u-operadora';
const OTRO = 'u-otro';
const A = 'acopio-a';
const arroz = { id: 'e1', categoriaId: 'c-arroz', cantidad: 12 };
const agua = { id: 'e2', categoriaId: 'c-agua', cantidad: 24 };
const aceite = { id: 'e3', categoriaId: 'c-aceite', cantidad: 5 };
const a = (hora: string) => new Date(`2026-10-05T${hora}:00Z`);

const movimiento = (id: string) => ({ movimiento: { id }, saldo: 1, noRecibe: false });

/** Responde cada POST según la categoría del cuerpo; registra el orden de envío. */
function api(respuesta: (categoriaId: string) => [number, unknown] | 'sin-red') {
  const enviados: { categoriaId: string; ocurridoEn: string; origenOffline: boolean }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (entrada) => {
    const peticion = entrada as Request;
    const cuerpo = await peticion.json();
    enviados.push(cuerpo);
    const r = respuesta(cuerpo.categoriaId);
    if (r === 'sin-red') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(r[1]), {
      status: r[0],
      headers: { 'content-type': 'application/json' },
    });
  });
  return enviados;
}

describe('cola de entradas sin conexión', () => {
  it('guarda las entradas por usuario, en el orden en que se registraron', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    await encolar(OTRO, A, aceite, a('10:43'));
    await encolar(YO, A, agua, a('10:45'));

    const mias = await listarCola(YO);
    expect(mias.map((e) => e.cuerpo.categoriaId)).toEqual(['c-arroz', 'c-agua']);
    expect(mias[0]).toMatchObject({ acopioId: A, estado: 'pendiente' });
    expect(mias[0]!.cuerpo).toMatchObject({
      ocurridoEn: a('10:42').toISOString(),
      origenOffline: true,
    });
    expect(await listarCola(OTRO)).toHaveLength(1);
  });

  it('envía en orden, de a una, y borra cada entrada solo cuando la API la confirma', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    await encolar(YO, A, agua, a('10:45'));
    const enviados = api(() => [201, movimiento('m')]);

    const r = await enviarCola(YO);

    expect(r).toEqual({ estado: 'listo', enviadas: 2 });
    expect(enviados.map((c) => c.categoriaId)).toEqual(['c-arroz', 'c-agua']);
    expect(enviados[0]).toMatchObject({
      ocurridoEn: a('10:42').toISOString(),
      origenOffline: true,
    });
    expect(await listarCola(YO)).toEqual([]);
  });

  it('no envía lo de otro usuario del mismo teléfono', async () => {
    await encolar(OTRO, A, aceite, a('10:43'));
    const enviados = api(() => [201, movimiento('m')]);

    await enviarCola(YO);

    expect(enviados).toEqual([]);
    expect(await listarCola(OTRO)).toHaveLength(1);
  });

  it('una entrada que la API ya tenía (mismo id, responde 200) cuenta como enviada', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    api(() => [200, movimiento('m-original')]);

    expect(await enviarCola(YO)).toEqual({ estado: 'listo', enviadas: 1 });
    expect(await listarCola(YO)).toEqual([]);
  });

  it('un 401 detiene el envío, conserva la cola y pide volver a entrar', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    await encolar(YO, A, agua, a('10:45'));
    const enviados = api(() => [
      401,
      { estado: 401, codigo: 'NO_AUTENTICADO', mensaje: 'Falta la sesión' },
    ]);

    expect(await enviarCola(YO)).toEqual({ estado: 'sin-sesion', enviadas: 0 });
    expect(enviados).toHaveLength(1);
    expect(await listarCola(YO)).toHaveLength(2);
  });

  it.each([
    [
      'un 429',
      () =>
        [429, { estado: 429, codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Espera' }] as [
          number,
          unknown,
        ],
    ],
    [
      'un error del servidor',
      () => [503, { estado: 503, codigo: 'ERROR', mensaje: 'Caído' }] as [number, unknown],
    ],
    ['la falta de red', () => 'sin-red' as const],
  ])('con %s se detiene y deja la cola para reintentar', async (_caso, respuesta) => {
    await encolar(YO, A, arroz, a('10:42'));
    await encolar(YO, A, agua, a('10:45'));
    const enviados = api(respuesta);

    expect(await enviarCola(YO)).toEqual({ estado: 'reintentar', enviadas: 0 });
    expect(enviados).toHaveLength(1);
    expect((await listarCola(YO)).every((e) => e.estado === 'pendiente')).toBe(true);
  });

  it('un rechazo queda marcado con su motivo y no traba las demás', async () => {
    await encolar(YO, A, aceite, a('10:40'));
    await encolar(YO, A, arroz, a('10:42'));
    api((categoria) =>
      categoria === 'c-aceite'
        ? [
            422,
            {
              estado: 422,
              codigo: 'FECHA_FUERA_DE_RANGO',
              mensaje: 'La fecha es de hace más de 7 días',
            },
          ]
        : [201, movimiento('m')],
    );

    expect(await enviarCola(YO)).toEqual({ estado: 'listo', enviadas: 1 });
    const cola = await listarCola(YO);
    expect(cola).toHaveLength(1);
    expect(cola[0]).toMatchObject({
      estado: 'rechazada',
      codigo: 'FECHA_FUERA_DE_RANGO',
      motivo: 'La fecha es de hace más de 7 días',
    });
  });

  it('sin la asignación (403) la entrada queda rechazada y no se reintenta', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    const enviados = api(() => [
      403,
      { estado: 403, codigo: 'NO_AUTORIZADO', mensaje: 'No tienes ese acopio' },
    ]);

    await enviarCola(YO);
    await enviarCola(YO);

    expect(enviados).toHaveLength(1);
    expect((await listarCola(YO))[0]).toMatchObject({
      estado: 'rechazada',
      codigo: 'NO_AUTORIZADO',
    });
  });

  it('corregir la fecha devuelve la entrada a la cola, de última', async () => {
    await encolar(YO, A, aceite, a('10:40'));
    await encolar(YO, A, arroz, a('10:42'));
    api((categoria) =>
      categoria === 'c-aceite'
        ? [422, { estado: 422, codigo: 'FECHA_FUERA_DE_RANGO', mensaje: 'Muy vieja' }]
        : [400, { estado: 400, codigo: 'VALIDACION', mensaje: 'Otra cosa' }],
    );
    await enviarCola(YO);

    await corregirFecha('e3', a('11:00'));

    const cola = await listarCola(YO);
    expect(cola.map((e) => [e.id, e.estado])).toEqual([
      ['e1', 'rechazada'],
      ['e3', 'pendiente'],
    ]);
    expect(cola[1]!.cuerpo.ocurridoEn).toBe(a('11:00').toISOString());
    expect(cola[1]!.motivo).toBeUndefined();
  });

  it('dos envíos seguidos (el evento online y la vuelta a C4) no mandan dos veces lo mismo', async () => {
    await encolar(YO, A, arroz, a('10:42'));
    await encolar(YO, A, agua, a('10:45'));
    const enviados = api(() => [201, movimiento('m')]);

    await Promise.all([enviarCola(YO), enviarCola(YO)]);

    expect(enviados.map((c) => c.categoriaId)).toEqual(['c-arroz', 'c-agua']);
  });

  it('descartar borra la entrada del teléfono', async () => {
    await encolar(YO, A, arroz, a('10:42'));

    await descartar('e1');

    expect(await listarCola(YO)).toEqual([]);
  });

  it('la espera entre reintentos crece hasta 5 minutos', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(esperaReintento)).toEqual([
      5_000, 10_000, 20_000, 40_000, 80_000, 160_000, 300_000, 300_000,
    ]);
  });
});
