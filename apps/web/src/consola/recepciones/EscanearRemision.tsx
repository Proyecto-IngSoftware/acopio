import { useState } from 'react';
import { useNavigate } from 'react-router';
import { tokenDeQr } from '../../api/recepciones';
import { Boton } from '../../componentes/Boton';
import { Icono } from '../../componentes/Icono';
import { VistaCamara } from '../inventario/Escaner';

/** «Escanear el QR de la remisión»: la cámara de C04 y, al leer, la recepción de ese QR. */
export function EscanearRemision() {
  const ir = useNavigate();
  const [escaneando, fijarEscaneando] = useState(false);
  const [aviso, fijarAviso] = useState<string | null>(null);

  function leer(texto: string) {
    fijarEscaneando(false);
    const token = tokenDeQr(texto);
    if (token) void ir(`/consola/recepciones/qr/${encodeURIComponent(token)}`);
    else fijarAviso('Ese código no es el QR de una remisión.');
  }

  return (
    <>
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
    </>
  );
}
