import { puedeMarcarAsistencia } from '@acopio/shared';
import { useState } from 'react';
import {
  useAjustarCupos,
  useBorrarJornada,
  useCambiarEstadoJornada,
  useInscritos,
  type JornadaGestion,
} from '../../api/turnos';
import { Boton } from '../../componentes/Boton';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Esqueleto } from '../../componentes/Esqueleto';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { diaSemana, rangoHoras } from '../../formato';
import { EstadoCupos } from '../../portal/turnos/piezas';
import { FormularioError } from '../catalogo/FormularioError';
import { Inscritos } from './Inscritos';
import { MarcaGestion } from './Turnos';

type Pestana = 'inscritos' | 'acciones';
type Pregunta = 'cancelar' | 'borrar' | null;

/** C14: una jornada, con sus inscritos, el ajuste manual y las acciones (RF-TUR-005). */
export function DetalleJornada({
  jornada,
  alVolver,
  alEditar,
}: {
  jornada: JornadaGestion;
  alVolver: () => void;
  alEditar: () => void;
}) {
  const [pestana, fijarPestana] = useState<Pestana>('inscritos');
  const inscritos = useInscritos(jornada.id);
  const vigentes = (inscritos.data ?? []).filter((i) => i.estado !== 'CANCELADA');
  const cancelada = jornada.estado === 'CANCELADA';
  const asistenciaAbierta =
    !cancelada &&
    puedeMarcarAsistencia(new Date(jornada.inicio), new Date(jornada.fin), new Date());

  return (
    <div className="flex flex-col gap-space-md">
      <button
        type="button"
        onClick={alVolver}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Turnos
      </button>
      <MarcaGestion jornada={jornada} />
      <div className="flex flex-col">
        <h1 className="text-headline-md text-balance text-on-surface">{jornada.titulo}</h1>
        <p className="text-body-sm text-on-surface-variant">
          {diaSemana(jornada.inicio)} · {rangoHoras(jornada.inicio, jornada.fin)} ·{' '}
          {jornada.lugar.nombre}
        </p>
      </div>
      {cancelada && jornada.motivoCancelacion && (
        <p className="rounded-xl bg-surface-container p-space-sm text-body-sm text-on-surface">
          Cancelada: «{jornada.motivoCancelacion}»
        </p>
      )}
      <EstadoCupos jornada={jornada} />
      {!cancelada && <Ajuste jornada={jornada} />}
      <Segmentado
        etiqueta="Qué ver de la jornada"
        valor={pestana}
        alCambiar={fijarPestana}
        opciones={[
          { valor: 'inscritos', texto: `Inscritos (${vigentes.length})` },
          { valor: 'acciones', texto: 'Acciones' },
        ]}
      />
      {pestana === 'inscritos' ? (
        inscritos.isPending ? (
          <Esqueleto etiqueta="Cargando los inscritos" />
        ) : inscritos.error ? (
          <EstadoError
            mensaje="No se pudieron cargar los inscritos."
            alReintentar={() => void inscritos.refetch()}
          />
        ) : vigentes.length === 0 ? (
          <EstadoVacio titulo="Nadie ha reservado todavía">
            Las reservas aparecen aquí con el nombre y el contacto de cada persona.
          </EstadoVacio>
        ) : (
          <>
            <Inscritos
              jornadaId={jornada.id}
              inscritos={vigentes}
              perfil={jornada.perfilRequerido}
              asistenciaAbierta={asistenciaAbierta}
            />
            <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
              <Icono nombre="mail" className="mt-0.5 text-[20px] text-primary-container" />
              Mientras el correo esté apagado, los avisos de cambios no salen. Copia el contacto
              para llamar.
            </p>
          </>
        )
      ) : (
        <Acciones
          jornada={jornada}
          sinReservas={inscritos.data !== undefined && inscritos.data.length === 0}
          alEditar={alEditar}
          alVolver={alVolver}
        />
      )}
    </div>
  );
}

/** Personas que llegaron sin reserva (RF-TUR-006): se guardan con su hora. */
function Ajuste({ jornada }: { jornada: JornadaGestion }) {
  const [cupos, fijarCupos] = useState(jornada.ajuste);
  const ajustar = useAjustarCupos(jornada.id);
  const boton =
    'flex h-11 w-11 items-center justify-center rounded-xl border border-outline text-on-surface disabled:opacity-40';
  return (
    <div className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <span className="text-label-md text-on-surface">Llegaron sin reserva</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Quitar una persona sin reserva"
            disabled={cupos === 0}
            onClick={() => fijarCupos((c) => Math.max(0, c - 1))}
            className={boton}
          >
            <Icono nombre="remove" className="text-[22px]" />
          </button>
          <b className="min-w-10 text-center text-headline-sm tabular-nums" aria-live="polite">
            {cupos}
          </b>
          <button
            type="button"
            aria-label="Sumar una persona sin reserva"
            onClick={() => fijarCupos((c) => c + 1)}
            className={boton}
          >
            <Icono nombre="add" className="text-[22px]" />
          </button>
        </span>
      </div>
      <FormularioError mensaje={ajustar.error?.message} />
      {cupos !== jornada.ajuste && (
        <Boton disabled={ajustar.isPending} onClick={() => ajustar.mutate(cupos)}>
          Guardar ajuste
        </Boton>
      )}
    </div>
  );
}

function Acciones({
  jornada,
  sinReservas,
  alEditar,
  alVolver,
}: {
  jornada: JornadaGestion;
  sinReservas: boolean;
  alEditar: () => void;
  alVolver: () => void;
}) {
  const cambiar = useCambiarEstadoJornada(jornada.id);
  const borrar = useBorrarJornada(jornada.id);
  const [pregunta, fijarPregunta] = useState<Pregunta>(null);
  const [motivo, fijarMotivo] = useState('');
  if (jornada.estado === 'CANCELADA')
    return (
      <EstadoVacio titulo="Esta jornada está cancelada">
        No se puede cambiar. Quienes reservaron ven el motivo en su enlace.
      </EstadoVacio>
    );

  const fila =
    'flex min-h-[52px] w-full items-center gap-space-sm border-t border-outline-variant px-space-md text-left text-label-md text-on-surface first:border-t-0 disabled:opacity-50';
  return (
    <div className="flex flex-col gap-space-sm">
      <FormularioError mensaje={cambiar.error?.message ?? borrar.error?.message} />
      <div className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest">
        <button type="button" onClick={alEditar} className={fila}>
          <Icono nombre="edit" className="text-[20px] text-primary-container" />
          Editar la jornada
        </button>
        {jornada.estado === 'ABIERTA' ? (
          <button
            type="button"
            disabled={cambiar.isPending}
            onClick={() => cambiar.mutate({ accion: 'cerrar' })}
            className={fila}
          >
            <Icono nombre="lock" className="text-[20px] text-primary-container" />
            Cerrar las reservas
          </button>
        ) : (
          <button
            type="button"
            disabled={cambiar.isPending}
            onClick={() => cambiar.mutate({ accion: 'reabrir' })}
            className={fila}
          >
            <Icono nombre="lock_open" className="text-[20px] text-primary-container" />
            Reabrir las reservas
          </button>
        )}
        <button type="button" onClick={() => fijarPregunta('cancelar')} className={fila}>
          <Icono nombre="event_busy" className="text-[20px] text-primary-container" />
          Cancelar la jornada
        </button>
        {sinReservas && (
          <button type="button" onClick={() => fijarPregunta('borrar')} className={fila}>
            <Icono nombre="delete" className="text-[20px] text-primary-container" />
            Borrar la jornada
          </button>
        )}
      </div>
      <p className="text-body-sm text-on-surface-variant">
        Cerrar no avisa a nadie y se puede reabrir mientras falten más de 12 horas. Cancelar avisa a
        quienes reservaron y no se deshace.
      </p>

      {pregunta === 'cancelar' && (
        <Hoja titulo="¿Cancelar la jornada?" alCerrar={() => fijarPregunta(null)}>
          <p className="text-body-md text-on-surface-variant">
            Las reservas dejan de contar y cada persona ve el motivo en su enlace. No se puede
            deshacer.
          </p>
          <div className="flex flex-col gap-space-xs">
            <label htmlFor="jornada-motivo" className="text-label-md text-on-surface">
              Motivo
            </label>
            <p id="jornada-motivo-ayuda" className="text-body-sm text-on-surface-variant">
              Al menos 5 caracteres. Lo ve quien reservó.
            </p>
            <textarea
              id="jornada-motivo"
              aria-describedby="jornada-motivo-ayuda"
              maxLength={300}
              value={motivo}
              onChange={(e) => fijarMotivo(e.target.value)}
              className="min-h-[88px] rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface"
            />
          </div>
          <FormularioError mensaje={cambiar.error?.message} />
          <Boton
            disabled={motivo.trim().length < 5 || cambiar.isPending}
            onClick={() =>
              cambiar.mutate(
                { accion: 'cancelar', motivo: motivo.trim() },
                { onSuccess: () => fijarPregunta(null) },
              )
            }
          >
            Cancelar jornada
          </Boton>
          <Boton variante="secundario" onClick={() => fijarPregunta(null)}>
            Volver
          </Boton>
        </Hoja>
      )}
      {pregunta === 'borrar' && (
        <Hoja titulo="¿Borrar la jornada?" alCerrar={() => fijarPregunta(null)}>
          <p className="text-body-md text-on-surface-variant">
            Nadie reservó en esta jornada. Se borra y deja de verse en el portal.
          </p>
          <FormularioError mensaje={borrar.error?.message} />
          <Boton
            disabled={borrar.isPending}
            onClick={() => borrar.mutate(undefined, { onSuccess: alVolver })}
          >
            Borrar jornada
          </Boton>
          <Boton variante="secundario" onClick={() => fijarPregunta(null)}>
            Volver
          </Boton>
        </Hoja>
      )}
    </div>
  );
}
