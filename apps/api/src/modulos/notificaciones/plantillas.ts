/**
 * Plantillas de correo. Texto plano primero: llega bien a cualquier cliente y no cae
 * tan fácil en spam. El HTML es el mismo texto con enlaces.
 */
export interface CorreoRedactado {
  asunto: string;
  texto: string;
  html: string;
}

type Plantilla<D> = (datos: D) => CorreoRedactado;

const pie = '\n\n—\nAcopio · coordinación logística para respuesta a desastres';

function html(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:sans-serif;font-size:16px;line-height:1.5">${escapado.replace(/\n/g, '<br>')}</div>`;
}

function redactar(asunto: string, texto: string): CorreoRedactado {
  return { asunto, texto: texto + pie, html: html(texto + pie) };
}

export const plantillas = {
  confirmarDonador: ((d: { nombre: string; enlace: string; venceEn: Date }) =>
    redactar(
      'Confirma tu correo en Acopio',
      `Hola, ${d.nombre}.\n\nConfirma tu correo para empezar a preparar donaciones:\n${d.enlace}\n\nEl enlace vence el ${fecha(d.venceEn)}. Si no creaste una cuenta en Acopio, ignora este correo.`,
    )) satisfies Plantilla<never>,

  cuentaExistente: ((d: { enlaceEntrar: string }) =>
    redactar(
      'Ya tienes una cuenta en Acopio',
      `Alguien intentó crear una cuenta de Donador con este correo, que ya tiene una cuenta.\n\nSi fuiste tú, entra aquí:\n${d.enlaceEntrar}\n\nSi no fuiste tú, no tienes que hacer nada.`,
    )) satisfies Plantilla<never>,

  invitacion: ((d: { nombre: string; username: string; enlace: string; venceEn: Date }) =>
    redactar(
      'Tu acceso a Acopio',
      `Hola, ${d.nombre}.\n\nTe dieron acceso a la consola de Acopio con el usuario «${d.username}».\n\nDefine tu contraseña en este enlace:\n${d.enlace}\n\nEl enlace sirve una sola vez y vence el ${fecha(d.venceEn)}.`,
    )) satisfies Plantilla<never>,

  restablecimiento: ((d: { nombre: string; username: string; enlace: string; venceEn: Date }) =>
    redactar(
      'Se restableció tu acceso a Acopio',
      `Hola, ${d.nombre}.\n\nUn administrador restableció el acceso del usuario «${d.username}». Tu contraseña anterior deja de servir cuando definas la nueva.\n\nDefine tu nueva contraseña aquí:\n${d.enlace}\n\nEl enlace vence el ${fecha(d.venceEn)}. Si no esperabas este correo, avisa a un administrador.`,
    )) satisfies Plantilla<never>,

  avisoRestablecimientoAdmin: ((d: {
    admin: string;
    afectado: string;
    autor: string;
    motivo: string;
  }) =>
    redactar(
      'Aviso: se restableció un acceso en Acopio',
      `Hola, ${d.admin}.\n\n${d.autor} restableció el acceso de «${d.afectado}».\n\nMotivo: ${d.motivo}\n\nQueda registrado en la bitácora como evento destacado.`,
    )) satisfies Plantilla<never>,

  asignacion: ((d: { nombre: string; ubicacion: string }) =>
    redactar(
      'Tienes una ubicación nueva en Acopio',
      `Hola, ${d.nombre}.\n\nTe asignaron ${d.ubicacion}. Ya la ves en el selector de ubicación de la consola.`,
    )) satisfies Plantilla<never>,

  revocacion: ((d: { nombre: string; ubicacion: string }) =>
    redactar(
      'Se retiró una ubicación de tu acceso en Acopio',
      `Hola, ${d.nombre}.\n\nYa no tienes asignada ${d.ubicacion}. Si crees que es un error, avisa a un administrador.`,
    )) satisfies Plantilla<never>,

  rechazoDonacion: ((d: { nombre: string; folio: string; motivo: string; nota: string | null }) =>
    redactar(
      `Tu donación ${d.folio} no se pudo conciliar`,
      `Hola, ${d.nombre}.\n\nEl equipo del acopio revisó tu donación ${d.folio} y no la pudo conciliar.\n\nMotivo: ${d.motivo}${d.nota ? `. ${d.nota}` : ''}\n\nLo que llegó sigue en el acopio. Si crees que es un error, responde a este correo.`,
    )) satisfies Plantilla<never>,

  reservaConfirmada: ((d: {
    nombre: string;
    titulo: string;
    lugar: string;
    inicio: Date;
    queLlevar: string | null;
    codigo: string;
    enlace: string;
  }) =>
    redactar(
      `Tu reserva en Acopio: ${d.titulo}`,
      `Hola, ${d.nombre}.\n\nReservaste un cupo en «${d.titulo}».\n\nCuándo: ${fecha(d.inicio)}\nDónde: ${d.lugar}${d.queLlevar ? `\nQué llevar: ${d.queLlevar}` : ''}\nCódigo de reserva: ${d.codigo}\n\nGuarda este enlace: con él ves tu reserva o la cancelas. Es el único, no se puede recuperar:\n${d.enlace}\n\nSi no puedes ir, cancela para que otra persona tome el cupo. El cupo es una reserva: en el lugar puede haber gente que llegó sin reservar.`,
    )) satisfies Plantilla<never>,

  reservaCancelada: ((d: { nombre: string; titulo: string; inicio: Date }) =>
    redactar(
      `Cancelaste tu reserva: ${d.titulo}`,
      `Hola, ${d.nombre}.\n\nCancelaste tu cupo en «${d.titulo}» del ${fecha(d.inicio)}. Gracias por liberarlo: otra persona puede tomarlo.`,
    )) satisfies Plantilla<never>,

  jornadaCambiada: ((d: {
    nombre: string;
    titulo: string;
    lugar: string;
    inicio: Date;
    enlaceJornada: string;
  }) =>
    redactar(
      `Cambió la jornada: ${d.titulo}`,
      `Hola, ${d.nombre}.\n\nLa jornada «${d.titulo}» en la que tienes cupo cambió.\n\nAhora es: ${fecha(d.inicio)}\nDónde: ${d.lugar}\n\nMira el detalle aquí:\n${d.enlaceJornada}\n\nSi ya no puedes ir, cancela con el enlace de tu primer correo.`,
    )) satisfies Plantilla<never>,

  jornadaCancelada: ((d: { nombre: string; titulo: string; inicio: Date; motivo: string }) =>
    redactar(
      `Se canceló la jornada: ${d.titulo}`,
      `Hola, ${d.nombre}.\n\nSe canceló la jornada «${d.titulo}» del ${fecha(d.inicio)}, en la que tenías cupo.\n\nMotivo: ${d.motivo}\n\nNo tienes que hacer nada. Gracias por querer ayudar.`,
    )) satisfies Plantilla<never>,

  recordatorioJornada: ((d: {
    nombre: string;
    titulo: string;
    lugar: string;
    inicio: Date;
    queLlevar: string | null;
    enlaceJornada: string;
  }) =>
    redactar(
      `Mañana: ${d.titulo}`,
      `Hola, ${d.nombre}.\n\nTe recordamos tu cupo en «${d.titulo}».\n\nCuándo: ${fecha(d.inicio)}\nDónde: ${d.lugar}${d.queLlevar ? `\nQué llevar: ${d.queLlevar}` : ''}\n\nDetalle de la jornada:\n${d.enlaceJornada}\n\nSi ya no puedes ir, cancela con el enlace de tu primer correo.`,
    )) satisfies Plantilla<never>,
};

function fecha(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(d);
}
