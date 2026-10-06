import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { formatearNumero } from '@acopio/shared';
import { ErrorApi } from '../api/cliente';
import {
  subirFactura,
  useSugerencias,
  usePrepararDonacion,
  type Donacion,
} from '../api/donaciones';
import { Boton } from '../componentes/Boton';
import { EstadoError } from '../componentes/EstadoError';
import { Esqueleto } from '../componentes/Esqueleto';
import { Icono } from '../componentes/Icono';
import { describirFallo, type FalloFactura } from './PasoFolio';
import type { Linea } from './preparacion';

type Punto = { lat: number; lng: number };

const km = (d: number[] | number | null | undefined) => (Array.isArray(d) ? d[0] : d) ?? null;

/** Miniatura local del archivo elegido; libera la URL al cambiar. */
function Miniatura({ archivo }: { archivo: File }) {
  const [url, fijarUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(archivo);
    fijarUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [archivo]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Factura elegida"
      className="h-16 w-16 rounded-xl border border-outline-variant object-cover"
    />
  );
}

interface Props {
  lineas: Linea[];
  acopioId: string | null;
  factura: File | null;
  alElegir: (acopioId: string) => void;
  alFactura: (f: File | null) => void;
  /** La donación creada y, si la factura no subió, por qué. */
  alCrear: (d: Donacion, falloFactura: FalloFactura | null) => void;
}

/** P9, paso 2: dónde entregar y la foto opcional de la factura. */
export function PasoEntrega({ lineas, acopioId, factura, alElegir, alFactura, alCrear }: Props) {
  const [ubicacion, fijarUbicacion] = useState<Punto | undefined>();
  const [error, fijarError] = useState<{ codigo: string; mensaje: string } | null>(null);
  const [avisoUbicacion, fijarAvisoUbicacion] = useState<string | null>(null);
  const [enviando, fijarEnviando] = useState(false);
  const preparar = usePrepararDonacion();

  function usarUbicacion() {
    fijarAvisoUbicacion(null);
    if (!navigator.geolocation) {
      fijarAvisoUbicacion('Tu navegador no comparte la ubicación.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => fijarUbicacion({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => fijarAvisoUbicacion('No pudimos usar tu ubicación. Elige un acopio de la lista.'),
    );
  }

  const sugerencias = useSugerencias(
    lineas.map((l) => ({ categoriaId: l.categoriaId })),
    ubicacion,
  );
  const lista = sugerencias.data ?? [];
  const elegido = lista.find((s) => s.acopioId === acopioId)?.acopioId ?? lista[0]?.acopioId;

  async function enviar() {
    if (!elegido) return;
    fijarError(null);
    fijarEnviando(true);
    let creada: Donacion;
    try {
      creada = await preparar.mutateAsync({
        acopioId: elegido,
        lineas: lineas.map((l) => ({
          categoriaId: l.categoriaId,
          cantidad: l.cantidad,
          ...(l.ean ? { ean: l.ean } : {}),
          ...(l.venceEn ? { venceEn: l.venceEn } : {}),
        })),
      });
    } catch (e) {
      fijarEnviando(false);
      fijarError({
        codigo: e instanceof ErrorApi ? e.codigo : '',
        mensaje: e instanceof Error ? e.message : 'No pudimos preparar la donación',
      });
      return;
    }
    let fallo: FalloFactura | null = null;
    if (factura) {
      try {
        creada = await subirFactura(creada.folio, factura);
      } catch (e) {
        fallo = describirFallo(e);
      }
    }
    alCrear(creada, fallo);
  }

  let cuerpo;
  if (sugerencias.isPending) {
    cuerpo = <Esqueleto etiqueta="Buscando acopios" className="h-32" />;
  } else if (sugerencias.isError) {
    cuerpo = (
      <EstadoError
        mensaje="No pudimos buscar acopios."
        alReintentar={() => void sugerencias.refetch()}
      />
    );
  } else if (lista.length === 0) {
    cuerpo = (
      <p role="status" className="text-body-lg text-on-surface-variant">
        Ahora no hay acopios que reciban esta donación.
      </p>
    );
  } else {
    cuerpo = (
      <fieldset className="flex flex-col gap-space-sm">
        <legend className="sr-only">Acopios sugeridos</legend>
        {lista.map((s) => {
          const marcado = s.acopioId === elegido;
          const distancia = km(s.distanciaKm);
          return (
            <label
              key={s.acopioId}
              className={`flex cursor-pointer items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm ${
                marcado ? 'border-2 border-primary-container' : 'border border-outline-variant'
              }`}
            >
              <input
                type="radio"
                name="acopio"
                checked={marcado}
                onChange={() => alElegir(s.acopioId)}
                className="mt-1 h-5 w-5 accent-primary-container"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-space-2xs">
                <b className="text-body-lg text-on-surface">{s.nombre}</b>
                <span className="text-body-sm text-on-surface-variant">
                  {s.direccion} · {s.abiertoAhora ? 'abierto ahora' : 'cerrado ahora'}
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  Recibe {s.lineasAceptadas} de {lineas.length}{' '}
                  {lineas.length === 1 ? 'producto' : 'productos'}
                </span>
                {s.noRecibe.length > 0 && (
                  <span className="flex items-center gap-space-2xs text-body-sm text-on-surface-variant">
                    <Icono nombre="block" className="text-[18px]" />
                    No está recibiendo {s.noRecibe.join(', ')}
                  </span>
                )}
              </span>
              {distancia !== null && (
                <span className="text-label-md text-on-surface-variant">
                  {formatearNumero(distancia)} km
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-space-2xs">
        <h2 className="text-headline-sm text-on-surface">¿Dónde la entregas?</h2>
        <p className="text-body-md text-on-surface-variant">
          Primero los acopios que reciben más de lo que llevas y están abiertos.
        </p>
        <Boton variante="secundario" className="self-start" onClick={usarUbicacion}>
          <Icono nombre="my_location" className="text-[20px]" />
          Usar mi ubicación
        </Boton>
        {avisoUbicacion && (
          <p role="status" className="text-body-sm text-on-surface-variant">
            {avisoUbicacion}
          </p>
        )}
      </div>
      {cuerpo}
      <Link
        to="/mapa"
        className="inline-flex min-h-[48px] items-center gap-space-xs self-start font-label-md text-label-md text-primary"
      >
        <Icono nombre="map" className="text-[20px]" />
        Ver todos en el mapa
      </Link>
      <section className="flex flex-col gap-space-xs">
        <h3 className="text-label-md font-bold text-on-surface">Foto de la factura (opcional)</h3>
        <div className="flex items-center gap-space-sm">
          {factura && <Miniatura archivo={factura} />}
          <label className="relative inline-flex min-h-[48px] cursor-pointer items-center gap-space-xs rounded-xl border-[1.5px] border-primary-container bg-surface-container-lowest px-space-md font-label-md text-label-md text-primary-container focus-within:outline focus-within:outline-2">
            <Icono nombre="photo_camera" className="text-[20px]" />
            <span>{factura ? 'Cambiar foto' : 'Tomar o subir foto'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Tomar o subir foto"
              onChange={(e) => alFactura(e.target.files?.[0] ?? null)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          La guardamos 12 meses, sin datos de ubicación, solo para conciliar tu donación.{' '}
          <Link to="/privacidad" className="text-primary underline">
            Cómo usamos tus datos
          </Link>
        </p>
      </section>
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-md text-body-md text-on-surface"
        >
          <p>{error.mensaje}</p>
          {error.codigo === 'LIMITE_PREPARADAS' && (
            <Link to="/donador" className="font-label-md text-label-md text-primary underline">
              Mis donaciones
            </Link>
          )}
        </div>
      )}
      <Boton disabled={!elegido || enviando} onClick={() => void enviar()}>
        Preparar y ver mi folio
      </Boton>
    </>
  );
}
