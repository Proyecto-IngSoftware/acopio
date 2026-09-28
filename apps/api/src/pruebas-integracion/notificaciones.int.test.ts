import { createTransport } from 'nodemailer';
import { crearAppPrueba, type AppPrueba } from '../../test/app-prueba';
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

  const encolar = (destinatario: string) =>
    servicio.encolar(
      a.prisma,
      destinatario,
      plantillas.asignacion({ nombre: 'Ana', ubicacion: 'un acopio' }),
    );

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
});
