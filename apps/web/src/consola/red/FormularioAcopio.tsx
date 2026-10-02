import { HORARIO_VACIO, type Horario } from '@acopio/shared';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  useAcopiosGestion,
  useEntidades,
  useGuardarAcopio,
  type Acopio,
  type Entidad,
  type Punto,
} from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { EditorHorario } from '../../componentes/EditorHorario';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { BuscadorDireccion } from '../../componentes/mapa/BuscadorDireccion';
import { MapaConPin } from '../../componentes/mapa/MapaConPin';
import { FilaMenu } from '../../componentes/Menu';
import { Segmentado } from '../../componentes/Segmentado';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';

/** C21 Acopio: crear, editar, cerrar y reabrir (RF-RED-001). */
export function FormularioAcopio() {
  const { id } = useParams();
  const acopios = useAcopiosGestion();
  const entidades = useEntidades();

  if (acopios.isPending || entidades.isPending) return <Esqueleto etiqueta="Cargando el acopio" />;
  if (acopios.error || entidades.error) {
    return (
      <EstadoError
        mensaje={(acopios.error ?? entidades.error)!.message}
        alReintentar={() => void (acopios.refetch(), entidades.refetch())}
      />
    );
  }
  const acopio = id ? acopios.data.find((a) => a.id === id) : undefined;
  if (id && !acopio) {
    return (
      <EstadoError mensaje="Ese acopio no existe." alReintentar={() => void acopios.refetch()} />
    );
  }
  return <Formulario key={id ?? 'nuevo'} acopio={acopio ?? null} entidades={entidades.data} />;
}

function Seccion({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-space-md rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
      <h2 className="flex items-center gap-space-xs text-label-md text-on-surface">
        <Icono nombre={icono} className="text-[20px] text-primary-container" />
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Formulario({ acopio, entidades }: { acopio: Acopio | null; entidades: Entidad[] }) {
  const navegar = useNavigate();
  const guardar = useGuardarAcopio();
  const [entidadId, fijarEntidadId] = useState(acopio?.entidad.id ?? '');
  const [nombre, fijarNombre] = useState(acopio?.nombre ?? '');
  const [direccion, fijarDireccion] = useState(acopio?.direccion ?? '');
  const [municipio, fijarMunicipio] = useState(acopio?.municipio ?? '');
  const [punto, fijarPunto] = useState<Punto | null>(
    acopio ? { lat: acopio.lat, lng: acopio.lng } : null,
  );
  const [telefono, fijarTelefono] = useState(acopio?.telefono ?? '');
  const [indicaciones, fijarIndicaciones] = useState(acopio?.indicacionesAcceso ?? '');
  const [horario, fijarHorario] = useState<Horario>(acopio?.horario ?? HORARIO_VACIO);
  const [estado, fijarEstado] = useState<'ACTIVO' | 'PAUSADO'>(
    acopio?.estado === 'PAUSADO' ? 'PAUSADO' : 'ACTIVO',
  );
  const [faltaPin, fijarFaltaPin] = useState(false);
  const [confirmarCierre, fijarConfirmarCierre] = useState(false);
  const cerrado = acopio?.estado === 'CERRADO';

  const volver = () => navegar('/consola/acopios');

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!punto) {
      fijarFaltaPin(true);
      return;
    }
    guardar.mutate(
      {
        id: acopio?.id,
        datos: {
          entidadId,
          nombre: nombre.trim(),
          direccion: direccion.trim(),
          municipio: municipio.trim(),
          lat: punto.lat,
          lng: punto.lng,
          telefono: telefono.trim() || null,
          indicacionesAcceso: indicaciones.trim() || null,
          horario,
          ...(cerrado ? {} : { estado }),
        },
      },
      { onSuccess: volver },
    );
  }

  const cambiarEstado = (nuevo: 'CERRADO' | 'ACTIVO') =>
    guardar.mutate({ id: acopio!.id, datos: { estado: nuevo } }, { onSuccess: volver });

  if (entidades.length === 0) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Nuevo acopio" volverA="/consola/acopios" />
        <div className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
          <p className="text-body-md text-on-surface">
            Todo acopio tiene una entidad responsable, y todavía no hay ninguna.
          </p>
          <Link to="/consola/entidades" className="text-label-md text-primary-container">
            Crear entidad
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-md">
      <Encabezado
        titulo={acopio ? 'Editar acopio' : 'Nuevo acopio'}
        subtitulo={acopio ? acopio.nombre : 'Un centro de acopio de la red'}
        volverA="/consola/acopios"
      >
        {acopio && <EtiquetaEstado estado={acopio.estado} />}
      </Encabezado>

      <Seccion titulo="Entidad y nombre" icono="verified_user">
        <Selector
          id="acopio-entidad"
          etiqueta="Entidad responsable"
          value={entidadId}
          onChange={(e) => fijarEntidadId(e.target.value)}
          required
        >
          <option value="">Elige la entidad</option>
          {entidades.map((en) => (
            <option key={en.id} value={en.id}>
              {en.nombre}
            </option>
          ))}
        </Selector>
        <Campo
          id="acopio-nombre"
          etiqueta="Nombre del acopio"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          required
        />
      </Seccion>

      <Seccion titulo="Ubicación" icono="location_on">
        <Campo
          id="acopio-direccion"
          etiqueta="Dirección"
          value={direccion}
          onChange={(e) => fijarDireccion(e.target.value)}
          required
        />
        <BuscadorDireccion
          q={direccion}
          alElegir={(p) => {
            fijarPunto(p);
            fijarFaltaPin(false);
          }}
        />
        <MapaConPin
          valor={punto}
          alCambiar={(p) => {
            fijarPunto(p);
            fijarFaltaPin(false);
          }}
        />
        {faltaPin && (
          <p role="alert" className="text-body-sm text-error">
            Ubica el acopio en el mapa: busca la dirección o toca el mapa.
          </p>
        )}
        <Campo
          id="acopio-municipio"
          etiqueta="Municipio"
          value={municipio}
          onChange={(e) => fijarMunicipio(e.target.value)}
          required
        />
      </Seccion>

      <Seccion titulo="Contacto y acceso" icono="call">
        <Campo
          id="acopio-telefono"
          etiqueta="Teléfono"
          type="tel"
          value={telefono}
          onChange={(e) => fijarTelefono(e.target.value)}
        />
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="acopio-indicaciones" className="text-label-md text-on-surface">
            Indicaciones de acceso
          </label>
          <textarea
            id="acopio-indicaciones"
            rows={3}
            aria-describedby="acopio-indicaciones-ayuda"
            value={indicaciones}
            onChange={(e) => fijarIndicaciones(e.target.value)}
            className="w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface focus:border-primary-container"
          />
          <p id="acopio-indicaciones-ayuda" className="text-body-sm text-on-surface-variant">
            Se muestra en la ficha pública del acopio.
          </p>
        </div>
      </Seccion>

      <Seccion titulo="Horario de atención" icono="schedule">
        <EditorHorario valor={horario} alCambiar={fijarHorario} />
      </Seccion>

      {!cerrado && (
        <Seccion titulo="Estado" icono="tune">
          <Segmentado
            etiqueta="Estado del acopio"
            valor={estado}
            alCambiar={fijarEstado}
            opciones={[
              { valor: 'ACTIVO', texto: 'Activo', icono: 'check_circle' },
              { valor: 'PAUSADO', texto: 'Pausado', icono: 'pause_circle' },
            ]}
          />
        </Seccion>
      )}

      <FormularioError mensaje={guardar.error?.message} />
      <Boton type="submit" className="min-h-[56px] w-full" disabled={guardar.isPending}>
        <Icono nombre="check" className="text-[20px]" />
        {acopio ? 'Guardar cambios' : 'Crear acopio'}
      </Boton>

      {acopio && (
        <>
          <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <FilaMenu
              icono="tune"
              titulo="Umbrales y no recibir"
              descripcion="Mínimo y máximo, y lo que hoy no recibe"
              a={`/consola/acopios/${acopio.id}/no-recibir`}
            />
            <FilaMenu
              icono="inventory"
              titulo="Inventario"
              descripcion="Saldo, estado e historial de cada categoría"
              a={`/consola/acopios/${acopio.id}/inventario`}
            />
          </ul>
          <section className="flex flex-col gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
            {cerrado ? (
              <>
                <p className="text-body-md text-on-surface">
                  Este acopio está cerrado: no aparece en el mapa.
                </p>
                <Boton variante="secundario" onClick={() => cambiarEstado('ACTIVO')}>
                  Reabrir acopio
                </Boton>
              </>
            ) : (
              <>
                <h2 className="text-label-md text-on-surface">Cerrar acopio</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Deja de aparecer en el mapa. Se puede reabrir después.
                </p>
                <Boton variante="secundario" onClick={() => fijarConfirmarCierre(true)}>
                  <Icono nombre="cancel" className="text-[20px]" />
                  Cerrar acopio
                </Boton>
              </>
            )}
          </section>
        </>
      )}

      {confirmarCierre && acopio && (
        <Hoja titulo={`¿Cerrar ${acopio.nombre}?`} alCerrar={() => fijarConfirmarCierre(false)}>
          <p className="text-body-md text-on-surface">
            Deja de aparecer en el mapa y nadie podrá llevarle donaciones. Lo puedes reabrir
            después.
          </p>
          <Boton onClick={() => cambiarEstado('CERRADO')} disabled={guardar.isPending}>
            Sí, cerrar
          </Boton>
          <Boton variante="terciario" onClick={() => fijarConfirmarCierre(false)}>
            Cancelar
          </Boton>
        </Hoja>
      )}
    </form>
  );
}
