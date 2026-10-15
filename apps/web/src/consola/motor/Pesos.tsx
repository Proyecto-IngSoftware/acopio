import { useEffect, useState } from 'react';
import {
  pesosValidos,
  sumaPesos,
  useConfiguracion,
  useGuardarConfiguracion,
  useVistaPrevia,
  type DatosConfiguracion,
  type Pesos as PesosMotor,
  type VistaPrevia,
} from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { formatoPuntaje } from './TarjetaSugerencia';

const PARTES: [keyof PesosMotor, string, string][] = [
  ['criticidad', 'Criticidad', 'Qué tan baja es la cobertura de la zona'],
  ['urgencia', 'Urgencia', 'Qué tan pronto vence lo que sobra'],
  ['proximidad', 'Proximidad', 'Qué tan cerca está el acopio'],
  ['magnitud', 'Magnitud', 'Cuánto cubre el traslado'],
];

const dos = (n: number) =>
  n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const RETARDO_MS = 400;

/** Pesos del motor con vista previa del ranking antes de guardar (M-06). */
export function Pesos() {
  const enLinea = useEnLinea();
  const consulta = useConfiguracion();

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Pesos" volverA="/consola/motor" />
        <NecesitaRed titulo="Los pesos necesitan conexión" acopioId="">
          Vuelve a abrirlos cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Pesos" volverA="/consola/motor" />
      {consulta.isPending && <Esqueleto etiqueta="Cargando los pesos" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data && (
        <Editor
          guardados={{ pesos: consulta.data.pesos, cantidadMinima: consulta.data.cantidadMinima }}
        />
      )}
    </div>
  );
}

function Editor({ guardados }: { guardados: DatosConfiguracion }) {
  const guardar = useGuardarConfiguracion();
  const [pesos, fijarPesos] = useState(guardados.pesos);
  const [minimo, fijarMinimo] = useState(String(guardados.cantidadMinima));
  const [aviso, fijarAviso] = useState<string | null>(null);
  const [pedido, fijarPedido] = useState<DatosConfiguracion | null>(null);
  const cantidadMinima = Number(minimo.replace(',', '.'));
  const minimoValido = minimo !== '' && cantidadMinima >= 0;
  const validos = pesosValidos(pesos) && minimoValido;
  const cambiado =
    PARTES.some(([k]) => pesos[k] !== guardados.pesos[k]) ||
    cantidadMinima !== guardados.cantidadMinima;

  // La vista previa espera a que se deje de mover: una petición por pausa, no por paso
  useEffect(() => {
    if (!cambiado || !validos) {
      fijarPedido(null);
      return;
    }
    const t = setTimeout(() => fijarPedido({ pesos, cantidadMinima }), RETARDO_MS);
    return () => clearTimeout(t);
  }, [pesos, cantidadMinima, cambiado, validos]);

  const vista = useVistaPrevia(pedido);

  return (
    <>
      <p className="text-body-md text-on-surface-variant">
        Cuánto pesa cada parte del puntaje. Tienen que sumar 1.
      </p>
      {PARTES.map(([clave, nombre, descripcion]) => (
        <div key={clave} className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <label htmlFor={`peso-${clave}`} className="text-label-md text-on-surface">
              {nombre}
            </label>
            <span className="text-label-md text-on-surface tabular-nums">{dos(pesos[clave])}</span>
          </div>
          <input
            id={`peso-${clave}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={pesos[clave]}
            aria-describedby={`peso-${clave}-ayuda`}
            onChange={(e) => {
              fijarAviso(null);
              fijarPesos({ ...pesos, [clave]: Number(e.target.value) });
            }}
            className="w-full accent-primary-container"
          />
          <p id={`peso-${clave}-ayuda`} className="text-body-sm text-on-surface-variant">
            {descripcion}
          </p>
        </div>
      ))}
      <p className="flex justify-between rounded-lg bg-surface-container-low px-space-md py-space-sm text-label-md text-on-surface tabular-nums">
        <span>Suma</span>
        <span>{dos(sumaPesos(pesos))}</span>
      </p>
      {!pesosValidos(pesos) && (
        <p role="alert" className="text-body-sm text-error">
          Suman {dos(sumaPesos(pesos))}; tienen que sumar 1
        </p>
      )}
      <Campo
        id="cantidad-minima"
        etiqueta="Cantidad mínima por traslado"
        ayuda="Por debajo de esto el motor no sugiere."
        inputMode="decimal"
        value={minimo}
        onChange={(e) => fijarMinimo(e.target.value)}
      />

      <h2 className="text-headline-sm text-on-surface">Vista previa</h2>
      {!pedido && (
        <p className="text-body-sm text-on-surface-variant">
          Mueve un peso para ver el ranking nuevo sin guardarlo.
        </p>
      )}
      {pedido && vista.isPending && <Esqueleto etiqueta="Calculando la vista previa" />}
      {vista.error && <p className="text-body-sm text-error">{vista.error.message}</p>}
      {pedido && vista.data && <Ranking vista={vista.data} />}

      {aviso && (
        <p role="status" className="rounded-xl bg-surface-container-low p-space-sm text-body-md">
          {aviso}
        </p>
      )}
      {guardar.error && (
        <p role="alert" className="text-body-sm text-error">
          {guardar.error.message}
        </p>
      )}
      <Boton
        disabled={!validos || !cambiado || guardar.isPending}
        onClick={() =>
          guardar.mutate(
            { pesos, cantidadMinima },
            { onSuccess: () => fijarAviso('Pesos guardados. El próximo recálculo los usa') },
          )
        }
      >
        Guardar pesos
      </Boton>
      <Boton
        variante="terciario"
        onClick={() => {
          fijarPesos(guardados.pesos);
          fijarMinimo(String(guardados.cantidadMinima));
          fijarAviso(null);
        }}
      >
        Descartar cambios
      </Boton>
    </>
  );
}

const clave = (f: VistaPrevia['actual'][number]) => `${f.acopio}|${f.zona}|${f.categoria}`;

function Ranking({ vista }: { vista: VistaPrevia }) {
  const antes = new Map(vista.actual.map((f, i) => [clave(f), i]));
  if (vista.propuesta.length === 0) {
    return (
      <p className="text-body-sm text-on-surface-variant">
        Con estos pesos el motor no sugiere ningún traslado.
      </p>
    );
  }
  return (
    <>
      <ol
        aria-label="Con los pesos nuevos"
        className="divide-y divide-outline-variant overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-body-sm tabular-nums"
      >
        {vista.propuesta.map((f, i) => {
          const previo = antes.get(clave(f));
          const sube = previo !== undefined && i < previo;
          return (
            <li
              key={clave(f)}
              className="grid grid-cols-[1.5rem_1fr_auto] gap-space-sm px-space-sm py-space-xs"
            >
              <span className="text-on-surface-variant">{i + 1}</span>
              <span className="text-on-surface">
                {f.acopio} → {f.zona} · {f.categoria}
              </span>
              <span className={sube ? 'font-bold text-primary-container' : 'text-on-surface'}>
                {formatoPuntaje(f.puntaje)}
                {sube && ' ↑'}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-body-sm text-on-surface-variant">
        ↑ subió de puesto frente a los pesos guardados.
      </p>
    </>
  );
}
