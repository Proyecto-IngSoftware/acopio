import { useState } from 'react';
import { useJornadasGestion, type JornadaGestion, type PestanaGestion } from '../../api/turnos';
import { Boton } from '../../componentes/Boton';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { rangoHoras } from '../../formato';
import { Marca, textoCupos } from '../../portal/turnos/piezas';
import { Encabezado } from '../Encabezado';
import { DetalleJornada } from './DetalleJornada';
import { FormularioJornada } from './FormularioJornada';

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'formulario'; jornada: JornadaGestion | null }
  | { tipo: 'detalle'; jornada: JornadaGestion };

/** «Mié 21 oct», en Bogotá. */
function diaCorto(iso: string): string {
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(iso));
  const de = (t: string) => (partes.find((p) => p.type === t)?.value ?? '').replace('.', '');
  const dia = de('weekday');
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${de('day')} ${de('month')}`;
}

/** El estado de la jornada como lo ve quien la gestiona. */
export function MarcaGestion({ jornada }: { jornada: JornadaGestion }) {
  if (jornada.estado === 'CANCELADA') return <Marca>Cancelada</Marca>;
  if (jornada.estado === 'CERRADA') return <Marca>Cerrada</Marca>;
  if (jornada.motivoSinReserva === 'LLENA') return <Marca>Llena</Marca>;
  if (jornada.motivoSinReserva === 'PLAZO') return <Marca>Reservas cerradas</Marca>;
  return <Marca tono="marca">Abierta</Marca>;
}

/** C14 Turnos (RF-TUR-001, RF-TUR-005): el Operador en sus acopios, el Administrador en todo. */
export function Turnos() {
  const [vista, fijarVista] = useState<Vista>({ tipo: 'lista' });
  const [pestana, fijarPestana] = useState<PestanaGestion>('proximas');
  const lista = useJornadasGestion(pestana);
  const volver = () => fijarVista({ tipo: 'lista' });

  if (vista.tipo === 'formulario')
    return <FormularioJornada jornada={vista.jornada} alTerminar={volver} />;
  if (vista.tipo === 'detalle') {
    // La jornada fresca de la lista, para ver al instante lo que cambian las acciones
    const jornada = lista.data?.find((j) => j.id === vista.jornada.id) ?? vista.jornada;
    return (
      <DetalleJornada
        jornada={jornada}
        alVolver={volver}
        alEditar={() => fijarVista({ tipo: 'formulario', jornada })}
      />
    );
  }

  const { data, isPending, error, refetch } = lista;
  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado
        titulo="Turnos"
        subtitulo="Jornadas de voluntariado. Las reservas se cierran 12 horas antes del inicio."
      />
      <Boton
        className="min-h-[56px] w-full"
        onClick={() => fijarVista({ tipo: 'formulario', jornada: null })}
      >
        <Icono nombre="add_circle" className="text-[20px]" />
        Nueva jornada
      </Boton>
      <Segmentado
        etiqueta="Qué jornadas ver"
        valor={pestana}
        alCambiar={fijarPestana}
        opciones={[
          { valor: 'proximas', texto: 'Próximas' },
          { valor: 'en-curso', texto: 'En curso' },
          { valor: 'pasadas', texto: 'Pasadas' },
        ]}
      />
      {isPending && <Esqueleto etiqueta="Cargando las jornadas" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="No hay jornadas aquí">
          {pestana === 'proximas'
            ? 'Crea una jornada para que la gente reserve su cupo.'
            : 'Las jornadas aparecen aquí según su fecha.'}
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {data?.map((j) => (
          <li key={j.id}>
            <button
              type="button"
              onClick={() => fijarVista({ tipo: 'detalle', jornada: j })}
              className="flex w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <MarcaGestion jornada={j} />
                <span className="text-body-lg font-semibold text-on-surface">{j.titulo}</span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono nombre="event" className="text-[16px]" />
                  {diaCorto(j.inicio)} · {rangoHoras(j.inicio, j.fin)}
                </span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono
                    nombre={j.lugar.tipo === 'ENTIDAD' ? 'verified' : 'warehouse'}
                    className="text-[16px]"
                  />
                  {j.lugar.nombre}
                </span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant tabular-nums">
                  <Icono nombre="group" className="text-[16px]" />
                  {textoCupos(j)}
                </span>
              </span>
              <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
