import { MAXIMO_EVIDENCIAS, formatearCantidad } from '@acopio/shared';
import { useId, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  useRecepciones,
  useRecibirRemision,
  useRemisionPorQr,
  useSubirEvidencia,
} from '../../api/recepciones';
import { urlEvidencia, type Remision } from '../../api/remisiones';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Selector } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { SelloConfirmacion } from '../../componentes/SelloConfirmacion';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useUbicacionActiva } from '../../sesion/ubicacion-activa';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { FormularioError } from '../catalogo/FormularioError';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';

const NOTA_MAXIMA = 280;
const VOLVER = '/consola/recepciones';

/** C13 Recibir remisión, por código desde la lista (I3-02). */
export function RecibirPorCodigo() {
  const { codigo = '' } = useParams();
  const consulta = useRecepciones();
  const remision = useFijada(consulta.data?.find((r) => r.codigo === codigo));
  return (
    <Marco>
      {consulta.isPending && <Esqueleto etiqueta="Cargando la remisión" />}
      {/* Si falla una recarga con la remisión ya cargada, se sigue con el formulario */}
      {consulta.error && !remision && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data &&
        (remision ? (
          <FormularioRecepcion key={remision.codigo} remision={remision} />
        ) : (
          <YaNoEsta />
        ))}
    </Marco>
  );
}

/** C13 Recibir remisión, desde el QR del documento (I2-04). Un 403, un 404 o una remisión
 *  que ya no está en tránsito dan el mismo aviso. */
export function RecibirPorQr() {
  const { token = '' } = useParams();
  const consulta = useRemisionPorQr(token);
  const enCamino = useFijada(consulta.data?.estado === 'EN_TRANSITO' ? consulta.data : undefined);
  const sinAcceso = !enCamino && consulta.error && [403, 404].includes(consulta.error.estado);
  return (
    <Marco>
      {consulta.isPending && <Esqueleto etiqueta="Cargando la remisión" />}
      {consulta.error && !sinAcceso && !enCamino && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {enCamino ? (
        <FormularioRecepcion key={enCamino.codigo} remision={enCamino} />
      ) : (
        (sinAcceso || consulta.data) && <YaNoEsta />
      )}
    </Marco>
  );
}

/** La remisión que se vio en camino al abrir. Al recibirla deja de estar en la lista, y el
 *  formulario debe seguir montado para mostrar «recibida» (I3-04). */
function useFijada(remision: Remision | undefined) {
  const [vista, fijarVista] = useState(remision);
  // Guardar durante el render lo que llegó, como indica React para derivar de lo anterior
  if (remision && remision !== vista) fijarVista(remision);
  return remision ?? vista;
}

function Marco({ children }: { children: React.ReactNode }) {
  const enLinea = useEnLinea();
  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Recibir remisión" volverA={VOLVER} />
      {enLinea ? (
        children
      ) : (
        <NecesitaRed titulo="La recepción necesita conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      )}
    </div>
  );
}

/** Errores con los que el formulario ya no puede terminar: se cambia por el aviso. */
const SIN_SALIDA = ['REMISION_ESTADO_INVALIDO', 'REMISION_TOMADA'];

function YaNoEsta({
  mensaje = 'Esta remisión ya no está en camino a tus zonas. Puede que ya se haya recibido o cancelado.',
}: {
  mensaje?: string;
}) {
  return (
    <>
      <p
        role="alert"
        className="flex gap-space-sm rounded-xl bg-error-container p-space-sm text-body-md text-on-error-container"
      >
        <Icono nombre="error" className="text-[22px]" />
        {mensaje}
      </p>
      <Link to={VOLVER} className="min-h-[48px] text-center text-label-md text-primary-container">
        Volver a Por recibir
      </Link>
    </>
  );
}

function FormularioRecepcion({ remision }: { remision: Remision }) {
  const [actual, fijarActual] = useState(remision);
  const [zonaId, fijarZonaId] = useState('');
  const [nota, fijarNota] = useState('');
  const { ubicaciones } = useUbicacionActiva();
  const subir = useSubirEvidencia(actual.codigo);
  const recibir = useRecibirRemision(actual.codigo);
  const general = actual.zona === null;
  const zonas = ubicaciones.filter((u) => u.tipo === 'ZONA');
  const contador = useId();

  if (recibir.data) return <Recibida remision={recibir.data} />;
  const sinSalida = [recibir.error, subir.error].find((e) => e && SIN_SALIDA.includes(e.codigo));
  if (sinSalida) {
    return (
      <YaNoEsta mensaje={sinSalida.codigo === 'REMISION_TOMADA' ? sinSalida.message : undefined} />
    );
  }

  const faltaFoto = actual.evidencias === 0;
  const faltaZona = general && !zonaId;
  const ayuda =
    faltaFoto && faltaZona
      ? 'Elige la zona y toma una foto para confirmar.'
      : faltaFoto
        ? 'Toma una foto para confirmar.'
        : faltaZona
          ? 'Elige la zona para confirmar.'
          : 'Se registra que llegó todo lo planeado.';

  function elegir(archivo: File | undefined) {
    if (!archivo) return;
    subir.mutate(archivo, { onSuccess: fijarActual });
  }

  function confirmar() {
    const texto = nota.trim();
    recibir.mutate({ ...(general ? { zonaId } : {}), ...(texto ? { nota: texto } : {}) });
  }

  return (
    <>
      <div className="flex items-center gap-space-sm">
        <span className="font-mono text-body-lg font-bold text-on-surface">{actual.codigo}</span>
        <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md text-on-surface">
          En tránsito
        </span>
      </div>
      <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre="local_shipping" className="text-[18px]" />
        Desde {actual.acopio.nombre}
        {actual.despachadaEn && ` · despachada ${haceCuanto(actual.despachadaEn)}`}
      </p>
      {actual.zona && (
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="location_on" className="text-[18px]" />
          Para {actual.zona.nombre}
        </p>
      )}
      {general && (
        <Selector
          id="zona-recepcion"
          etiqueta="¿En qué zona la recibes?"
          value={zonaId}
          onChange={(e) => fijarZonaId(e.target.value)}
        >
          <option value="">Elige una zona</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </Selector>
      )}

      <h2 className="text-title-md text-on-surface">Lo que debería llegar</h2>
      <ul className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {actual.lineas.map((l) => (
          <li
            key={l.categoriaId}
            className="flex justify-between gap-space-sm border-t border-outline-variant p-space-sm first:border-t-0"
          >
            <span className="text-body-md text-on-surface">{l.categoria}</span>
            <b className="text-body-md text-on-surface tabular-nums">
              {formatearCantidad(l.cantidadPlaneada, l.unidad)}
            </b>
          </li>
        ))}
      </ul>
      {actual.folios.length > 0 && (
        <p className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
          <Icono nombre="receipt_long" className="text-[18px]" />
          Folios: {actual.folios.join(', ')}
        </p>
      )}

      <h2 className="text-title-md text-on-surface">Foto de lo que llegó</h2>
      <p className="text-body-sm text-on-surface-variant">Hace falta al menos una para recibir.</p>
      <div className="flex flex-wrap gap-space-sm">
        {Array.from({ length: actual.evidencias }, (_, n) => (
          <img
            key={n}
            src={urlEvidencia(actual.codigo, n)}
            alt={`Foto ${n + 1} de lo que llegó`}
            className="h-[88px] w-[88px] rounded-lg border border-outline-variant object-cover"
          />
        ))}
        {actual.evidencias < MAXIMO_EVIDENCIAS && (
          <label
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-outline bg-surface-container-lowest text-label-md text-primary-container focus-within:outline focus-within:outline-2 ${
              faltaFoto ? 'min-h-[120px] w-full' : 'h-[88px] w-[88px]'
            }`}
          >
            <Icono nombre={faltaFoto ? 'photo_camera' : 'add_a_photo'} className="text-[28px]" />
            <span>{subir.isPending ? 'Subiendo…' : faltaFoto ? 'Tomar foto' : 'Otra'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label={faltaFoto ? 'Tomar foto' : 'Otra'}
              disabled={subir.isPending}
              onChange={(e) => {
                elegir(e.target.files?.[0]);
                e.target.value = '';
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        )}
      </div>
      <p role="status" className="sr-only">
        {subir.isPending ? 'Subiendo la foto…' : ''}
      </p>
      <FormularioError mensaje={subir.error?.message} />

      <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
        Nota (opcional)
        <textarea
          value={nota}
          maxLength={NOTA_MAXIMA}
          rows={3}
          placeholder="Por ejemplo: llegaron dos bultos mojados"
          aria-describedby={contador}
          onChange={(e) => fijarNota(e.target.value)}
          className="rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-sm text-body-md text-on-surface"
        />
      </label>
      <p id={contador} className="-mt-space-sm text-right text-body-sm text-on-surface-variant">
        {nota.length} / {NOTA_MAXIMA}
      </p>

      <FormularioError mensaje={recibir.error?.message} />
      <Boton
        disabled={faltaFoto || faltaZona || recibir.isPending}
        onClick={confirmar}
        className="w-full"
      >
        <Icono nombre="done_all" className="text-[20px]" />
        Confirmar recepción
      </Boton>
      <p className="text-center text-body-sm text-on-surface-variant">{ayuda}</p>
    </>
  );
}

function Recibida({ remision: r }: { remision: Remision }) {
  return (
    <div className="flex flex-col items-center gap-space-sm text-center">
      <SelloConfirmacion etiqueta="Remisión recibida" />
      <h2 className="text-headline-sm text-on-surface">{r.codigo} recibida</h2>
      <p className="text-body-md text-on-surface-variant">
        {r.lineas
          .map((l) => `${l.categoria} ${formatearCantidad(l.cantidadPlaneada, l.unidad)}`)
          .join(' · ')}
        {r.zona && ` en ${r.zona.nombre}`}, con {r.evidencias}{' '}
        {r.evidencias === 1 ? 'foto' : 'fotos'}.
      </p>
      {r.zona && (
        <EnlaceBoton a={`/consola/zonas/${r.zona.id}`} variante="secundario" className="w-full">
          <Icono nombre="location_on" className="text-[20px]" />
          Ver la ficha de la zona
        </EnlaceBoton>
      )}
      <Link to={VOLVER} className="min-h-[48px] py-space-sm text-label-md text-primary-container">
        Volver a Por recibir
      </Link>
    </div>
  );
}
