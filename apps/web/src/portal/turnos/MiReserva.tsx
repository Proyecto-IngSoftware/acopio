import { generarIcs } from '@acopio/shared';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import {
  useCancelarReserva,
  useConsultarReserva,
  type JornadaPublica,
  type ReservaPublica,
} from '../../api/turnos';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { EstadoError } from '../../componentes/EstadoError';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { diaSemana, fechaHora, rangoHoras } from '../../formato';
import { Aviso, Dato } from './piezas';

/** El secreto llega después del `#`: el navegador no lo manda al servidor (T-07). */
function secretoDe(hash: string): string | null {
  const crudo = hash.replace(/^#/, '');
  if (!crudo) return null;
  try {
    return decodeURIComponent(crudo);
  } catch {
    return null;
  }
}

/** P8 Mi reserva (RF-TUR-003, RF-TUR-004): la reserva de una persona sin cuenta. */
export function MiReserva() {
  const { codigo } = useParams();
  const { hash } = useLocation();
  const secreto = secretoDe(hash);
  const consulta = useConsultarReserva(codigo!, secreto);

  if (secreto === null)
    return (
      <Mensaje icono="link_off" titulo="Este enlace está incompleto">
        Le falta la parte final. Ábrelo desde el correo o copia el enlace completo que guardaste.
      </Mensaje>
    );
  if (consulta.isPending)
    return <Esqueleto etiqueta="Cargando tu reserva" className="m-margin h-64" />;
  // Si ya se cargó, un refetch fallido no la reemplaza: el enlace es la única copia
  if (consulta.data) return <Reserva reserva={consulta.data} secreto={secreto} />;
  if (consulta.error?.estado === 404)
    return (
      <Mensaje icono="search_off" titulo="No encontramos esa reserva">
        Revisa que el enlace esté completo. Si la jornada ya pasó, la reserva ya no se puede
        consultar.
      </Mensaje>
    );
  return (
    <div className="px-margin py-space-lg">
      <EstadoError
        mensaje="No se pudo cargar tu reserva. Revisa tu conexión e inténtalo de nuevo."
        alReintentar={() => void consulta.refetch()}
      />
    </div>
  );
}

function Mensaje({ icono, titulo, children }: { icono: string; titulo: string; children: string }) {
  return (
    <div className="flex flex-col items-center gap-space-sm px-margin py-space-xl text-center">
      <Icono nombre={icono} className="text-[40px] text-outline" />
      <h1 className="text-headline-sm text-on-surface">{titulo}</h1>
      <p className="max-w-[32ch] text-body-md text-on-surface-variant">{children}</p>
      <EnlaceBoton a="/voluntariado" variante="secundario" className="mt-space-sm">
        Ver jornadas
      </EnlaceBoton>
    </div>
  );
}

/** Google Maps con el punto, o con la dirección si la jornada no tiene punto. */
function comoLlegar(l: JornadaPublica['lugar']): string {
  const destino =
    l.lat !== null && l.lng !== null
      ? `${l.lat},${l.lng}`
      : encodeURIComponent(`${l.direccion}, ${l.municipio}`);
  return `https://www.google.com/maps/search/?api=1&query=${destino}`;
}

function descargarIcs(reserva: ReservaPublica) {
  const j = reserva.jornada;
  const texto = generarIcs({
    uid: `${reserva.codigo}@acopio`,
    titulo: j.titulo,
    lugar: `${j.lugar.nombre}, ${j.lugar.direccion}, ${j.lugar.municipio}`,
    descripcion: [
      `Código de reserva: ${reserva.codigo}`,
      j.descripcion,
      ...(j.queLlevar ? [`Qué llevar: ${j.queLlevar}`] : []),
    ].join('\n'),
    inicio: new Date(j.inicio),
    fin: new Date(j.fin),
    creado: new Date(),
  });
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/calendar;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `reserva-${reserva.codigo}.ics`;
  enlace.click();
  // Algunos navegadores cortan la descarga si la URL se libera en el mismo instante
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function Reserva({ reserva, secreto }: { reserva: ReservaPublica; secreto: string }) {
  const { pathname, hash } = useLocation();
  const cancelar = useCancelarReserva(reserva.codigo);
  const [confirmando, fijarConfirmando] = useState(false);
  const [aviso, fijarAviso] = useState<string | null>(null);
  const j = reserva.jornada;

  if (reserva.estado === 'CANCELADA' || cancelar.isSuccess)
    return (
      <div className="flex flex-col items-center gap-space-sm px-margin py-space-xl text-center">
        <Icono nombre="event_available" className="text-[40px] text-outline" />
        <h1 className="text-headline-sm text-on-surface">Cancelaste tu reserva</h1>
        <p className="max-w-[32ch] text-body-md text-on-surface-variant">
          Tu cupo en «{j.titulo}» ya está libre.
        </p>
        <EnlaceBoton a="/voluntariado" className="mt-space-sm">
          Ver otras jornadas
        </EnlaceBoton>
      </div>
    );

  async function copiar() {
    const enlace = `${window.location.origin}${pathname}${hash}`;
    try {
      await navigator.clipboard.writeText(enlace);
      fijarAviso('Enlace copiado');
    } catch {
      fijarAviso('No se pudo copiar. Copia la dirección desde la barra del navegador.');
    }
  }

  const codigo = (
    <div className="flex flex-col items-center gap-space-xs rounded-xl bg-primary-container p-space-md text-on-primary">
      <span className="text-body-sm text-primary-fixed">Código de reserva</span>
      <b className="rounded-xl bg-on-primary/10 px-space-md py-space-xs text-[2rem] tracking-[0.18em] tabular-nums">
        {reserva.codigo}
      </b>
    </div>
  );

  if (j.estado === 'CANCELADA')
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        <h1 className="text-headline-lg-mobile text-on-surface">{j.titulo}</h1>
        {codigo}
        <Aviso icono="event_busy" titulo="Esta jornada se canceló">
          {j.motivoCancelacion ? `«${j.motivoCancelacion}». ` : ''}Tu reserva ya no cuenta; no
          tienes que hacer nada.
        </Aviso>
        <EnlaceBoton a="/voluntariado" variante="secundario">
          Ver otras jornadas
        </EnlaceBoton>
      </div>
    );

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <div className="flex flex-col items-center gap-space-xs text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary">
          <Icono nombre="check" className="text-[30px]" />
        </span>
        <h1 className="text-headline-sm text-on-surface">
          {reserva.estado === 'ACTIVA' ? 'Tu cupo está reservado' : 'Tu reserva'}
        </h1>
        <p className="text-body-md text-on-surface-variant">Muestra este código al llegar.</p>
      </div>
      {codigo}
      {reserva.jornadaCambiadaEn && (
        <div
          role="status"
          aria-label="La jornada cambió"
          className="flex items-start gap-space-sm rounded-xl border border-primary-container bg-primary-fixed p-space-sm text-body-sm text-primary"
        >
          <Icono nombre="update" className="mt-0.5 text-[20px]" />
          <span>
            <b className="block font-label-md">La jornada cambió</b>
            Cambiaron la hora o el lugar el {fechaHora(reserva.jornadaCambiadaEn)}. Revisa los datos
            de abajo antes de salir.
          </span>
        </div>
      )}
      <section
        aria-label="La jornada"
        className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
      >
        <h2 className="text-headline-sm text-on-surface">{j.titulo}</h2>
        <Dato icono="event">
          <b className="font-label-md text-on-surface">{diaSemana(j.inicio)}</b>
          <br />
          {rangoHoras(j.inicio, j.fin)}
        </Dato>
        <Dato icono="location_on">
          <b className="font-label-md text-on-surface">{j.lugar.nombre}</b>
          <br />
          {j.lugar.direccion}, {j.lugar.municipio}
        </Dato>
        <a
          href={comoLlegar(j.lugar)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center gap-space-xs rounded-xl border-[1.5px] border-primary-container bg-surface-container-lowest px-space-md text-label-md text-primary-container"
        >
          <Icono nombre="directions" className="text-[20px]" />
          Cómo llegar
        </a>
        {j.queLlevar && (
          <Dato icono="backpack">
            <b className="font-label-md text-on-surface">Qué llevar</b>
            <br />
            {j.queLlevar}
          </Dato>
        )}
      </section>
      <Aviso icono="bookmark" titulo="Guarda este enlace: es la única forma de volver a tu reserva">
        Mientras el correo no salga, no hay otra copia. Agrégalo al calendario o cópialo.
      </Aviso>
      <Boton onClick={() => descargarIcs(reserva)} className="min-h-[56px]">
        <Icono nombre="calendar_add_on" className="text-[20px]" />
        Agregar al calendario
      </Boton>
      <Boton variante="secundario" onClick={() => void copiar()} className="min-h-[56px]">
        <Icono nombre="link" className="text-[20px]" />
        Copiar enlace
      </Boton>
      {aviso && (
        <p role="status" className="text-center text-body-sm text-on-surface-variant">
          {aviso}
        </p>
      )}
      {/* La API acepta cancelar hasta la hora de inicio (§4) */}
      {reserva.estado === 'ACTIVA' && new Date(j.inicio) > new Date() ? (
        <button
          type="button"
          onClick={() => fijarConfirmando(true)}
          className="min-h-[48px] text-label-md text-primary"
        >
          Cancelar reserva
        </button>
      ) : (
        <p className="text-center text-body-sm text-on-surface-variant">
          La jornada ya empezó: la reserva ya no se puede cancelar.
        </p>
      )}

      {confirmando && (
        <Hoja titulo="¿Cancelar tu reserva?" alCerrar={() => fijarConfirmando(false)}>
          <p className="text-body-md text-on-surface-variant">
            Tu cupo en <b className="text-on-surface">{j.titulo}</b> queda libre para otra persona.
            Si cambias de idea, puedes volver a reservar mientras haya cupo.
          </p>
          {cancelar.error && (
            <p role="alert" className="text-body-sm text-on-surface">
              {cancelar.error.message}
            </p>
          )}
          <Boton disabled={cancelar.isPending} onClick={() => cancelar.mutate(secreto)}>
            Cancelar reserva
          </Boton>
          <Boton variante="secundario" onClick={() => fijarConfirmando(false)}>
            Mantener mi reserva
          </Boton>
        </Hoja>
      )}
    </div>
  );
}
