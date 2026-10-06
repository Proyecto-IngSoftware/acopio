import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { subirFactura, type Donacion } from '../api/donaciones';
import { Boton, EnlaceBoton } from '../componentes/Boton';
import { Icono } from '../componentes/Icono';
import { resumen } from './MisDonaciones';

/** El QR del folio como imagen `data:` de un SVG: no se inserta HTML. */
function Qr({ folio }: { folio: string }) {
  const [src, fijarSrc] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void QRCode.toString(folio, { type: 'svg', margin: 1 }).then((svg) => {
      if (vivo) fijarSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    });
    return () => {
      vivo = false;
    };
  }, [folio]);
  if (!src) return <div className="h-48 w-48 self-center" />;
  return (
    <img
      src={src}
      alt="Código QR del folio"
      className="h-48 w-48 self-center rounded-xl border border-outline-variant bg-surface-container-lowest p-space-xs"
    />
  );
}

interface Props {
  donacion: Donacion;
  /** La foto que no subió, para intentarlo otra vez. */
  archivo?: File | null;
  falloInicial?: string | null;
}

/** P9, paso 3: el folio con su QR, el acopio y el estado de la factura. */
export function PasoFolio({ donacion: inicial, archivo = null, falloInicial = null }: Props) {
  const consultas = useQueryClient();
  const [donacion, fijarDonacion] = useState(inicial);
  const [pendiente, fijarPendiente] = useState<File | null>(archivo);
  const [fallo, fijarFallo] = useState<string | null>(falloInicial);
  const [subiendo, fijarSubiendo] = useState(false);
  const [aviso, fijarAviso] = useState<string | null>(null);
  const folioRef = useRef<HTMLSpanElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function subir(f: File) {
    fijarSubiendo(true);
    fijarFallo(null);
    try {
      fijarDonacion(await subirFactura(donacion.folio, f));
      fijarPendiente(null);
      void consultas.invalidateQueries({ queryKey: ['misDonaciones'] });
    } catch (e) {
      fijarPendiente(f);
      fijarFallo(e instanceof Error ? e.message : 'No pudimos subir la factura');
    } finally {
      fijarSubiendo(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(donacion.folio);
      fijarAviso('Folio copiado');
    } catch {
      // Sin portapapeles: se deja el folio seleccionado para copiarlo a mano
      const nodo = folioRef.current;
      if (nodo) {
        const rango = document.createRange();
        rango.selectNodeContents(nodo);
        const seleccion = window.getSelection();
        seleccion?.removeAllRanges();
        seleccion?.addRange(rango);
      }
      fijarAviso('Copia el folio seleccionado');
    }
  }

  return (
    <>
      <h2 className="text-title-lg text-on-surface">Tu donación está preparada</h2>
      <Qr folio={donacion.folio} />
      <span
        ref={folioRef}
        className="select-all self-center font-mono text-headline-md text-on-surface"
      >
        {donacion.folio}
      </span>
      <Boton variante="secundario" className="self-center" onClick={() => void copiar()}>
        <Icono nombre="content_copy" className="text-[20px]" />
        Copiar folio
      </Boton>
      {aviso && (
        <p role="status" className="text-center text-body-sm text-on-surface-variant">
          {aviso}
        </p>
      )}
      <p className="flex gap-space-xs rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface">
        <Icono nombre="info" className="text-[22px]" />
        Muestra este folio en el acopio. Vence en 7 días si no la entregas.
      </p>
      <div className="flex flex-col gap-space-2xs rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <b className="text-body-lg text-on-surface">{donacion.acopio.nombre}</b>
        <span className="text-body-md text-on-surface">{resumen(donacion)}</span>
        <Link
          to={`/acopios/${donacion.acopio.id}`}
          className="inline-flex min-h-[48px] items-center font-label-md text-label-md text-primary underline"
        >
          Ver ficha y cómo llegar
        </Link>
      </div>
      {donacion.tieneFactura ? (
        <p className="flex items-center gap-space-xs text-body-md text-on-surface">
          <Icono nombre="receipt_long" className="text-[22px]" />
          Factura adjunta
        </p>
      ) : (
        <div className="flex flex-col gap-space-xs">
          {fallo && (
            <p role="alert" className="text-body-md text-on-surface">
              No pudimos subir la factura: {fallo}
            </p>
          )}
          {pendiente && fallo ? (
            <Boton variante="secundario" disabled={subiendo} onClick={() => void subir(pendiente)}>
              Intentar otra vez
            </Boton>
          ) : (
            <Boton
              variante="secundario"
              disabled={subiendo}
              onClick={() => entrada.current?.click()}
            >
              <Icono nombre="photo_camera" className="text-[20px]" />
              Agregar foto de la factura
            </Boton>
          )}
          <input
            ref={entrada}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-label="Foto de la factura"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void subir(f);
            }}
          />
        </div>
      )}
      <EnlaceBoton a="/donador">Ver mis donaciones</EnlaceBoton>
      <EnlaceBoton a={`/seguimiento/${donacion.folio}`} variante="secundario">
        Seguir esta donación
      </EnlaceBoton>
    </>
  );
}
