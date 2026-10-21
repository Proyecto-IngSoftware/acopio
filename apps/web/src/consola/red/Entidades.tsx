import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  useAcopiosGestion,
  useEntidades,
  useGuardarEntidad,
  type DatosEntidad,
  type Entidad,
} from '../../api/red';
import { useQuitarVerificacion, useSubirLogo, useVerificarEntidad } from '../../api/causas';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { dominioDe } from '@acopio/shared';
import { Sello } from '../../portal/causas/piezas';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';
import { Buscador } from './Buscador';

const TIPOS = ['Fundación', 'ONG', 'Alcaldía', 'Iglesia', 'Junta de acción comunal'];

/**
 * C15 Entidades (RF-RED-005 y 006). Verificar es una marca del Administrador, con el aviso
 * de seguridad y su casilla (pieza C, C-01 y C-09).
 */
export function Entidades() {
  const [q, fijarQ] = useState('');
  const [editando, fijarEditando] = useState<Entidad | 'nueva' | null>(null);
  // Se guarda el id: la hoja lee la entidad de la lista, que se refresca tras cada cambio
  const [abiertaId, fijarAbiertaId] = useState<string | null>(null);
  const [paso, fijarPaso] = useState<'verificar' | 'quitar' | null>(null);
  const cerrarTodo = () => {
    fijarAbiertaId(null);
    fijarPaso(null);
  };
  const { data, error, isPending, refetch } = useEntidades();
  const abierta = data?.find((e) => e.id === abiertaId) ?? null;
  const { data: acopios } = useAcopiosGestion();

  const porEntidad = new Map<string, number>();
  for (const a of acopios ?? [])
    if (a.entidad) porEntidad.set(a.entidad.id, (porEntidad.get(a.entidad.id) ?? 0) + 1);
  const texto = q.trim().toLocaleLowerCase('es-CO');
  const visibles = (data ?? []).filter((e) => e.nombre.toLocaleLowerCase('es-CO').includes(texto));

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado
        titulo="Entidades"
        subtitulo="Fundaciones, ONG y alcaldías que responden por los acopios y las causas"
      />
      <Boton className="min-h-[56px] w-full" onClick={() => fijarEditando('nueva')}>
        <Icono nombre="add_circle" className="text-[20px]" />
        Nueva entidad
      </Boton>
      <Buscador etiqueta="Buscar entidad" valor={q} alCambiar={fijarQ} />

      {isPending && <Esqueleto etiqueta="Cargando entidades" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && visibles.length === 0 && (
        <EstadoVacio
          ilustracion="cajas"
          titulo={q ? 'Ninguna entidad coincide' : 'Todavía no hay entidades'}
        >
          {q ? 'Prueba con otro nombre.' : 'Crea la primera para poder registrar acopios.'}
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {visibles.map((e) => {
          const n = porEntidad.get(e.id) ?? 0;
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => fijarAbiertaId(e.id)}
                className="flex w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body-lg font-semibold text-on-surface">{e.nombre}</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {[e.tipo, e.nit && `NIT ${e.nit}`].filter(Boolean).join(' · ')}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-space-sm gap-y-1 text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Icono nombre="warehouse" className="text-[18px]" />
                      {n === 0 ? 'Sin acopios' : n === 1 ? '1 acopio' : `${n} acopios`}
                    </span>
                    {!!e.causasActivas && (
                      <span className="flex items-center gap-1">
                        <Icono nombre="favorite" className="text-[18px]" />
                        {e.causasActivas === 1
                          ? '1 causa activa'
                          : `${e.causasActivas} causas activas`}
                      </span>
                    )}
                  </span>
                  {e.verificadaEn ? (
                    <Sello verificadaEn={e.verificadaEn} />
                  ) : (
                    <span className="inline-flex items-center gap-1 self-start rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
                      <Icono nombre="pending" className="text-[16px]" />
                      Sin verificar
                    </span>
                  )}
                </span>
                <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
              </button>
            </li>
          );
        })}
      </ul>

      {abierta && paso === null && (
        <HojaEntidad
          entidad={abierta}
          alCerrar={cerrarTodo}
          alEditar={() => {
            fijarEditando(abierta);
            fijarAbiertaId(null);
          }}
          alVerificar={() => fijarPaso('verificar')}
          alQuitar={() => fijarPaso('quitar')}
        />
      )}
      {abierta && paso === 'verificar' && (
        <AvisoVerificar entidad={abierta} alCerrar={cerrarTodo} />
      )}
      {abierta && paso === 'quitar' && <ConfirmarQuitar entidad={abierta} alCerrar={cerrarTodo} />}
      {editando && (
        <FormularioEntidad
          entidad={editando === 'nueva' ? null : editando}
          alCerrar={() => fijarEditando(null)}
        />
      )}
    </div>
  );
}

const CAMPOS: { clave: keyof DatosEntidad; etiqueta: string; tipo?: string }[] = [
  { clave: 'nombre', etiqueta: 'Nombre' },
  { clave: 'tipo', etiqueta: 'Tipo' },
  { clave: 'nit', etiqueta: 'NIT' },
  { clave: 'sitioWeb', etiqueta: 'Sitio web', tipo: 'url' },
  { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'tel' },
  { clave: 'correo', etiqueta: 'Correo', tipo: 'email' },
];

function FormularioEntidad({
  entidad,
  alCerrar,
}: {
  entidad: Entidad | null;
  alCerrar: () => void;
}) {
  const guardar = useGuardarEntidad();
  const inicial: Record<keyof DatosEntidad, string> = {
    nombre: entidad?.nombre ?? '',
    tipo: entidad?.tipo ?? '',
    nit: entidad?.nit ?? '',
    sitioWeb: entidad?.sitioWeb ?? '',
    telefono: entidad?.telefono ?? '',
    correo: entidad?.correo ?? '',
    descripcion: entidad?.descripcion ?? '',
  };
  const [valores, fijarValores] = useState(inicial);
  const cambiar = (clave: keyof DatosEntidad, valor: string) =>
    fijarValores((v) => ({ ...v, [clave]: valor }));

  function enviar(e: FormEvent) {
    e.preventDefault();
    const datos: Partial<DatosEntidad> = {};
    for (const clave of Object.keys(valores) as (keyof DatosEntidad)[]) {
      const v = valores[clave].trim();
      // Al editar se manda solo lo que cambió; un campo vaciado se manda como null
      if (entidad && v === inicial[clave]) continue;
      (datos as Record<string, string | null>)[clave] =
        v || (clave === 'nombre' || clave === 'tipo' ? v : null);
    }
    guardar.mutate({ id: entidad?.id, datos }, { onSuccess: alCerrar });
  }

  return (
    <Hoja titulo={entidad ? `Editar ${entidad.nombre}` : 'Nueva entidad'} alCerrar={alCerrar}>
      <form onSubmit={enviar} className="flex flex-col gap-space-md">
        {CAMPOS.map((c) => (
          <Campo
            key={c.clave}
            id={`entidad-${c.clave}`}
            etiqueta={c.etiqueta}
            type={c.tipo ?? 'text'}
            list={c.clave === 'tipo' ? 'tipos-entidad' : undefined}
            value={valores[c.clave]}
            onChange={(ev) => cambiar(c.clave, ev.target.value)}
            required={c.clave === 'nombre' || c.clave === 'tipo'}
          />
        ))}
        <datalist id="tipos-entidad">
          {TIPOS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="entidad-descripcion" className="text-label-md text-on-surface">
            Descripción
          </label>
          <textarea
            id="entidad-descripcion"
            rows={3}
            value={valores.descripcion}
            onChange={(ev) => cambiar('descripcion', ev.target.value)}
            className="w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface focus:border-primary-container"
          />
        </div>
        <FormularioError mensaje={guardar.error?.message} />
        <Boton type="submit" className="min-h-[56px] w-full" ocupado={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}

/** La entidad abierta: logotipo, verificación y edición. */
function HojaEntidad({
  entidad,
  alCerrar,
  alEditar,
  alVerificar,
  alQuitar,
}: {
  entidad: Entidad;
  alCerrar: () => void;
  alEditar: () => void;
  alVerificar: () => void;
  alQuitar: () => void;
}) {
  const subir = useSubirLogo(entidad.id);
  const sitio = entidad.sitioWeb ? dominioDe(entidad.sitioWeb) : null;
  return (
    <Hoja titulo={entidad.nombre} alCerrar={alCerrar}>
      {sitio && <p className="-mt-space-sm text-body-sm text-on-surface-variant">{sitio}</p>}
      {entidad.verificadaEn && <Sello verificadaEn={entidad.verificadaEn} />}
      <label className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline text-body-sm text-on-surface-variant">
        <Icono nombre="add_a_photo" className="text-[24px]" />
        {subir.isPending ? 'Subiendo…' : entidad.tieneLogo ? 'Cambiar logotipo' : 'Subir logotipo'}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(ev) => {
            const archivo = ev.target.files?.[0];
            if (archivo) subir.mutate(archivo);
          }}
        />
      </label>
      <FormularioError mensaje={subir.error?.message} />
      {entidad.verificacion === 'VERIFICADA' ? (
        <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alQuitar}>
          Quitar verificación
        </Boton>
      ) : entidad.sitioWeb ? (
        <Boton className="min-h-[56px] w-full" onClick={alVerificar}>
          <Icono nombre="verified" className="text-[20px]" />
          Verificar entidad
        </Boton>
      ) : (
        <p className="rounded-xl bg-surface-container-low p-space-sm text-body-sm text-on-surface-variant">
          Agrega el sitio web para poder verificarla.
        </p>
      )}
      <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alEditar}>
        Editar datos
      </Boton>
    </Hoja>
  );
}

/** El aviso de seguridad (C-02, C-09): el botón no se activa sin la casilla. */
function AvisoVerificar({ entidad, alCerrar }: { entidad: Entidad; alCerrar: () => void }) {
  const [confirmo, fijarConfirmo] = useState(false);
  const verificar = useVerificarEntidad(entidad.id);
  return (
    <Hoja titulo={`Verificar ${entidad.nombre}`} alCerrar={alCerrar}>
      <div className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
        <Icono nombre="shield" className="mt-0.5 text-[22px] text-primary-container" />
        <p>
          <strong className="block">Antes de verificar</strong>
          Acopio va a dirigir a los donantes hacia esta entidad. Si no es quien dice ser, los
          estaremos mandando a una estafa. En esta etapa solo se verifican organizaciones con años
          de trayectoria y reconocidas fuera del país.
        </p>
      </div>
      <label className="flex min-h-[48px] items-start gap-space-sm text-body-md text-on-surface">
        <input
          type="checkbox"
          checked={confirmo}
          onChange={(ev) => fijarConfirmo(ev.target.checked)}
          className="mt-1 h-5 w-5 accent-primary-container"
        />
        Confirmo que revisé la entidad y su sitio oficial.
      </label>
      <FormularioError mensaje={verificar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        disabled={!confirmo}
        ocupado={verificar.isPending}
        onClick={() => verificar.mutate(undefined, { onSuccess: alCerrar })}
      >
        Verificar entidad
      </Boton>
      <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alCerrar}>
        Cancelar
      </Boton>
    </Hoja>
  );
}

function ConfirmarQuitar({ entidad, alCerrar }: { entidad: Entidad; alCerrar: () => void }) {
  const quitar = useQuitarVerificacion(entidad.id);
  const n = entidad.causasActivas ?? 0;
  return (
    <Hoja titulo="¿Quitar la verificación?" alCerrar={alCerrar}>
      <p className="text-body-md text-on-surface-variant">
        {entidad.nombre} deja de estar verificada.{' '}
        {n === 0
          ? 'No tiene causas activas.'
          : `${n === 1 ? 'Su única causa activa pasa' : `Sus ${n} causas activas pasan`} a atendidas, sin sello ni enlace al sitio oficial.`}{' '}
        Volver a verificarla no las reactiva.
      </p>
      <FormularioError mensaje={quitar.error?.message} />
      <Boton
        className="min-h-[56px] w-full"
        ocupado={quitar.isPending}
        onClick={() => quitar.mutate(undefined, { onSuccess: alCerrar })}
      >
        Quitar verificación
      </Boton>
      <Boton variante="secundario" className="min-h-[56px] w-full" onClick={alCerrar}>
        Cancelar
      </Boton>
    </Hoja>
  );
}
