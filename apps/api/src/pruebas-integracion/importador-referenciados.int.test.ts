import { ErrorDominio } from '../comun/errores/error-dominio';
import type { FuenteAcopios } from '../modulos/importacion/fuentes/fuente-acopios';
import type { PuntoFuente } from '../modulos/importacion/fuentes/tipos';
import { ImportadorReferenciadosService } from '../modulos/importacion/importador-referenciados.service';
import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';

const punto = (fuenteId: string, extra: Partial<PuntoFuente> = {}): PuntoFuente => ({
  fuenteId,
  nombre: `Punto ${fuenteId}`,
  direccion: `Calle ${fuenteId}`,
  lat: 4.7,
  lng: -74.05,
  estado: 'abierto',
  horario: '8:00 am - 5:00 pm',
  necesidades: [{ nivel: 'urgente', texto: 'Agua' }],
  contacto: { phone: '3000000000' },
  actualizadoEn: new Date('2026-10-01T12:00:00Z'),
  verificado: true,
  ...extra,
});

/** Una fuente en memoria con nombre propio: la base es compartida y nadie más la toca. */
class FuenteFalsa implements FuenteAcopios {
  readonly nombre = unico('prueba-');
  readonly origen = 'ARCHIVO' as const;
  readonly etiqueta = 'Fuente de prueba';
  readonly url = 'https://fuente.prueba/';
  readonly municipio = 'Bogotá';
  puntos: PuntoFuente[] = [];
  fallar = false;
  async leer() {
    if (this.fallar) throw new ErrorDominio('FORMATO_FUENTE', 'cambió el formato', 502);
    return { puntos: this.puntos, plataformas: [] };
  }
}

/** Pieza E: el importador de puntos referenciados (RF-RED-011). */
describe('importador de referenciados', () => {
  let a: AppPrueba;
  let importador: ImportadorReferenciadosService;
  let fuente: FuenteFalsa;

  beforeAll(async () => {
    a = await crearAppPrueba();
    importador = a.app.get(ImportadorReferenciadosService);
    fuente = new FuenteFalsa();
    fuente.puntos = [
      punto('a', { estado: 'abierto' }),
      punto('b', { estado: 'lleno' }),
      punto('c', { estado: 'cerrado' }),
      punto('x', { verificado: false }),
    ];
  });
  afterAll(() => a.cerrar());

  const fila = (fuenteId: string) =>
    a.prisma.acopio.findUnique({
      where: { fuente_fuente_id: { fuente: fuente.nombre, fuente_id: fuenteId } },
    });

  it('la primera lectura crea los verificados, con el estado traducido y el texto original', async () => {
    const r = await importador.ejecutar(fuente, null);
    expect(r).toEqual({ resultado: 'OK', creados: 3, actualizados: 0, cerrados: 0, motivo: null });
    expect(await fila('a')).toMatchObject({
      tipo: 'REFERENCIADO',
      estado: 'ACTIVO',
      municipio: 'Bogotá',
      fuente_estado: 'abierto',
      entidad_id: null,
    });
    expect(await fila('b')).toMatchObject({ estado: 'PAUSADO', fuente_estado: 'lleno' });
    expect(await fila('c')).toMatchObject({ estado: 'CERRADO' });
    expect(await fila('x')).toBeNull();
  });

  it('leer lo mismo otra vez no cambia nada', async () => {
    const r = await importador.ejecutar(fuente, null);
    expect(r).toMatchObject({ creados: 0, actualizados: 0, cerrados: 0 });
  });

  it('solo cuenta como actualizado el punto que cambió en la fuente', async () => {
    fuente.puntos = fuente.puntos.map((p) =>
      p.fuenteId === 'b'
        ? { ...p, estado: 'abierto', actualizadoEn: new Date('2026-10-05T12:00:00Z') }
        : p,
    );
    const r = await importador.ejecutar(fuente, null);
    expect(r).toMatchObject({ creados: 0, actualizados: 1, cerrados: 0 });
    expect(await fila('b')).toMatchObject({ estado: 'ACTIVO', fuente_estado: 'abierto' });
  });

  it('respeta lo que ocultó el Administrador', async () => {
    await a.prisma.acopio.update({
      where: { id: (await fila('c'))!.id },
      data: { oculto_por_admin: true },
    });
    await importador.ejecutar(fuente, null);
    expect(await fila('c')).toMatchObject({ oculto_por_admin: true });
  });

  it('un punto que desaparece de la fuente se cierra y no se borra', async () => {
    fuente.puntos = fuente.puntos.filter((p) => p.fuenteId !== 'a');
    const r = await importador.ejecutar(fuente, null);
    expect(r).toMatchObject({ creados: 0, cerrados: 1 });
    expect(await fila('a')).toMatchObject({ estado: 'CERRADO' });
  });

  it('deja en la bitácora un resumen de cada lectura buena', async () => {
    const eventos = await a.prisma.bitacora.findMany({
      where: { accion: 'importacion.ejecutada', entidad_id: fuente.nombre },
      orderBy: { ocurrido_en: 'asc' },
    });
    expect(eventos.length).toBeGreaterThanOrEqual(5);
    expect(eventos[0]).toMatchObject({
      usuario_id: null,
      datos_despues: expect.objectContaining({ creados: 3, actualizados: 0, cerrados: 0 }),
    });
  });

  it('si la fuente cambió de formato no escribe nada y deja la ejecución abortada', async () => {
    const antes = await a.prisma.acopio.findMany({ where: { fuente: fuente.nombre } });
    fuente.fallar = true;
    const r = await importador.ejecutar(fuente, null);
    expect(r).toMatchObject({ resultado: 'ABORTADA', motivo: 'cambió el formato' });
    expect(await a.prisma.acopio.findMany({ where: { fuente: fuente.nombre } })).toEqual(antes);
    const ultima = await a.prisma.importacionEjecucion.findFirst({
      where: { fuente: fuente.nombre },
      orderBy: { inicio: 'desc' },
    });
    expect(ultima).toMatchObject({ resultado: 'ABORTADA', motivo: 'cambió el formato' });
    fuente.fallar = false;
  });

  it('un Operador no puede correr la importación', async () => {
    const admin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
    const op = await crearUsuarioActivo(a, admin, { rol: 'OPERADOR' });
    await a
      .http()
      .post('/api/importacion/fuentes/redacopio/ejecutar')
      .set({ authorization: `Bearer ${op.token}` })
      .expect(403);
  });
});
