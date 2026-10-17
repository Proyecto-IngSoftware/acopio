import { formatearCantidad } from '@acopio/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { tokenDeQr, useRecepciones } from '../../api/recepciones';
import type { Remision } from '../../api/remisiones';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { VistaCamara } from '../inventario/Escaner';
import { NecesitaRed } from '../inventario/NecesitaRed';

const SUBTITULO = 'Remisiones en camino a tus zonas';

/** C13 Por recibir (RF-MOT-009). Diseño: docs/03-diseno/stitch/C13-recepcion. */
export function Recepciones() {
  const enLinea = useEnLinea();
  const consulta = useRecepciones();
  const ir = useNavigate();
  const [escaneando, fijarEscaneando] = useState(false);
  const [aviso, fijarAviso] = useState<string | null>(null);

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Por recibir" subtitulo={SUBTITULO} />
        <NecesitaRed titulo="La recepción necesita conexión" acopioId="">
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  function leer(texto: string) {
    fijarEscaneando(false);
    const token = tokenDeQr(texto);
    if (token) void ir(`/consola/recepciones/qr/${encodeURIComponent(token)}`);
    else fijarAviso('Ese código no es el QR de una remisión.');
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Por recibir" subtitulo={SUBTITULO} />
      <Boton
        onClick={() => {
          fijarAviso(null);
          fijarEscaneando(true);
        }}
      >
        <Icono nombre="qr_code_scanner" className="text-[20px]" />
        Escanear el QR de la remisión
      </Boton>
      {aviso && (
        <p
          role="status"
          className="rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface"
        >
          {aviso}
        </p>
      )}

      {consulta.isPending && <Esqueleto etiqueta="Cargando remisiones" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data?.length === 0 && (
        <EstadoVacio titulo="Nada por recibir">
          No hay remisiones en camino a tus zonas. Cuando un acopio despache una, aparece aquí.
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {consulta.data?.map((r) => (
          <li key={r.id}>
            <Tarjeta r={r} />
          </li>
        ))}
      </ul>

      {escaneando && (
        <VistaCamara
          indicacion="Apunta al QR del documento de la remisión"
          textoSalir="Ver la lista"
          alLeer={leer}
          alCerrar={() => fijarEscaneando(false)}
          alFallar={() => {
            fijarEscaneando(false);
            fijarAviso('No pudimos abrir la cámara. Toca la remisión en la lista.');
          }}
        />
      )}
    </div>
  );
}

/** Lo que trae una remisión en una línea: «Agua potable 400 L · Arroz 60 kg». */
export const resumenLineas = (r: Remision) =>
  r.lineas
    .map((l) => `${l.categoria} ${formatearCantidad(l.cantidadPlaneada, l.unidad)}`)
    .join(' · ');

function Tarjeta({ r }: { r: Remision }) {
  return (
    <Link
      to={`/consola/recepciones/${r.codigo}`}
      className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md active:bg-surface-container"
    >
      <span className="flex items-center gap-space-sm">
        <span className="font-mono text-body-lg font-bold text-on-surface">{r.codigo}</span>
        {r.despachadaEn && (
          <span className="ml-auto rounded-full bg-surface-container px-space-sm py-1 text-label-md text-on-surface">
            {haceCuanto(r.despachadaEn)}
          </span>
        )}
      </span>
      <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre="local_shipping" className="text-[18px]" />
        Desde {r.acopio.nombre}
      </span>
      <span className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
        <Icono nombre={r.zona ? 'location_on' : 'alt_route'} className="text-[18px]" />
        {r.zona ? `Para ${r.zona.nombre}` : 'Despacho general: eliges la zona al recibir'}
      </span>
      <span className="text-body-md text-on-surface tabular-nums">{resumenLineas(r)}</span>
    </Link>
  );
}
