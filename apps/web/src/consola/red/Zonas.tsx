import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useEmergenciasConsola, type Emergencia } from '../../api/catalogo';
import { useGuardarZona, useZonas, type EstadoZona, type Punto, type Zona } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { MapaConPin } from '../../componentes/mapa/MapaConPin';
import { diaLargo } from '../../formato';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';

const ORDEN: Record<Emergencia['estado'], number> = { ACTIVA: 0, EN_SEGUIMIENTO: 1, CERRADA: 2 };

/** C9 Zonas afectadas por emergencia (RF-MOT-001). */
export function Zonas() {
  const emergencias = useEmergenciasConsola();
  const [elegida, fijarElegida] = useState<string | null>(null);
  const lista = [...(emergencias.data ?? [])].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]);
  const actual = lista.find((e) => e.id === elegida) ?? lista[0] ?? null;

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Zonas afectadas" subtitulo="Comunidades que atiende cada emergencia" />
      {emergencias.isPending && <Esqueleto etiqueta="Cargando emergencias" />}
      {emergencias.error && (
        <EstadoError
          mensaje={emergencias.error.message}
          alReintentar={() => void emergencias.refetch()}
        />
      )}
      {emergencias.data && lista.length === 0 && (
        <EstadoVacio titulo="Todavía no hay emergencias">
          Cada zona pertenece a una emergencia.{' '}
          <Link
            to="/consola/catalogo?pestana=emergencias"
            className="text-primary-container underline"
          >
            Crear una emergencia
          </Link>
        </EstadoVacio>
      )}
      {actual && (
        <>
          <div className="flex gap-space-xs overflow-x-auto pb-1">
            {lista.map((e) => (
              <button
                key={e.id}
                type="button"
                aria-pressed={e.id === actual.id}
                onClick={() => fijarElegida(e.id)}
                className="flex min-h-[44px] shrink-0 items-center rounded-full border border-outline-variant bg-surface-container-lowest px-space-md text-label-md text-on-surface aria-pressed:border-primary-container aria-pressed:bg-primary-container aria-pressed:text-on-primary"
              >
                {e.nombre}
              </button>
            ))}
          </div>
          <ZonasDe emergencia={actual} />
        </>
      )}
    </div>
  );
}

function ZonasDe({ emergencia }: { emergencia: Emergencia }) {
  const { data, error, isPending, refetch } = useZonas(emergencia.id);
  const [editando, fijarEditando] = useState<Zona | 'nueva' | null>(null);
  const cerrada = emergencia.estado === 'CERRADA';

  return (
    <>
      {cerrada ? (
        <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-md text-body-md text-on-surface">
          <Icono nombre="info" className="text-[20px] text-primary-container" />
          Esta emergencia está cerrada. Sus zonas quedan en solo lectura.
        </p>
      ) : (
        <Boton className="min-h-[56px] w-full" onClick={() => fijarEditando('nueva')}>
          <Icono nombre="add_location_alt" className="text-[20px]" />
          Nueva zona
        </Boton>
      )}
      {isPending && <Esqueleto etiqueta="Cargando zonas" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="Sin zonas registradas">
          {cerrada ? 'Esta emergencia no tuvo zonas.' : 'Agrega la primera con «Nueva zona».'}
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {data?.map((z) => {
          const contenido = (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-lg font-semibold text-on-surface">{z.nombre}</span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono nombre="location_on" className="text-[18px]" />
                  {z.municipio}
                </span>
                <span className="mt-1 flex flex-wrap items-center justify-between gap-space-xs border-t border-outline-variant pt-space-xs">
                  <span className="text-body-md text-on-surface tabular-nums">
                    <strong>{z.poblacionEstimada.toLocaleString('es-CO')}</strong> personas
                  </span>
                  <EtiquetaEstado estado={z.estado} />
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {z.poblacionFuente} · {diaLargo(z.poblacionFecha)}
                </span>
              </span>
              {!cerrada && (
                <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
              )}
            </>
          );
          const clases =
            'flex w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left';
          return (
            <li key={z.id}>
              {cerrada ? (
                <div className={clases}>{contenido}</div>
              ) : (
                <button type="button" className={clases} onClick={() => fijarEditando(z)}>
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {editando && (
        <FormularioZona
          emergenciaId={emergencia.id}
          zona={editando === 'nueva' ? null : editando}
          alCerrar={() => fijarEditando(null)}
        />
      )}
    </>
  );
}

const ESTADOS: { valor: EstadoZona; texto: string }[] = [
  { valor: 'SIN_ATENDER', texto: 'Sin atender' },
  { valor: 'EN_ATENCION', texto: 'En atención' },
  { valor: 'CUBIERTA', texto: 'Cubierta' },
];

function FormularioZona({
  emergenciaId,
  zona,
  alCerrar,
}: {
  emergenciaId: string;
  zona: Zona | null;
  alCerrar: () => void;
}) {
  const guardar = useGuardarZona();
  const [nombre, fijarNombre] = useState(zona?.nombre ?? '');
  const [municipio, fijarMunicipio] = useState(zona?.municipio ?? '');
  const [punto, fijarPunto] = useState<Punto | null>(
    zona ? { lat: zona.lat, lng: zona.lng } : null,
  );
  const [poblacion, fijarPoblacion] = useState(zona ? String(zona.poblacionEstimada) : '');
  const [fuente, fijarFuente] = useState(zona?.poblacionFuente ?? '');
  const [fecha, fijarFecha] = useState(zona?.poblacionFecha.slice(0, 10) ?? '');
  const [estado, fijarEstado] = useState<EstadoZona>(zona?.estado ?? 'SIN_ATENDER');
  const [faltaPin, fijarFaltaPin] = useState(false);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!punto) {
      fijarFaltaPin(true);
      return;
    }
    guardar.mutate(
      {
        id: zona?.id,
        datos: {
          emergenciaId,
          nombre: nombre.trim(),
          municipio: municipio.trim(),
          lat: punto.lat,
          lng: punto.lng,
          poblacionEstimada: Number(poblacion),
          poblacionFuente: fuente.trim(),
          poblacionFecha: fecha,
          ...(zona ? { estado } : {}),
        },
      },
      { onSuccess: alCerrar },
    );
  }

  return (
    <Hoja titulo={zona ? `Editar ${zona.nombre}` : 'Nueva zona'} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        <Campo
          id="zona-nombre"
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          required
        />
        <Campo
          id="zona-municipio"
          etiqueta="Municipio"
          value={municipio}
          onChange={(e) => fijarMunicipio(e.target.value)}
          required
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
            Ubica la zona en el mapa.
          </p>
        )}
        <Campo
          id="zona-poblacion"
          etiqueta="Población estimada"
          type="number"
          min={0}
          inputMode="numeric"
          value={poblacion}
          onChange={(e) => fijarPoblacion(e.target.value)}
          required
        />
        <Campo
          id="zona-fuente"
          etiqueta="Fuente de la población"
          ayuda="Quién dio el dato: censo, junta de acción comunal, UNGRD…"
          value={fuente}
          onChange={(e) => fijarFuente(e.target.value)}
          required
        />
        <Campo
          id="zona-fecha"
          etiqueta="Fecha de la estimación"
          type="date"
          value={fecha}
          onChange={(e) => fijarFecha(e.target.value)}
          required
        />
        {zona && (
          <Selector
            id="zona-estado"
            etiqueta="Estado"
            value={estado}
            onChange={(e) => fijarEstado(e.target.value as EstadoZona)}
          >
            {ESTADOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.texto}
              </option>
            ))}
          </Selector>
        )}
        <FormularioError mensaje={guardar.error?.message} />
        <Boton type="submit" className="min-h-[56px] w-full" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}
