import { Client } from 'pg';
import { URL_APP_PRUEBAS } from '../../test/entorno-pruebas';
import {
  ACOPIO_A,
  ADMIN,
  ENTIDAD_PRUEBA,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

/** Bloque 5: reglas de `jornada` y `reserva` que viven en la base (§4 de la especificación). */
describe('turnos: datos', () => {
  let a: AppPrueba;
  let adminId: string;
  const app = new Client({ connectionString: URL_APP_PRUEBAS });

  beforeAll(async () => {
    a = await crearAppPrueba();
    await app.connect();
    adminId = (await a.prisma.usuario.findUniqueOrThrow({ where: { username: ADMIN.username } }))
      .id;
  });
  afterAll(async () => {
    await app.end();
    await a.cerrar();
  });

  /** Inserta como acopio_app; devuelve el id o el nombre de la restricción que falló. */
  async function insertarJornada(campos: Record<string, unknown>): Promise<string> {
    const fila = {
      acopio_id: ACOPIO_A,
      titulo: unico('Jornada '),
      descripcion: 'Clasificar ropa donada por tallas',
      inicio: '2026-11-02T13:00:00Z',
      fin: '2026-11-02T17:00:00Z',
      cupo_maximo: 10,
      creada_por: adminId,
      ...campos,
    };
    const columnas = Object.keys(fila);
    try {
      const r = await app.query<{ id: string }>(
        `INSERT INTO jornada (${columnas.join(', ')}) VALUES (${columnas.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
        Object.values(fila),
      );
      return r.rows[0]!.id;
    } catch (e) {
      return (e as { constraint?: string; message: string }).constraint ?? (e as Error).message;
    }
  }

  async function insertarReserva(jornadaId: string, correo: string, estado = 'ACTIVA') {
    try {
      await app.query(
        `INSERT INTO reserva (jornada_id, nombre, correo, codigo, secreto_hash, estado, consentimiento_en)
         VALUES ($1, 'Ana', $2, $3, 'x', $4, now())`,
        [jornadaId, correo, unico('C').slice(0, 20), estado],
      );
      return 'ok';
    } catch (e) {
      return (e as { constraint?: string; message: string }).constraint ?? (e as Error).message;
    }
  }

  it('una jornada tiene un solo dueño', async () => {
    expect(
      await insertarJornada({
        entidad_id: ENTIDAD_PRUEBA,
        direccion: 'Calle 1',
        municipio: 'Bogotá',
      }),
    ).toBe('jornada_un_dueno');
    expect(await insertarJornada({ acopio_id: null })).toBe('jornada_un_dueno');
  });

  it('la jornada de entidad lleva su lugar', async () => {
    expect(await insertarJornada({ acopio_id: null, entidad_id: ENTIDAD_PRUEBA })).toBe(
      'jornada_entidad_con_lugar',
    );
    expect(
      await insertarJornada({
        acopio_id: null,
        entidad_id: ENTIDAD_PRUEBA,
        direccion: 'Calle 1',
        municipio: 'Bogotá',
      }),
    ).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('cupo de 1 a 500 y fin después del inicio', async () => {
    expect(await insertarJornada({ cupo_maximo: 0 })).toBe('jornada_cupo');
    expect(await insertarJornada({ cupo_maximo: 501 })).toBe('jornada_cupo');
    expect(await insertarJornada({ cupo_maximo: 500 })).toMatch(/^[0-9a-f-]{36}$/);
    expect(await insertarJornada({ fin: '2026-11-02T13:00:00Z' })).toBe('jornada_horario');
    expect(await insertarJornada({ cupos_ajuste_manual: -1 })).toBe('jornada_ajuste');
  });

  it('un correo tiene una sola reserva viva por jornada (T-10)', async () => {
    const j = await insertarJornada({});
    const correo = `${unico('ana')}@demo.test`;
    expect(await insertarReserva(j, correo)).toBe('ok');
    expect(await insertarReserva(j, correo)).toBe('reserva_correo_unico');

    const k = await insertarJornada({});
    expect(await insertarReserva(k, correo, 'CANCELADA')).toBe('ok');
    expect(await insertarReserva(k, correo)).toBe('ok');
  });

  it('acopio_app no puede borrar reservas', async () => {
    await expect(app.query('DELETE FROM reserva WHERE false')).rejects.toThrow(/permission denied/);
  });
});
