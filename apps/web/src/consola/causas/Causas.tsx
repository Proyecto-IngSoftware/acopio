import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { cierreValido, dominioDe, hoyBogota, topeCierre } from '@acopio/shared';
import {
  useArchivarCausa,
  useCausaGestion,
  useCausasGestion,
  useReactivarCausa,
  useRenovarCausa,
  type CausaGestion,
  type EstadoGestion,
} from '../../api/causas';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { diaConAnio } from '../../formato';
import { NOMBRE_CATEGORIA } from '../../portal/causas/piezas';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';
import { Confirmar, DestinoCausa } from './Confirmar';
import { FormularioCausa } from './FormularioCausa';

type Vista = { tipo: 'lista' } | { tipo: 'formulario' };

const diasHasta = (fecha: string, hoy: string) =>
  Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86_400_000);

/** C22 Causas (RF-RED-007 y 010). Solo el Administrador. Cada causa abre en su ruta. */
export function Causas() {
  const [vista, fijarVista] = useState<Vista>({ tipo: 'lista' });
  const navegar = useNavigate();
  if (vista.tipo === 'formulario') {
    return <FormularioCausa causa={null} alTerminar={() => fijarVista({ tipo: 'lista' })} />;
  }
  return (
    <Lista
      alNueva={() => fijarVista({ tipo: 'formulario' })}
      alAbrir={(c) => void navegar(`/consola/causas/${c.id}`)}
    />
  );
}

/** Una causa en `/consola/causas/:id`, leída de la lista para que se refresque tras cada cambio. */
export function CausaConsola() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [editando, fijarEditando] = useState(false);
  const { causa, isPending, error, refetch } = useCausaGestion(id);
  const volver = () => void navegar('/consola/causas');
  // La ruta ya pone el margen lateral (RequiereRol con `margen`)
  if (isPending) return <Esqueleto etiqueta="Cargando la causa" className="h-64" />;
  if (error)
    return (
      <EstadoError mensaje="No se pudo cargar la causa." alReintentar={() => void refetch()} />
    );
  if (!causa)
    return (
      <div className="flex flex-col gap-space-md">
        <EstadoVacio titulo="No encontramos esa causa">
          Puede que el enlace esté mal escrito.
        </EstadoVacio>
        <Link to="/consola/causas" className="text-label-md text-primary">
          Volver a las causas
        </Link>
      </div>
    );
  if (editando) return <FormularioCausa causa={causa} alTerminar={() => fijarEditando(false)} />;
  return (
    <VistaCausa
      key={causa.id}
      causa={causa}
      alVolver={volver}
      alEditar={() => fijarEditando(true)}
    />
  );
}

function Lista({ alNueva, alAbrir }: { alNueva: () => void; alAbrir: (c: CausaGestion) => void }) {
  const [estado, fijarEstado] = useState<EstadoGestion>('activas');
  const { data, isPending, error, refetch } = useCausasGestion(estado);
  const { data: porCerrar } = useCausasGestion('por-cerrar');
  const hoy = hoyBogota(new Date());
  const n = porCerrar?.length ?? 0;

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado
        titulo="Causas"
        subtitulo="Campañas de entidades verificadas. Cada una cierra en su fecha; renuévala si sigue vigente."
      />
      <Boton className="min-h-[56px] w-full" onClick={alNueva}>
        <Icono nombre="add_circle" className="text-[20px]" />
        Nueva causa
      </Boton>
      <Segmentado
        etiqueta="Qué causas ver"
        valor={estado}
        alCambiar={fijarEstado}
        opciones={[
          { valor: 'activas', texto: 'Activas' },
          { valor: 'por-cerrar', texto: n ? `Por cerrar (${n})` : 'Por cerrar' },
          { valor: 'atendidas', texto: 'Atendidas' },
        ]}
      />
      {isPending && <Esqueleto etiqueta="Cargando las causas" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && data.length === 0 && (
        <EstadoVacio titulo="No hay causas aquí">
          {estado === 'atendidas'
            ? 'Las causas aparecen aquí cuando cierran.'
            : 'Publica una causa de una entidad verificada.'}
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {data?.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => alAbrir(c)}
              className="flex w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="self-start rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
                  {NOMBRE_CATEGORIA[c.categoria]}
                </span>
                <span className="text-body-lg font-semibold text-on-surface">{c.titulo}</span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono
                    nombre={c.entidad.verificadaEn ? 'verified' : 'help'}
                    className="text-[16px]"
                  />
                  {c.entidad.nombre}
                </span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono nombre={c.cerroEl ? 'event_available' : 'event'} className="text-[16px]" />
                  {c.cerroEl
                    ? `Cerró el ${diaConAnio(c.cerroEl)}`
                    : `Cierra el ${diaConAnio(c.cierraEl)}`}
                </span>
                {c.porCerrar && (
                  <span className="self-start rounded-full bg-primary-fixed px-2 py-0.5 text-label-md text-primary">
                    {diasHasta(c.cierraEl, hoy) === 0
                      ? 'Cierra hoy'
                      : diasHasta(c.cierraEl, hoy) === 1
                        ? 'Cierra mañana'
                        : `Cierra en ${diasHasta(c.cierraEl, hoy)} días`}
                  </span>
                )}
              </span>
              <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Una causa: renovar, editar, archivar o ver su ficha; reactivar si está atendida. */
function VistaCausa({
  causa,
  alVolver,
  alEditar,
}: {
  causa: CausaGestion;
  alVolver: () => void;
  alEditar: () => void;
}) {
  const hoy = hoyBogota(new Date());
  const activa = causa.estado === 'ACTIVA';
  const [fecha, fijarFecha] = useState(activa ? causa.cierraEl : '');
  const [confirmando, fijarConfirmando] = useState(false);
  const renovar = useRenovarCausa(causa.id);
  const reactivar = useReactivarCausa(causa.id);
  const archivar = useArchivarCausa(causa.id);
  const plazo = activa ? renovar : reactivar;
  const fechaValida = cierreValido(fecha, hoy);
  const verbo = activa ? 'Renovar' : 'Reactivar';

  return (
    <div className="flex flex-col gap-space-md">
      <button
        type="button"
        onClick={alVolver}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Causas
      </button>
      <span className="self-start rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
        {NOMBRE_CATEGORIA[causa.categoria]}
      </span>
      <div className="flex flex-col gap-space-xs">
        <h1 className="text-headline-md text-on-surface">{causa.titulo}</h1>
        <p className="text-body-sm text-on-surface-variant">
          {causa.entidad.nombre} ·{' '}
          {causa.cerroEl
            ? `cerró el ${diaConAnio(causa.cerroEl)}`
            : `cierra el ${diaConAnio(causa.cierraEl)}`}
        </p>
      </div>
      {causa.porCerrar && (
        <p className="rounded-xl bg-primary-fixed p-space-sm text-label-md text-primary">
          Cierra pronto. Si sigue vigente, renuévala; si no, se archivará sola ese día.
        </p>
      )}
      {!activa && !causa.entidad.verificadaEn ? (
        <p className="rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
          La entidad ya no está verificada. Verifícala en Entidades para poder reactivar la causa.
        </p>
      ) : (
        <>
          <Campo
            id="causa-plazo"
            etiqueta={`${verbo} hasta`}
            type="date"
            min={hoy}
            max={topeCierre(hoy)}
            ayuda={`Hasta el ${diaConAnio(topeCierre(hoy))} (6 meses desde hoy).`}
            value={fecha}
            onChange={(e) => fijarFecha(e.target.value)}
          />
          <Boton
            className="min-h-[56px] w-full"
            disabled={!fechaValida}
            onClick={() => fijarConfirmando(true)}
          >
            {verbo}
          </Boton>
        </>
      )}
      {activa && (
        <>
          <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alEditar}>
            Editar
          </Boton>
          <Boton
            variante="secundario"
            className="min-h-[56px] w-full"
            disabled={archivar.isPending}
            onClick={() => archivar.mutate(undefined, { onSuccess: alVolver })}
          >
            Archivar ahora
          </Boton>
          <FormularioError mensaje={archivar.error?.message} />
        </>
      )}
      <Link
        to={`/causas/${causa.id}`}
        className="flex min-h-[48px] items-center justify-center gap-space-xs text-label-md text-primary-container"
      >
        Ver la ficha pública
        <Icono nombre="open_in_new" className="text-[18px]" />
      </Link>
      {confirmando && (
        <Confirmar
          titulo={`¿${verbo} esta causa?`}
          accion={verbo}
          ocupado={plazo.isPending}
          error={plazo.error?.message}
          alConfirmar={() => plazo.mutate(fecha, { onSuccess: alVolver })}
          alCerrar={() => fijarConfirmando(false)}
        >
          <DestinoCausa
            verbo={activa ? 'renovar' : 'reactivar'}
            entidad={causa.entidad.nombre}
            dominio={dominioDe(causa.urlOficial) ?? causa.urlOficial}
            dominioEntidad={null}
            distinto={causa.dominioDistinto}
          />
          <p className="text-body-sm text-on-surface-variant">
            Quedará activa hasta el {diaConAnio(fecha)} y volverá al principio del directorio.
          </p>
        </Confirmar>
      )}
    </div>
  );
}
