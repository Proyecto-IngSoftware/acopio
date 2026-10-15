import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCrearRemision } from '../../api/remisiones';
import { useSesion } from '../../sesion/Sesion';
import { useUbicacionActiva } from '../../sesion/ubicacion-activa';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { CamposDestino, errorDeZona, type Destino } from './CamposDestino';
import { EditorLineas } from './EditorLineas';

/** C12: una remisión armada a mano, hacia una zona o como despacho general (I2-03). */
export function NuevaRemision() {
  const enLinea = useEnLinea();
  const { usuario } = useSesion();
  const { activa } = useUbicacionActiva();
  const navegar = useNavigate();
  const crear = useCrearRemision();
  const admin = usuario?.rol === 'ADMIN';
  const [destino, fijarDestino] = useState<Destino>({
    acopioId: null,
    zonaId: null,
    responsable: '',
  });
  const acopioId = admin ? destino.acopioId : activa?.tipo === 'ACOPIO' ? activa.id : null;

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Nueva remisión" volverA="/consola/remisiones" />
        <NecesitaRed titulo="Las remisiones necesitan conexión" acopioId={acopioId ?? ''}>
          Vuelve a abrirla cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  const otroError =
    crear.error && crear.error.codigo !== 'LINEA_EXCEDE_MOVIBLE' && !errorDeZona(crear.error)
      ? crear.error
      : null;

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Nueva remisión" volverA="/consola/remisiones" />
      <CamposDestino
        valor={destino}
        alCambiar={fijarDestino}
        conAcopio={admin}
        error={crear.error}
      />
      {acopioId && (
        <section aria-labelledby="que-se-manda" className="flex flex-col gap-space-sm">
          <h2 id="que-se-manda" className="text-title-md text-on-surface">
            Qué se manda
          </h2>
          <EditorLineas
            key={acopioId}
            acopioId={acopioId}
            propias={[]}
            error={crear.error}
            etiqueta="Crear borrador"
            ocupado={crear.isPending}
            alGuardar={(lineas) =>
              crear.mutate(
                {
                  acopioId,
                  zonaId: destino.zonaId,
                  responsable: destino.responsable.trim() || null,
                  lineas,
                },
                {
                  onSuccess: (r) =>
                    void navegar(`/consola/remisiones/${r.codigo}`, {
                      state: { aviso: `Se creó la remisión ${r.codigo}` },
                    }),
                },
              )
            }
          />
        </section>
      )}
      {otroError && (
        <p role="alert" className="text-body-sm text-error">
          {otroError.message}
        </p>
      )}
    </div>
  );
}
