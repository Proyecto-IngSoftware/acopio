import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useBitacora, type FiltrosBitacora, type RegistroBitacora } from '../api/bitacora';
import { Boton } from '../componentes/Boton';
import { Esqueleto } from '../componentes/Esqueleto';
import { EstadoError } from '../componentes/EstadoError';
import { Hoja } from '../componentes/Hoja';
import { Icono } from '../componentes/Icono';
import { Encabezado } from './Encabezado';
import { cambios, frase, iconoDe } from './frases';

type Tipo = 'todo' | 'destacados' | 'usuario' | 'categoria' | 'emergencia';
const TIPOS: { valor: Tipo; texto: string }[] = [
  { valor: 'todo', texto: 'Todo' },
  { valor: 'destacados', texto: 'Destacados' },
  { valor: 'usuario', texto: 'Usuarios' },
  { valor: 'categoria', texto: 'Catálogo' },
  { valor: 'emergencia', texto: 'Emergencias' },
];

const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function dia(d: Date): string {
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 86_400_000);
  if (clave(d) === clave(hoy)) return 'Hoy';
  if (clave(d) === clave(ayer)) return 'Ayer';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
const hora = (d: Date) =>
  d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

/** C17 Bitácora (RF-IDE-012). Solo lectura. Diseño: docs/03-diseno/stitch/C17-bitacora. */
export function Bitacora() {
  const [tipo, fijarTipo] = useState<Tipo>('todo');
  const [fechas, fijarFechas] = useState<{ desde?: string; hasta?: string }>({});
  const [filtrando, fijarFiltrando] = useState(false);
  const [abierto, fijarAbierto] = useState<RegistroBitacora | null>(null);
  // Desde el detalle de un usuario: «Ver su actividad en la bitácora»
  const [parametros, fijarParametros] = useSearchParams();
  const usuarioId = parametros.get('usuario') ?? undefined;
  const nombreUsuario = parametros.get('nombre');

  const filtros: FiltrosBitacora = {
    ...fechas,
    ...(usuarioId ? { usuarioId } : {}),
    ...(tipo === 'destacados' ? { destacado: true } : {}),
    ...(tipo === 'usuario' || tipo === 'categoria' || tipo === 'emergencia'
      ? { entidad: tipo }
      : {}),
  };
  const { data, error, isPending, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBitacora(filtros);

  const registros = data?.pages.flatMap((p) => p.registros) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const grupos: { dia: string; registros: RegistroBitacora[] }[] = [];
  for (const r of registros) {
    const d = dia(new Date(r.ocurrido_en));
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === d) ultimo.registros.push(r);
    else grupos.push({ dia: d, registros: [r] });
  }

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Bitácora" subtitulo="Solo lectura" />

      <div className="flex items-center gap-space-xs">
        <div className="flex flex-1 gap-space-xs overflow-x-auto pb-1">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tipo === t.valor}
              onClick={() => fijarTipo(t.valor)}
              className={`min-h-[40px] shrink-0 rounded-full px-space-md text-label-md ${
                tipo === t.valor
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {t.texto}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fijarFiltrando(true)}
          className="flex min-h-[40px] shrink-0 items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-space-sm text-label-md text-on-surface"
        >
          <Icono nombre="tune" className="text-[18px]" />
          Filtrar
        </button>
      </div>

      {usuarioId && (
        <p className="flex items-center justify-between gap-space-sm rounded-xl bg-primary-fixed px-space-md py-space-xs text-body-md text-on-primary-fixed">
          Solo de {nombreUsuario ?? 'una persona'}
          <button
            type="button"
            aria-label="Ver la bitácora de todos"
            onClick={() => fijarParametros({}, { replace: true })}
            className="flex h-10 w-10 items-center justify-center rounded-full"
          >
            <Icono nombre="close" className="text-[20px]" />
          </button>
        </p>
      )}

      {isPending && <Esqueleto etiqueta="Cargando la bitácora" className="h-48" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {!isPending && !error && registros.length === 0 && (
        <p className="rounded-xl bg-surface-container-low p-space-md text-on-surface-variant">
          No hay registros con estos filtros.
        </p>
      )}

      {grupos.map((g) => (
        <section
          key={g.dia}
          aria-labelledby={`dia-${g.dia}`}
          className="flex flex-col gap-space-xs"
        >
          <h2
            id={`dia-${g.dia}`}
            className="sticky top-20 z-10 bg-surface/95 py-space-xs text-label-caps tracking-wider text-on-surface-variant uppercase"
          >
            {g.dia}
          </h2>
          <ul className="flex flex-col divide-y divide-outline-variant overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            {g.registros.map((r) => {
              const cuando = new Date(r.ocurrido_en);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => fijarAbierto(r)}
                    className="flex min-h-[64px] w-full items-center gap-space-md p-space-md text-left active:bg-surface-container"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary-container">
                      <Icono nombre={iconoDe(r)} className="text-[22px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body-md text-on-surface">{frase(r)}</span>
                      <span className="text-body-sm text-on-surface-variant tabular-nums">
                        {r.usuario?.nombre ?? 'Sistema'} · {hora(cuando)}
                        {r.destacado && (
                          <span className="ml-1 text-tertiary-container">
                            <Icono nombre="star" relleno className="align-middle text-[16px]" />
                            <span className="sr-only">Destacado</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <Icono nombre="chevron_right" className="text-[22px] text-outline" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {registros.length > 0 && (
        <div className="flex flex-col items-center gap-space-sm">
          <p className="text-body-sm text-on-surface-variant tabular-nums">
            Mostrando {registros.length} de {total}
          </p>
          {hasNextPage && (
            <Boton
              variante="secundario"
              className="w-full"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              <Icono nombre="arrow_downward" className="text-[18px]" />
              {isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Boton>
          )}
        </div>
      )}

      {filtrando && (
        <HojaFiltros
          inicial={fechas}
          alCerrar={() => fijarFiltrando(false)}
          alAplicar={(f) => {
            fijarFechas(f);
            fijarFiltrando(false);
          }}
        />
      )}

      {abierto && <DetalleRegistro registro={abierto} alCerrar={() => fijarAbierto(null)} />}
    </div>
  );
}

function HojaFiltros({
  inicial,
  alCerrar,
  alAplicar,
}: {
  inicial: { desde?: string; hasta?: string };
  alCerrar: () => void;
  alAplicar: (f: { desde?: string; hasta?: string }) => void;
}) {
  const [desde, fijarDesde] = useState(inicial.desde ?? '');
  const [hasta, fijarHasta] = useState(inicial.hasta ?? '');
  const campo =
    'min-h-[48px] rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface';
  return (
    <Hoja titulo="Filtrar la bitácora" alCerrar={alCerrar}>
      <div className="grid grid-cols-2 gap-space-sm">
        <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => fijarDesde(e.target.value)}
            className={campo}
          />
        </label>
        <label className="flex flex-col gap-space-xs text-label-md text-on-surface">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => fijarHasta(e.target.value)}
            className={campo}
          />
        </label>
      </div>
      <div className="flex gap-space-sm">
        <Boton variante="secundario" className="flex-1" onClick={() => alAplicar({})}>
          Quitar fechas
        </Boton>
        <Boton
          className="flex-1"
          onClick={() => alAplicar({ desde: desde || undefined, hasta: hasta || undefined })}
        >
          Aplicar
        </Boton>
      </div>
    </Hoja>
  );
}

function DetalleRegistro({
  registro,
  alCerrar,
}: {
  registro: RegistroBitacora;
  alCerrar: () => void;
}) {
  const cuando = new Date(registro.ocurrido_en);
  const filas = cambios(registro);
  return (
    <Hoja titulo={frase(registro)} alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface-variant">
        {registro.usuario?.nombre ?? 'Sistema'} ·{' '}
        {cuando.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
        {registro.destacado && ' · Destacado'}
      </p>
      {filas.length === 0 ? (
        <p className="rounded-xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
          Este registro no guarda campos modificados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-left text-body-sm">
            <caption className="sr-only">Campos modificados</caption>
            <thead className="bg-surface-container-low text-label-caps tracking-wider text-on-surface-variant uppercase">
              <tr>
                <th scope="col" className="p-space-sm">
                  Campo
                </th>
                <th scope="col" className="p-space-sm">
                  Antes
                </th>
                <th scope="col" className="p-space-sm">
                  Después
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filas.map((f) => (
                <tr key={f.campo}>
                  <th scope="row" className="p-space-sm font-normal text-on-surface-variant">
                    {f.campo}
                  </th>
                  <td className="p-space-sm break-words text-on-surface">{f.antes}</td>
                  <td className="p-space-sm break-words text-on-surface">{f.despues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Hoja>
  );
}
