import { useMemo, useState } from 'react';
import { useDescartes, type InformeDescartes } from '../../api/motor';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';
import { TarjetaSugerencia } from './TarjetaSugerencia';

const DIAS = 30;
const PRIMEROS = 10;

/** AAAA-MM-DD de hace 30 días: el endpoint valida `desde` como fecha (I1-05). */
const haceTreintaDias = () => new Date(Date.now() - DIAS * 86_400_000).toISOString().slice(0, 10);

/** Informe de descartes (RF-MOT-007): para ver si los pesos proponen lo que nadie aprueba. */
export function Descartes() {
  const enLinea = useEnLinea();
  const desde = useMemo(haceTreintaDias, []);
  const consulta = useDescartes(desde);

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Descartes" volverA="/consola/motor" />
        <NecesitaRed titulo="El informe de descartes necesita conexión" acopioId="">
          Vuelve a abrirlo cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Descartes" volverA="/consola/motor" />
      {consulta.isPending && <Esqueleto etiqueta="Cargando el informe" />}
      {consulta.error && (
        <EstadoError
          mensaje={consulta.error.message}
          alReintentar={() => void consulta.refetch()}
        />
      )}
      {consulta.data && <Informe informe={consulta.data} />}
    </div>
  );
}

function Informe({ informe }: { informe: InformeDescartes }) {
  const [todos, fijarTodos] = useState(false);
  if (informe.total === 0) {
    return (
      <EstadoVacio titulo={`Nadie descartó sugerencias en los últimos ${DIAS} días`}>
        Cuando el Administrador descarte una sugerencia, su motivo aparece aquí.
      </EstadoVacio>
    );
  }
  const recientes = todos ? informe.recientes : informe.recientes.slice(0, PRIMEROS);
  return (
    <>
      <section className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md">
        <h2 className="text-label-caps uppercase text-on-surface-variant">
          Descartes de los últimos {DIAS} días
        </h2>
        <p className="text-display-hero-mobile text-on-surface tabular-nums">{informe.total}</p>
      </section>
      <Conteo titulo="Por motivo" filas={informe.porMotivo} />
      <Conteo titulo="Por categoría" filas={informe.porCategoria} />
      <Conteo titulo="Por acopio" filas={informe.porAcopio} />
      <section aria-labelledby="recientes" className="flex flex-col gap-space-sm">
        <h2 id="recientes" className="text-headline-sm text-on-surface">
          Recientes
        </h2>
        {recientes.map((s) => (
          <TarjetaSugerencia key={s.id} sugerencia={s} />
        ))}
        {!todos && informe.recientes.length > PRIMEROS && (
          <Boton variante="terciario" onClick={() => fijarTodos(true)}>
            Ver más
          </Boton>
        )}
      </section>
    </>
  );
}

function Conteo({ titulo, filas }: { titulo: string; filas: InformeDescartes['porMotivo'] }) {
  if (filas.length === 0) return null;
  return (
    <table className="w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md tabular-nums">
      <caption className="pb-space-xs text-left text-headline-sm text-on-surface">{titulo}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{titulo.replace('Por ', '')}</th>
          <th scope="col">Veces</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant">
        {filas.map((f) => (
          <tr key={f.nombre}>
            <th
              scope="row"
              className="px-space-md py-space-sm text-left font-normal text-on-surface"
            >
              {f.nombre}
            </th>
            <td className="px-space-md py-space-sm text-right font-bold text-on-surface">
              {f.veces}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
