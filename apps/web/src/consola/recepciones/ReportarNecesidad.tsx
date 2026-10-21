import { useId, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useFichaZona } from '../../api/motor';
import { pendientesDeResolver, useReportar, useReportesZona } from '../../api/recepciones';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { FormularioError } from '../catalogo/FormularioError';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';

const NOTA_MAXIMA = 280;
/** Lo que acepta `POST /zonas/{id}/reportes` en una sola petición. */
const MAXIMO_CATEGORIAS = 20;
type Modo = 'falta' | 'resuelta';
interface Opcion {
  id: string;
  nombre: string;
  detalle?: string;
}

const sinTildes = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** C20 Reportar necesidad (RF-MOT-011). Diseño: docs/03-diseno/stitch/C20-reportar. */
export function ReportarNecesidad() {
  const { id = '' } = useParams();
  const enLinea = useEnLinea();
  const ficha = useFichaZona(id);
  const reportes = useReportesZona(id);
  const volverA = `/consola/zonas/${id}`;

  if (!enLinea) {
    return (
      <div className="flex flex-col gap-space-md">
        <Encabezado titulo="Reportar necesidad" volverA={volverA} />
        <NecesitaRed titulo="Reportar necesita conexión" acopioId="">
          Vuelve a abrirlo cuando tengas señal.
        </NecesitaRed>
      </div>
    );
  }

  const error = ficha.error ?? reportes.error;
  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado
        titulo="Reportar necesidad"
        subtitulo={ficha.data?.zona.nombre}
        volverA={volverA}
      />
      {(ficha.isPending || reportes.isPending) && <Esqueleto etiqueta="Cargando la zona" />}
      {error && (
        <EstadoError
          mensaje={error.message}
          alReintentar={() => {
            void ficha.refetch();
            void reportes.refetch();
          }}
        />
      )}
      {ficha.data && reportes.data && (
        <Formulario
          zonaId={id}
          categorias={ficha.data.categorias.map((c) => ({
            id: c.categoriaId,
            nombre: c.categoria,
          }))}
          pendientes={pendientesDeResolver(reportes.data).map((r) => ({
            id: r.categoriaId,
            nombre: r.categoria,
            detalle: `Reportada ${haceCuanto(r.reportadoEn)}`,
          }))}
        />
      )}
    </div>
  );
}

function Formulario({
  zonaId,
  categorias,
  pendientes,
}: {
  zonaId: string;
  categorias: Opcion[];
  pendientes: Opcion[];
}) {
  const ir = useNavigate();
  const reportar = useReportar(zonaId);
  // «Ya se resolvió algo» de «Mi zona» abre en ese modo
  const [params] = useSearchParams();
  const [modo, fijarModo] = useState<Modo>(
    params.get('modo') === 'resuelta' ? 'resuelta' : 'falta',
  );
  const [elegidas, fijarElegidas] = useState<string[]>([]);
  const [busqueda, fijarBusqueda] = useState('');
  const [nota, fijarNota] = useState('');
  const falta = modo === 'falta';
  const opciones = (falta ? categorias : pendientes).filter((o) =>
    sinTildes(o.nombre).includes(sinTildes(busqueda.trim())),
  );
  const n = elegidas.length;
  const lleno = n >= MAXIMO_CATEGORIAS;
  const contador = useId();

  function cambiarModo(m: Modo) {
    fijarModo(m);
    fijarElegidas([]);
    fijarBusqueda('');
  }

  function alternar(idCategoria: string) {
    fijarElegidas((e) =>
      e.includes(idCategoria) ? e.filter((x) => x !== idCategoria) : [...e, idCategoria],
    );
  }

  function enviar() {
    const texto = nota.trim();
    // El orden de la lista, no el de los toques
    const categoriasElegidas = (falta ? categorias : pendientes)
      .map((o) => o.id)
      .filter((x) => elegidas.includes(x));
    reportar.mutate(
      {
        categorias: categoriasElegidas,
        ...(falta && texto ? { nota: texto } : {}),
        resuelta: !falta,
      },
      {
        onSuccess: () =>
          void ir(`/consola/zonas/${zonaId}?${falta ? 'reportado' : 'resuelto'}=${n}`),
      },
    );
  }

  const textoBoton = falta
    ? `Reportar ${n} ${n === 1 ? 'categoría' : 'categorías'}`
    : `Marcar ${n} como ${n === 1 ? 'resuelta' : 'resueltas'}`;

  return (
    <>
      <Segmentado<Modo>
        etiqueta="Qué reportas"
        valor={modo}
        alCambiar={cambiarModo}
        opciones={[
          { valor: 'falta', texto: 'Falta' },
          { valor: 'resuelta', texto: 'Ya se resolvió' },
        ]}
      />
      {(falta || pendientes.length > 0) && (
        <label className="flex min-h-[48px] items-center gap-space-xs rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md">
          <Icono nombre="search" className="text-[20px] text-on-surface-variant" />
          <input
            type="search"
            aria-label="Buscar categoría"
            placeholder="Buscar categoría"
            value={busqueda}
            onChange={(e) => fijarBusqueda(e.target.value)}
            className="min-h-[44px] w-full bg-transparent text-body-md text-on-surface outline-none"
          />
        </label>
      )}
      {!falta && pendientes.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low p-space-md text-body-md text-on-surface-variant">
          No hay necesidades reportadas en esta zona.
        </p>
      ) : (
        <fieldset
          aria-label="Categorías"
          className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
        >
          {opciones.map((o) => (
            <label
              key={o.id}
              className="flex min-h-[56px] cursor-pointer items-center gap-space-sm border-t border-outline-variant px-space-md first:border-t-0"
            >
              <input
                type="checkbox"
                aria-label={o.nombre}
                checked={elegidas.includes(o.id)}
                disabled={lleno && !elegidas.includes(o.id)}
                onChange={() => alternar(o.id)}
                className="h-5 w-5 accent-primary-container"
              />
              <span className="text-body-md text-on-surface">{o.nombre}</span>
              {o.detalle && (
                <span className="ml-auto text-body-sm text-on-surface-variant">{o.detalle}</span>
              )}
            </label>
          ))}
          {opciones.length === 0 && (
            <p className="p-space-md text-body-md text-on-surface-variant">
              Ninguna categoría coincide con la búsqueda.
            </p>
          )}
        </fieldset>
      )}
      {lleno && (
        <p className="text-body-sm text-on-surface-variant">
          Puedes reportar hasta {MAXIMO_CATEGORIAS} categorías a la vez.
        </p>
      )}
      {!falta && pendientes.length > 0 && (
        <p className="text-body-sm text-on-surface-variant">
          Aquí salen solo las que hoy están reportadas como faltantes.
        </p>
      )}

      {falta && (
        <>
          <p className="flex gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
            <Icono nombre="public" className="text-[22px] text-on-surface-variant" />
            La nota se ve en el mapa público tal como la escribas. No pongas nombres, teléfonos ni
            datos de personas.
          </p>
          <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
            Nota pública (opcional)
            <textarea
              value={nota}
              maxLength={NOTA_MAXIMA}
              rows={3}
              placeholder="Por ejemplo: en el coliseo no hay agua desde ayer"
              aria-describedby={contador}
              onChange={(e) => fijarNota(e.target.value)}
              className="rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-sm text-body-md text-on-surface"
            />
          </label>
          <p id={contador} className="-mt-space-sm text-right text-body-sm text-on-surface-variant">
            {nota.length} / {NOTA_MAXIMA}
          </p>
        </>
      )}

      <FormularioError mensaje={reportar.error?.message} />
      {(falta || pendientes.length > 0) && (
        <Boton disabled={n === 0} ocupado={reportar.isPending} onClick={enviar} className="w-full">
          <Icono nombre={falta ? 'send' : 'task_alt'} className="text-[20px]" />
          {textoBoton}
        </Boton>
      )}
    </>
  );
}
