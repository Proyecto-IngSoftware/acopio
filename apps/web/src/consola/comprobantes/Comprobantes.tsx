import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useBandeja, type EstadoBandeja } from '../../api/comprobantes';
import { Boton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { haceCuanto } from '../../formato';
import { useEnLinea } from '../../sin-conexion/en-linea';
import { Encabezado } from '../Encabezado';
import { NecesitaRed } from '../inventario/NecesitaRed';

const ESTADOS: { valor: EstadoBandeja; texto: string; vacio: string }[] = [
  { valor: 'PENDIENTE', texto: 'Pendientes', vacio: 'No hay comprobantes pendientes' },
  { valor: 'CONCILIADO', texto: 'Conciliados', vacio: 'No hay comprobantes conciliados' },
  { valor: 'RECHAZADO', texto: 'Rechazados', vacio: 'No hay comprobantes rechazados' },
];

const PASTILLA =
  'inline-flex items-center gap-1 rounded-full bg-surface-container px-space-sm py-1 text-label-md text-on-surface';

/** C8: los comprobantes por conciliar (RF-CMP-003). Diseño: docs/03-diseno/stitch/C08-comprobantes. */
export function Comprobantes() {
  const enLinea = useEnLinea();
  const navegar = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const { search } = useLocation();
  const estado = (ESTADOS.find((e) => e.valor === parametros.get('estado'))?.valor ??
    'PENDIENTE') as EstadoBandeja;
  const acopioId = parametros.get('acopio') ?? undefined;
  const bandeja = useBandeja({ estado, acopioId });
  const [folio, setFolio] = useState('');

  const filtrar = (cambio: { estado?: EstadoBandeja; acopio?: string | null }) => {
    const siguiente = new URLSearchParams(parametros);
    if (cambio.estado) {
      if (cambio.estado === 'PENDIENTE') siguiente.delete('estado');
      else siguiente.set('estado', cambio.estado);
    }
    if (cambio.acopio !== undefined) {
      if (cambio.acopio === null) siguiente.delete('acopio');
      else siguiente.set('acopio', cambio.acopio);
    }
    setParametros(siguiente, { replace: true });
  };

  const abrir = (e: FormEvent) => {
    e.preventDefault();
    const limpio = folio.trim().toUpperCase();
    if (limpio) void navegar(`/consola/comprobantes/${encodeURIComponent(limpio)}`);
  };

  if (!enLinea || bandeja.error?.estado === 0) {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        <Encabezado titulo="Comprobantes" />
        <NecesitaRed titulo="Los comprobantes necesitan conexión" acopioId="">
          Vuelve a abrir la bandeja cuando haya señal.
        </NecesitaRed>
      </div>
    );
  }

  const porAcopio = bandeja.data?.porAcopio ?? [];
  const total = porAcopio.reduce((s, a) => s + a.pendientes, 0);
  const vacio = ESTADOS.find((e) => e.valor === estado)!.vacio;

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Comprobantes" />

      <form onSubmit={abrir} role="search" className="flex items-end gap-space-sm">
        <label className="flex min-w-0 flex-1 flex-col gap-space-xs text-label-md text-on-surface">
          Buscar folio
          <input
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ej. ACO-2026-7KQ4M"
            autoComplete="off"
            autoCapitalize="characters"
            className="min-h-[48px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest px-space-md text-body-md text-on-surface"
          />
        </label>
        <Boton type="submit" variante="secundario">
          Abrir
        </Boton>
      </form>

      <Segmentado
        etiqueta="Estado"
        valor={estado}
        alCambiar={(v) => filtrar({ estado: v })}
        opciones={ESTADOS.map(({ valor, texto }) => ({ valor, texto }))}
      />

      {(porAcopio.length > 0 || acopioId) && (
        <div className="-mx-margin flex gap-space-xs overflow-x-auto px-margin">
          <Chip activo={!acopioId} alTocar={() => filtrar({ acopio: null })}>
            Todos {total}
          </Chip>
          {porAcopio.map((a) => (
            <Chip
              key={a.acopioId}
              activo={acopioId === a.acopioId}
              alTocar={() => filtrar({ acopio: a.acopioId })}
            >
              {a.nombre} {a.pendientes}
            </Chip>
          ))}
        </div>
      )}

      {bandeja.isPending ? (
        <Esqueleto etiqueta="Cargando comprobantes" />
      ) : bandeja.error ? (
        <EstadoError mensaje={bandeja.error.message} alReintentar={() => void bandeja.refetch()} />
      ) : bandeja.data.comprobantes.length === 0 ? (
        <EstadoVacio titulo={vacio}>
          Aquí aparecen las donaciones recibidas en los acopios que puedes revisar.
        </EstadoVacio>
      ) : (
        <>
          <p className="text-body-sm text-on-surface-variant">Primero la más vieja.</p>
          <ul aria-label="Comprobantes" className="flex flex-col gap-space-sm">
            {bandeja.data.comprobantes.map((c) => (
              <li key={c.folio}>
                <Link
                  to={`/consola/comprobantes/${encodeURIComponent(c.folio)}`}
                  state={{ desde: search }}
                  className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md"
                >
                  <span className="flex items-center gap-space-sm">
                    <span className="font-mono text-body-lg font-bold text-on-surface">
                      {c.folio}
                    </span>
                    <span className="ml-auto text-body-sm text-on-surface-variant">
                      {haceCuanto(c.recibidoEn ?? c.creadoEn)}
                    </span>
                    <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
                  </span>
                  <span className="text-body-sm text-on-surface-variant">{c.acopio.nombre}</span>
                  {(c.tieneFactura || c.conDiferencia) && (
                    <span className="flex flex-wrap gap-space-xs">
                      {c.tieneFactura && (
                        <span className={PASTILLA}>
                          <Icono nombre="receipt_long" className="text-[16px]" />
                          Factura
                        </span>
                      )}
                      {c.conDiferencia && (
                        <span className={PASTILLA}>
                          <Icono nombre="difference" className="text-[16px]" />
                          Con diferencia
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Chip({
  activo,
  alTocar,
  children,
}: {
  activo: boolean;
  alTocar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={alTocar}
      className={`min-h-[40px] shrink-0 rounded-full border px-space-md text-label-md whitespace-nowrap ${
        activo
          ? 'border-primary-container bg-primary-container text-on-primary'
          : 'border-outline-variant bg-surface-container-lowest text-on-surface'
      }`}
    >
      {children}
    </button>
  );
}
