import { cambios } from './frases';

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
