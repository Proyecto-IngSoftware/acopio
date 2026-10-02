import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router';
import { useAcopiosGestion, useNoRecibir, useOperarAcopio, type Acopio } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { EditorHorario } from '../../componentes/EditorHorario';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { FilaMenu } from '../../componentes/Menu';
import { Segmentado } from '../../componentes/Segmentado';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';

/** Mi acopio: lo operativo que maneja el Operador asignado (B-03, RF-RED-001). */
export function MiAcopio() {
  const { id } = useParams();
  const { data, error, isPending, refetch } = useAcopiosGestion();
  const acopio = data?.find((a) => a.id === id);

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Mi acopio" subtitulo="Estado, horario y cómo entrar" />
      {isPending && <Esqueleto etiqueta="Cargando tu acopio" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && !acopio && (
        <EstadoError
          mensaje="No tienes asignado este acopio."
          alReintentar={() => void refetch()}
        />
      )}
      {acopio && <Contenido key={acopio.id} acopio={acopio} />}
    </div>
  );
}

function Contenido({ acopio }: { acopio: Acopio }) {
  const operar = useOperarAcopio(acopio.id);
  const { data: noRecibe } = useNoRecibir(acopio.id);
  const [estado, fijarEstado] = useState<'ACTIVO' | 'PAUSADO'>(
    acopio.estado === 'PAUSADO' ? 'PAUSADO' : 'ACTIVO',
  );
  const [horario, fijarHorario] = useState(acopio.horario);
  const [telefono, fijarTelefono] = useState(acopio.telefono ?? '');
  const [indicaciones, fijarIndicaciones] = useState(acopio.indicacionesAcceso ?? '');
  const n = noRecibe?.length ?? 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    operar.mutate({
      estado,
      horario,
      telefono: telefono.trim() || null,
      indicacionesAcceso: indicaciones.trim() || null,
    });
  }

  return (
    <>
      <section className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <p className="text-body-lg font-semibold text-on-surface">{acopio.nombre}</p>
        <p className="text-body-md text-on-surface-variant">{acopio.entidad.nombre}</p>
        <p className="flex items-center gap-1 text-body-md text-on-surface">
          <Icono nombre="location_on" className="text-[18px] text-primary-container" />
          {acopio.direccion} · {acopio.municipio}
        </p>
        <p className="flex items-start gap-space-xs rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
          <Icono nombre="lock" className="text-[18px]" />
          Para cambiar el nombre o la dirección, habla con el Administrador.
        </p>
      </section>

      {acopio.estado === 'CERRADO' ? (
        <p className="rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface">
          Este acopio está cerrado. Solo el Administrador lo puede reabrir.
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-space-md">
          <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
            <h2 className="text-headline-sm text-on-surface">Estado</h2>
            <Segmentado
              etiqueta="Estado del acopio"
              valor={estado}
              alCambiar={fijarEstado}
              opciones={[
                { valor: 'ACTIVO', texto: 'Activo', icono: 'check_circle' },
                { valor: 'PAUSADO', texto: 'Pausado', icono: 'pause_circle' },
              ]}
            />
            <p className="text-body-sm text-on-surface-variant">
              Si el acopio se llena, páusalo: el mapa dejará de mostrarlo como abierto.
            </p>
          </section>

          <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
            <h2 className="text-headline-sm text-on-surface">Horario de atención</h2>
            <EditorHorario valor={horario} alCambiar={fijarHorario} />
          </section>

          <section className="flex flex-col gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
            <Campo
              id="mi-telefono"
              etiqueta="Teléfono"
              type="tel"
              value={telefono}
              onChange={(e) => fijarTelefono(e.target.value)}
            />
            <div className="flex flex-col gap-space-xs">
              <label htmlFor="mi-indicaciones" className="text-label-md text-on-surface">
                Indicaciones de acceso
              </label>
              <textarea
                id="mi-indicaciones"
                rows={3}
                value={indicaciones}
                onChange={(e) => fijarIndicaciones(e.target.value)}
                className="w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface focus:border-primary-container"
              />
            </div>
          </section>

          <FormularioError mensaje={operar.error?.message} />
          {operar.isSuccess && (
            <p role="status" className="text-body-md text-exito">
              Cambios guardados. El mapa ya los muestra.
            </p>
          )}
          <Boton type="submit" className="min-h-[56px] w-full" disabled={operar.isPending}>
            <Icono nombre="check" className="text-[20px]" />
            {operar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
        </form>
      )}

      <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <FilaMenu
          icono="tune"
          titulo="Umbrales y no recibir"
          descripcion={`No recibe ${n === 1 ? '1 categoría' : `${n} categorías`}`}
          a={`/consola/acopios/${acopio.id}/no-recibir`}
        />
      </ul>
    </>
  );
}
