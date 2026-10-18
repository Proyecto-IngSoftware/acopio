import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useJornada, useReservar, type JornadaPublica, type Perfil } from '../../api/turnos';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { EstadoError } from '../../componentes/EstadoError';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import { diaSemana, rangoHoras } from '../../formato';
import { Aviso, Dato, EstadoCupos, Marca, NOMBRE_PERFIL, marcaJornada, requisitos } from './piezas';

const TELEFONO = /^[0-9+ -]{7,20}$/;

/** Lo que declara quien reserva una jornada que pide un perfil (T-04). */
const DECLARACION: Record<Perfil, string> = {
  VETERINARIO: 'Tengo título de medicina veterinaria',
  MEDICO: 'Tengo título de medicina',
  PSICOLOGO: 'Tengo título de psicología',
  CUIDADOR_ADULTO_MAYOR: 'Tengo experiencia cuidando adultos mayores',
  CONDUCTOR_C2: 'Tengo licencia de conducción C2',
};

/** P7 Reservar (RF-TUR-003, HU-03): el detalle de la jornada y el formulario. */
export function Reservar() {
  const { id } = useParams();
  const { data, isPending, error, refetch } = useJornada(id!);

  if (isPending) return <Esqueleto etiqueta="Cargando la jornada" className="m-margin h-64" />;
  // Si ya se cargó, un refetch fallido no borra el formulario
  if (data) return <Detalle jornada={data} />;
  if (error.estado !== 404)
    return (
      <div className="px-margin py-space-lg">
        <EstadoError
          mensaje="No se pudo cargar la jornada. Revisa tu conexión e inténtalo de nuevo."
          alReintentar={() => void refetch()}
        />
      </div>
    );
  return (
    <div className="flex flex-col gap-space-md px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile text-on-surface">Esta jornada no existe</h1>
      <p className="text-body-md text-on-surface-variant">
        Puede que el enlace esté incompleto o que la jornada ya haya pasado.
      </p>
      <EnlaceBoton a="/voluntariado">Ver las jornadas</EnlaceBoton>
    </div>
  );
}

function Detalle({ jornada }: { jornada: JornadaPublica }) {
  const marca = marcaJornada(jornada);
  const lista = requisitos(jornada.requisitos);
  return (
    <article className="flex flex-col gap-space-md px-margin py-space-md">
      <Link
        to="/voluntariado"
        className="flex min-h-[44px] items-center gap-space-xs self-start text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[22px]" />
        Voluntariado
      </Link>
      {(marca || jornada.perfilRequerido) && (
        <span className="flex flex-wrap gap-space-xs">
          {marca && <Marca>{marca}</Marca>}
          {jornada.perfilRequerido && (
            <Marca tono="marca">{NOMBRE_PERFIL[jornada.perfilRequerido]}</Marca>
          )}
        </span>
      )}
      <h1 className="text-headline-lg-mobile text-balance text-on-surface">{jornada.titulo}</h1>
      <Dato
        icono={jornada.lugar.tipo === 'ENTIDAD' ? 'verified' : 'warehouse'}
        relleno={jornada.lugar.tipo === 'ENTIDAD'}
      >
        <b className="font-label-md text-on-surface">{jornada.lugar.nombre}</b>
        <br />
        {jornada.lugar.direccion}, {jornada.lugar.municipio}
      </Dato>
      <Dato icono="event">
        <b className="font-label-md text-on-surface">{diaSemana(jornada.inicio)}</b>
        <br />
        {rangoHoras(jornada.inicio, jornada.fin)}
      </Dato>

      {jornada.estado === 'CANCELADA' ? (
        <>
          <Aviso icono="event_busy" titulo="Esta jornada se canceló">
            {jornada.motivoCancelacion ? `«${jornada.motivoCancelacion}»` : null}
          </Aviso>
          <EnlaceBoton a="/voluntariado" variante="secundario">
            Ver otras jornadas
          </EnlaceBoton>
        </>
      ) : (
        <>
          <EstadoCupos jornada={jornada} />
          <p className="text-body-md text-on-surface-variant">
            <b className="text-on-surface">Labor.</b> {jornada.descripcion}
          </p>
          {jornada.queLlevar && (
            <p className="text-body-md text-on-surface-variant">
              <b className="text-on-surface">Qué llevar.</b> {jornada.queLlevar}
            </p>
          )}
          {lista.length > 0 && (
            <Aviso icono="checklist" titulo="Requisitos">
              {lista.join(' · ')}
            </Aviso>
          )}
          <Aviso icono="info">
            Puede haber gente que llegó sin reserva. Los cupos cuentan reservas, no personas
            presentes.
          </Aviso>
          {jornada.aceptaReservas ? (
            <Formulario jornada={jornada} />
          ) : (
            <>
              <Aviso icono="schedule" titulo={motivoCerrada(jornada)}>
                {jornada.motivoSinReserva === 'PLAZO'
                  ? 'Así quien organiza sabe a tiempo cuánta gente esperar.'
                  : null}
              </Aviso>
              <EnlaceBoton a="/voluntariado" variante="secundario">
                Ver otras jornadas
              </EnlaceBoton>
            </>
          )}
        </>
      )}
    </article>
  );
}

function motivoCerrada(j: JornadaPublica): string {
  switch (j.motivoSinReserva) {
    case 'PLAZO':
      return 'Las reservas se cerraron 12 horas antes del inicio';
    case 'LLENA':
      return 'Esta jornada ya no tiene cupos';
    default:
      return 'Esta jornada no está recibiendo reservas';
  }
}

function Formulario({ jornada }: { jornada: JornadaPublica }) {
  const navegar = useNavigate();
  const reservar = useReservar(jornada.id);
  const [nombre, fijarNombre] = useState('');
  const [correo, fijarCorreo] = useState('');
  const [telefono, fijarTelefono] = useState('');
  const [perfil, fijarPerfil] = useState(false);
  const [acepta, fijarAcepta] = useState(false);
  const pidePerfil = jornada.perfilRequerido !== null;
  // Los mismos límites que la API: así el error se ve antes de enviar
  const telefonoMal = telefono.trim() !== '' && !TELEFONO.test(telefono.trim());
  const listo =
    nombre.trim().length >= 2 &&
    correo.trim() !== '' &&
    !telefonoMal &&
    acepta &&
    (!pidePerfil || perfil);

  function enviar(e: FormEvent) {
    e.preventDefault();
    reservar.mutate(
      {
        nombre: nombre.trim(),
        correo: correo.trim(),
        ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
        perfilDeclarado: perfil,
      },
      {
        onSuccess: (r) =>
          void navegar(`/voluntariado/reserva/${r.codigo}#${encodeURIComponent(r.secreto)}`),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-md pt-space-sm">
      <h2 className="text-headline-sm text-on-surface">Tus datos</h2>
      <Campo
        id="reserva-nombre"
        etiqueta="Nombre"
        autoComplete="name"
        minLength={2}
        maxLength={120}
        required
        value={nombre}
        onChange={(e) => fijarNombre(e.target.value)}
      />
      <Campo
        id="reserva-correo"
        etiqueta="Correo"
        type="email"
        autoComplete="email"
        required
        value={correo}
        onChange={(e) => fijarCorreo(e.target.value)}
        ayuda="Ahí te llega la confirmación cuando el correo esté activo."
      />
      <Campo
        id="reserva-telefono"
        etiqueta="Teléfono (opcional)"
        type="tel"
        autoComplete="tel"
        value={telefono}
        onChange={(e) => fijarTelefono(e.target.value)}
        ayuda={
          telefonoMal
            ? 'Escribe solo números, espacios, + o -, entre 7 y 20 caracteres.'
            : 'Para que te avisen si algo cambia.'
        }
      />
      {jornada.perfilRequerido && (
        <label className="flex items-start gap-space-sm text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={perfil}
            onChange={(e) => fijarPerfil(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-primary-container"
          />
          <span>
            {DECLARACION[jornada.perfilRequerido]}
            <span className="block text-body-sm text-on-surface-variant">
              El acopio o la entidad puede pedirte que lo demuestres al llegar.
            </span>
          </span>
        </label>
      )}
      <label className="flex items-start gap-space-sm text-body-md text-on-surface">
        <input
          type="checkbox"
          checked={acepta}
          onChange={(e) => fijarAcepta(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-primary-container"
        />
        <span>
          Acepto que guarden mi nombre, correo y teléfono para esta reserva, según la{' '}
          <Link to="/privacidad" className="text-primary-container underline">
            política de privacidad
          </Link>
          . Se borran 30 días después de la jornada.
        </span>
      </label>
      {reservar.error && (
        <p
          role="alert"
          className="flex items-start gap-space-sm rounded-xl border border-outline bg-surface-container-high p-space-sm text-body-sm text-on-surface"
        >
          <Icono nombre="error" className="mt-0.5 text-[20px] text-primary" />
          <span>
            {reservar.error.message}
            {(reservar.error.codigo === 'JORNADA_LLENA' ||
              reservar.error.codigo === 'RESERVAS_CERRADAS') && (
              <>
                {' '}
                <Link to="/voluntariado" className="text-primary-container underline">
                  Ver otras jornadas
                </Link>
              </>
            )}
          </span>
        </p>
      )}
      <Boton type="submit" disabled={!listo || reservar.isPending} className="min-h-[56px]">
        Reservar
      </Boton>
      <p className="flex items-center justify-center gap-1 text-body-sm text-on-surface-variant">
        <Icono nombre="schedule" className="text-[16px]" />
        Las reservas se cierran 12 horas antes del inicio.
      </p>
    </form>
  );
}
