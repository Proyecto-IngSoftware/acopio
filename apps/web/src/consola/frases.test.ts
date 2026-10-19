import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cambios, frase } from './frases';

const base = {
  id: '1',
  usuario_id: 'a',
  entidad: 'emergencia',
  entidad_id: 'x',
  ubicacion_id: null,
  destacado: false,
  accion: 'emergencia.actualizada',
  ocurrido_en: '2026-09-30T19:32:00.000Z',
  usuario: null,
};

it('muestra las fechas del antes y el después en español, sin el formato ISO', () => {
  const filas = cambios({
    ...base,
    datos_antes: { fecha_inicio: '2026-09-30T00:00:00.000Z', cerrada_en: null },
    datos_despues: {
      fecha_inicio: '2026-10-02T00:00:00.000Z',
      cerrada_en: '2026-10-05T19:32:00.000Z',
    },
  } as unknown as Parameters<typeof cambios>[0]);
  const inicio = filas.find((f) => f.campo === 'fecha_inicio')!;
  expect(inicio.antes).toBe('30/09/2026');
  expect(inicio.despues).toBe('2/10/2026');
  const cierre = filas.find((f) => f.campo === 'cerrada_en')!;
  expect(cierre.despues).toBe(
    new Date('2026-10-05T19:32:00.000Z').toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  );
});

it('el registro del seed se lee en lenguaje llano', () => {
  expect(
    frase({ ...base, accion: 'seed.admin_creado', entidad: 'usuario' } as unknown as Parameters<
      typeof frase
    >[0]),
  ).toBe('Se creó el administrador inicial');
});

type Registro = Parameters<typeof frase>[0];
const registro = (accion: string, despues: object | null = null, antes: object | null = null) =>
  ({
    ...base,
    accion,
    entidad: accion.split('.')[0],
    datos_despues: despues,
    datos_antes: antes,
  }) as unknown as Registro;

// Las acciones que escribe la API en la bitácora, leídas de su código (apps/api/src/modulos).
// Ninguna debe mostrarse con su código interno; una acción nueva sin frase hace fallar esta prueba.
const MODULOS = join(process.cwd(), '../api/src/modulos');
const ENTIDADES =
  'acopio|entidad|zona|codigo_barras|movimiento|no_recibir|umbral|donador|comprobante|causa|' +
  'jornada|reservas?|categoria|usuario|invitacion|acceso|asignacion|canasta|emergencia|motor|' +
  'necesidad|reporte|sugerencia|remision|seed|importacion|plataforma';
const ACCIONES_API = [
  ...new Set(
    readdirSync(MODULOS, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
      .flatMap((f) => [
        ...readFileSync(join(MODULOS, f), 'utf8').matchAll(
          new RegExp(`'((?:${ENTIDADES})\\.[a-z_]+)'`, 'g'),
        ),
      ])
      .map((m) => m[1]!),
  ),
].sort();

it('la lista de acciones de la API no está vacía', () => {
  expect(ACCIONES_API.length).toBeGreaterThan(40);
});

it.each(ACCIONES_API)('%s se lee en lenguaje llano y no con su código', (accion) => {
  const texto = frase(registro(accion));
  expect(texto).not.toBe(accion);
  expect(texto).not.toMatch(/[a-z]+\.[a-z_]+/);
});

it('los movimientos dicen qué categoría y cuánto', () => {
  expect(frase(registro('movimiento.salida', { categoria: 'Arroz', cantidad: 1 }))).toBe(
    'Registró una salida de Arroz',
  );
  expect(frase(registro('movimiento.entrada', { categoria: 'Agua potable', cantidad: 12 }))).toBe(
    'Registró una entrada de Agua potable',
  );
  expect(frase(registro('movimiento.ajuste', { categoria: 'Arroz', diferencia: -1 }))).toBe(
    'Ajustó Arroz con un conteo físico',
  );
});

it('los comprobantes dicen el folio cuando lo traen', () => {
  expect(frase(registro('comprobante.preparado', { folio: 'ACO-2026-UXD8K', lineas: 2 }))).toBe(
    'Preparó la donación ACO-2026-UXD8K',
  );
  expect(frase(registro('comprobante.rechazado', { motivo: 'OTRO' }))).toBe('Rechazó una donación');
});

it('las marcas de un acopio dicen la categoría', () => {
  expect(frase(registro('no_recibir.marcado', { categoria: 'Ropa usada' }))).toBe(
    'Marcó Ropa usada como «no recibir»',
  );
  expect(frase(registro('umbral.quitado', null, { categoria: 'Arroz' }))).toBe(
    'Quitó el umbral de Arroz',
  );
  expect(frase(registro('acopio.creado', { nombre: 'Acopio Suba' }))).toBe(
    'Creó el acopio Acopio Suba',
  );
});

it('las acciones del motor y de las remisiones se leen en español, no como código', () => {
  const acciones = [
    'motor.configuracion',
    'movimiento.recepcion',
    'necesidad.manual',
    'remision.cancelada',
    'remision.creada',
    'remision.despachada',
    'remision.editada',
    'remision.evidencia',
    'remision.linea',
    'remision.recibida',
    'reporte.necesidad',
    'sugerencia.aprobada',
    'sugerencia.descartada',
  ];
  const crudas = acciones.filter((accion) =>
    /^[a-z_]+\.[a-z_]+$/.test(
      frase({
        ...base,
        accion,
        datos_antes: null,
        datos_despues: null,
      } as unknown as Parameters<typeof frase>[0]),
    ),
  );
  expect(crudas).toEqual([]);
});
