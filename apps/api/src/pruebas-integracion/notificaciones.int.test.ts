import { SchedulerRegistry } from '@nestjs/schedule';
import { createTransport } from 'nodemailer';
import { crearAppPrueba, type AppPrueba } from '../../test/app-prueba';
import { ENTORNO, type Entorno } from '../config/entorno';
import { CorreoSalienteDao } from '../modulos/notificaciones/dao/correo-saliente.dao';
import { MAX_INTENTOS, NotificacionService } from '../modulos/notificaciones/notificacion.service';
import { plantillas } from '../modulos/notificaciones/plantillas';

/** T10: cola de correo con reintentos. */
describe('notificaciones', () => {
  let a: AppPrueba;
  let servicio: NotificacionService;
  const usarTransporte = (t: unknown) => {
    (servicio as unknown as { transporte: unknown }).transporte = t;
  };

  beforeAll(async () => {
    a = await crearAppPrueba();
    servicio = a.app.get(NotificacionService);
    await a.prisma.correoSaliente.deleteMany({});
  });
  afterAll(() => a.cerrar());

  const encolar = async (destinatario: string) => {
    const fila = await servicio.encolar(
      a.prisma,
      destinatario,
      plantillas.asignacion({ nombre: 'Ana', ubicacion: 'un acopio' }),
    );
    if (!fila) throw new Error('el correo está encendido en las pruebas: encolar devuelve la fila');
    return fila;
  };

  it('las tareas programadas no corren solas durante las pruebas', () => {
    // Una tarea real que se dispara a mitad de una suite escribe después del cierre
    expect(a.app.get(SchedulerRegistry).getCronJobs().size).toBe(0);
  });

  it('con el SMTP arriba, el correo sale y queda ENVIADO', async () => {
    usarTransporte(createTransport({ jsonTransport: true }));
    const { id } = await encolar('ana@acopio.test');
    const resultado = await servicio.procesarCola();
    expect(resultado.enviados).toBeGreaterThanOrEqual(1);
    const correo = await a.prisma.correoSaliente.findUniqueOrThrow({ where: { id } });
    expect(correo).toMatchObject({ estado: 'ENVIADO', intentos: 1 });
    expect(correo.enviado_en).not.toBeNull();
  });

  it('con el SMTP caído queda FALLIDO, espera, y sale solo cuando vuelve', async () => {
    usarTransporte({ sendMail: () => Promise.reject(new Error('conexión rechazada')) });
    const { id } = await encolar('beto@acopio.test');
    await servicio.procesarCola();
    let correo = await a.prisma.correoSaliente.findUniqueOrThrow({ where: { id } });
    expect(correo).toMatchObject({
      estado: 'FALLIDO',
      intentos: 1,
      ultimo_error: 'conexión rechazada',
    });
    expect(correo.enviar_despues_de.getTime()).toBeGreaterThan(Date.now());

    // Antes de su turno no se reintenta
    usarTransporte(createTransport({ jsonTransport: true }));
    await servicio.procesarCola();
    correo = await a.prisma.correoSaliente.findUniqueOrThrow({ where: { id } });
    expect(correo.estado).toBe('FALLIDO');

    // Llegado su turno, sale
    await a.prisma.correoSaliente.update({
      where: { id },
      data: { enviar_despues_de: new Date() },
    });
    await servicio.procesarCola();
    correo = await a.prisma.correoSaliente.findUniqueOrThrow({ where: { id } });
    expect(correo).toMatchObject({ estado: 'ENVIADO', intentos: 2 });
  });

  it('con CORREO_ACTIVO=false no encola ni envía (P-055)', async () => {
    const apagado = new NotificacionService(a.app.get(CorreoSalienteDao), {
      ...a.app.get<Entorno>(ENTORNO),
      CORREO_ACTIVO: false,
    });
    const enviar = jest.fn();
    (apagado as unknown as { transporte: unknown }).transporte = { sendMail: enviar };
    const antes = await a.prisma.correoSaliente.count();

    const fila = await apagado.encolar(
      a.prisma,
      'dani@acopio.test',
      plantillas.asignacion({ nombre: 'Dani', ubicacion: 'un acopio' }),
    );
    expect(fila).toBeNull();
    expect(await a.prisma.correoSaliente.count()).toBe(antes);

    // Lo que ya estaba en la cola tampoco sale mientras el correo esté apagado
    await encolar('eva@acopio.test');
    expect(await apagado.procesarCola()).toEqual({ enviados: 0, fallidos: 0 });
    expect(enviar).not.toHaveBeenCalled();
  });

  it('después del máximo de intentos no se reintenta más', async () => {
    usarTransporte({ sendMail: () => Promise.reject(new Error('sin salida')) });
    const { id } = await encolar('caro@acopio.test');
    await a.prisma.correoSaliente.update({
      where: { id },
      data: { intentos: MAX_INTENTOS, estado: 'FALLIDO' },
    });
    await servicio.procesarCola();
    const correo = await a.prisma.correoSaliente.findUniqueOrThrow({ where: { id } });
    expect(correo.intentos).toBe(MAX_INTENTOS);
  });

  it('con dos instancias a la vez, cada correo sale una sola vez (P-089)', async () => {
    const destinatarios = Array.from({ length: 6 }, (_, i) => `doble${i}@acopio.test`);
    for (const d of destinatarios) await encolar(d);

    // Un SMTP lento deja a las dos instancias leyendo la cola al mismo tiempo
    const enviados: string[] = [];
    const lento = {
      sendMail: async (m: { to: string }) => {
        await new Promise((r) => setTimeout(r, 50));
        enviados.push(m.to);
      },
    };
    const otra = new NotificacionService(a.app.get(CorreoSalienteDao), a.app.get<Entorno>(ENTORNO));
    usarTransporte(lento);
    (otra as unknown as { transporte: unknown }).transporte = lento;

    await Promise.all([servicio.procesarCola(), otra.procesarCola()]);

    const propios = enviados.filter((d) => destinatarios.includes(d)).sort();
    expect(propios).toEqual([...destinatarios].sort());
  });
});
