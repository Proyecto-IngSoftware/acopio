import { useId, useState } from 'react';
import {
  aUnidadBase,
  errorDeTamano,
  formatearCantidad,
  formatearNumero,
  TOPES,
  type UnidadBase,
} from '@acopio/shared';
import { useCrearPresentacion, type Presentacion } from '../../api/catalogo';
import type { DatosProponer } from '../../api/donaciones';
import { Boton } from '../../componentes/Boton';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';
import { FormularioError } from '../catalogo/FormularioError';
import { limpiarCantidad } from './TecladoCantidad';

const SE_MIDE_EN = { LITRO: 'litros', KILOGRAMO: 'kilos', UNIDAD: 'unidades' } as const;
const enMilesimas = (n: number) => Math.round(n * 1000);

/** Lo que se manda a la API para crear una presentación: suelta con `tamano` o paquete. */
export type DatosNuevaPresentacion = NonNullable<DatosProponer['presentacionNueva']>;

/** Resultado de la hoja: la presentación ya creada o, para el Donador, los datos que se
 *  proponen junto con el código (él no crea presentaciones aparte). */
export type PresentacionNueva =
  { presentacion: Presentacion } | { borrador: DatosNuevaPresentacion; tamano: number };

interface Props {
  categoria: { id: string; nombre: string; unidadBase: UnidadBase };
  /** Las presentaciones que ya tiene la categoría. */
  presentaciones: Presentacion[];
  /** Con `true` no se crea nada en el servidor: se entrega el borrador. */
  soloBorrador?: boolean;
  alListo: (nueva: PresentacionNueva) => void;
  alCerrar: () => void;
}

const CAMPO =
  'min-h-[56px] w-full min-w-0 rounded-xl border-[1.5px] border-outline bg-surface-container-lowest px-space-md text-body-lg text-on-surface';

/** Hoja inferior «Nueva presentación» sobre «Código nuevo» (C4). Una suelta (botella, bolsa)
 *  lleva su tamaño; un paquete, cuántas sueltas trae. Diseño: docs/03-diseno/stitch/C04-escaner. */
export function HojaNuevaPresentacion({
  categoria,
  presentaciones,
  soloBorrador = false,
  alListo,
  alCerrar,
}: Props) {
  const ids = useId();
  const crear = useCrearPresentacion();
  const unidad = categoria.unidadBase;
  const sueltas = presentaciones.filter((p) => p.clase === 'SUELTA');
  const [clase, fijarClase] = useState<'SUELTA' | 'PAQUETE'>('SUELTA');
  // null: el nombre no se tocó y, en un paquete, se sugiere
  const [nombre, fijarNombre] = useState<string | null>(null);
  const [texto, fijarTexto] = useState('');
  const [factor, fijarFactor] = useState(1);
  const [cuantas, fijarCuantas] = useState('');
  const [dentroId, fijarDentroId] = useState<string | null>(null);
  const [cambiandoDentro, fijarCambiandoDentro] = useState(false);

  const dentro = sueltas.find((p) => p.id === dentroId) ?? sueltas[0];

  // Suelta: lo escrito en la unidad elegida, en la unidad base
  let base = 0;
  let errorSuelta: string | null = null;
  const n = Number(texto.replace(',', '.'));
  if (texto.trim() !== '' && (!Number.isFinite(n) || n < 0)) {
    errorSuelta = 'El tamaño tiene que ser mayor que cero';
  } else if (n > 0) {
    const b = aUnidadBase(n, factor);
    if (b === null) {
      errorSuelta = factor < 1 ? 'Sin decimales en esta unidad' : 'Hasta 3 decimales';
    } else if (unidad === 'UNIDAD' && !Number.isInteger(b)) {
      errorSuelta = 'En unidades, el tamaño va sin decimales';
    } else {
      errorSuelta = errorDeTamano(b, unidad);
      if (!errorSuelta) base = b;
    }
  }
  const parecida =
    base > 0 ? sueltas.find((p) => enMilesimas(p.tamano) === enMilesimas(base)) : undefined;

  // Paquete: cuántas sueltas trae y el total
  const unidades = Number(cuantas);
  const unidadesValidas = Number.isInteger(unidades) && unidades >= 2;
  const total = dentro && unidadesValidas ? enMilesimas(unidades * dentro.tamano) / 1000 : 0;
  const errorPaquete =
    cuantas !== '' && !unidadesValidas
      ? 'Un paquete trae al menos 2, en número entero'
      : total > 0
        ? errorDeTamano(total, unidad)
        : null;

  const sugerido =
    clase === 'PAQUETE' && dentro && unidadesValidas
      ? `Paquete x${unidades} · ${dentro.nombre}`
      : '';
  const nombreVisible = nombre ?? sugerido;
  const listo =
    nombreVisible.trim() !== '' &&
    (clase === 'SUELTA' ? base > 0 && !errorSuelta : Boolean(dentro) && total > 0 && !errorPaquete);

  const guardar = () => {
    if (!listo) return;
    const datos: DatosNuevaPresentacion =
      clase === 'SUELTA'
        ? { categoriaId: categoria.id, nombre: nombreVisible.trim(), tamano: base }
        : {
            categoriaId: categoria.id,
            nombre: nombreVisible.trim(),
            contieneId: dentro!.id,
            unidades,
          };
    if (soloBorrador) alListo({ borrador: datos, tamano: clase === 'SUELTA' ? base : total });
    else crear.mutate(datos, { onSuccess: (presentacion) => alListo({ presentacion }) });
  };

  return (
    <Hoja titulo="Nueva presentación" alCerrar={alCerrar}>
      <p className="-mt-space-sm text-body-md text-on-surface-variant">
        {categoria.nombre} · se mide en {SE_MIDE_EN[unidad]}
      </p>
      <Segmentado
        etiqueta="Clase de presentación"
        valor={clase}
        alCambiar={fijarClase}
        opciones={[
          { valor: 'SUELTA', texto: 'Suelta' },
          { valor: 'PAQUETE', texto: 'Paquete' },
        ]}
      />

      {clase === 'PAQUETE' && (
        <>
          <div className="flex flex-col gap-space-xs">
            <span className="text-label-md font-bold text-on-surface">¿Qué trae adentro?</span>
            {dentro ? (
              <div className="flex flex-col gap-space-xs rounded-xl border border-outline-variant p-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="min-w-0 flex-1 font-bold text-on-surface">{dentro.nombre}</span>
                  {sueltas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => fijarCambiandoDentro((c) => !c)}
                      className="min-h-[48px] shrink-0 px-space-sm text-label-md text-primary-container"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
                {cambiandoDentro && (
                  <div
                    role="radiogroup"
                    aria-label="Presentación de adentro"
                    className="flex flex-col gap-space-xs"
                  >
                    {sueltas.map((p) => (
                      <label
                        key={p.id}
                        className="flex min-h-[48px] items-center gap-space-sm rounded-xl bg-surface-container-low px-space-md has-checked:bg-primary-container has-checked:text-on-primary"
                      >
                        <input
                          type="radio"
                          name={`${ids}-dentro`}
                          checked={p.id === dentro.id}
                          onChange={() => {
                            fijarDentroId(p.id);
                            fijarCambiandoDentro(false);
                          }}
                          className="sr-only"
                        />
                        <span className="min-w-0 flex-1">{p.nombre}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface">
                Primero crea una presentación suelta: un paquete trae varias de ellas.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-space-xs">
            <label htmlFor={`${ids}-cuantas`} className="text-label-md font-bold text-on-surface">
              ¿Cuántas trae?
            </label>
            <input
              id={`${ids}-cuantas`}
              inputMode="numeric"
              autoComplete="off"
              value={cuantas}
              onChange={(e) => fijarCuantas(limpiarCantidad(e.target.value).replace(/[.,].*/, ''))}
              className={CAMPO}
            />
          </div>
          {dentro && total > 0 && !errorPaquete && (
            <p className="flex items-center gap-space-xs rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface-variant">
              <Icono nombre="info" className="shrink-0 text-[20px]" />
              <span className="min-w-0">
                Total: {formatearNumero(unidades)} × {formatearCantidad(dentro.tamano, unidad)} ={' '}
                <b className="text-on-surface">{formatearCantidad(total, unidad)}</b>
              </span>
            </p>
          )}
          {errorPaquete && (
            <p role="alert" className="text-body-sm text-error">
              {errorPaquete}
            </p>
          )}
        </>
      )}

      <div className="flex flex-col gap-space-xs">
        <label htmlFor={`${ids}-nombre`} className="text-label-md font-bold text-on-surface">
          Nombre
        </label>
        <input
          id={`${ids}-nombre`}
          autoComplete="off"
          value={nombreVisible}
          onChange={(e) => fijarNombre(e.target.value)}
          className={CAMPO}
        />
      </div>

      {clase === 'SUELTA' && (
        <>
          <div className="flex flex-col gap-space-xs">
            <label htmlFor={`${ids}-tamano`} className="text-label-md font-bold text-on-surface">
              Tamaño
            </label>
            <div className="flex items-center gap-space-sm">
              <input
                id={`${ids}-tamano`}
                inputMode={unidad === 'UNIDAD' ? 'numeric' : 'decimal'}
                autoComplete="off"
                value={texto}
                aria-invalid={errorSuelta ? true : undefined}
                onChange={(e) => fijarTexto(limpiarCantidad(e.target.value))}
                className={`${CAMPO} flex-1`}
              />
              <SelectorUnidad unidad={unidad} factor={factor} alCambiar={fijarFactor} />
            </div>
          </div>
          {errorSuelta ? (
            <p role="alert" className="text-body-sm text-error">
              {errorSuelta}
            </p>
          ) : (
            base > 0 && (
              <p className="flex items-center gap-space-xs rounded-xl bg-surface-container-low p-space-sm text-body-md text-on-surface-variant">
                <Icono nombre="info" className="shrink-0 text-[20px]" />
                <span className="min-w-0">
                  Se guarda como{' '}
                  <b className="text-on-surface">{formatearCantidad(base, unidad)}</b>
                </span>
              </p>
            )
          )}
          {parecida && (
            <div
              role="status"
              className="flex flex-col gap-space-xs rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-md text-on-surface"
            >
              <span className="flex items-center gap-space-xs">
                <Icono nombre="info" className="shrink-0 text-[20px]" />
                <span className="min-w-0">
                  Ya existe «{parecida.nombre}» de {formatearCantidad(parecida.tamano, unidad)}.
                </span>
              </span>
              <Boton
                variante="secundario"
                className="self-start"
                onClick={() => alListo({ presentacion: parecida })}
              >
                Usar esa
              </Boton>
            </div>
          )}
          {!errorSuelta && (
            <p className="text-body-sm text-on-surface-variant">
              Tope: {formatearCantidad(TOPES.presentacion[unidad], unidad)} por presentación.
            </p>
          )}
        </>
      )}

      <FormularioError mensaje={crear.error?.message} />
      <Boton className="min-h-[56px] w-full" disabled={!listo || crear.isPending} onClick={guardar}>
        Crear presentación
      </Boton>
    </Hoja>
  );
}
