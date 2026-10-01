import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  useAcopiosGestion,
  useEntidades,
  useGuardarEntidad,
  type DatosEntidad,
  type Entidad,
} from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { Hoja } from '../../componentes/Hoja';
import { Icono } from '../../componentes/Icono';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';
import { Buscador } from './Buscador';

const TIPOS = ['Fundación', 'ONG', 'Alcaldía', 'Iglesia', 'Junta de acción comunal'];

/** C15 Entidades (RF-RED-005). La verificación con documento llega con la especificación C. */
export function Entidades() {
  const [q, fijarQ] = useState('');
  const [editando, fijarEditando] = useState<Entidad | 'nueva' | null>(null);
  const { data, error, isPending, refetch } = useEntidades();
  const { data: acopios } = useAcopiosGestion();

  const porEntidad = new Map<string, number>();
  for (const a of acopios ?? [])
    porEntidad.set(a.entidad.id, (porEntidad.get(a.entidad.id) ?? 0) + 1);
  const texto = q.trim().toLocaleLowerCase('es-CO');
  const visibles = (data ?? []).filter((e) => e.nombre.toLocaleLowerCase('es-CO').includes(texto));

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado
        titulo="Entidades"
        subtitulo="Fundaciones, ONG y alcaldías que responden por los acopios"
      />
      <Boton className="min-h-[56px] w-full" onClick={() => fijarEditando('nueva')}>
        <Icono nombre="add_circle" className="text-[20px]" />
        Nueva entidad
      </Boton>
      <Buscador etiqueta="Buscar entidad" valor={q} alCambiar={fijarQ} />

      {isPending && <Esqueleto etiqueta="Cargando entidades" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && visibles.length === 0 && (
        <EstadoVacio titulo={q ? 'Ninguna entidad coincide' : 'Todavía no hay entidades'}>
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
                onClick={() => fijarEditando(e)}
                className="flex w-full items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body-lg font-semibold text-on-surface">{e.nombre}</span>
                  <span className="text-body-sm text-on-surface-variant">
                    {[e.tipo, e.nit && `NIT ${e.nit}`].filter(Boolean).join(' · ')}
                  </span>
                  <span className="flex flex-wrap items-center gap-space-xs text-body-sm text-on-surface-variant">
                    {n === 0 ? 'Sin acopios' : n === 1 ? '1 acopio' : `${n} acopios`}
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
                      <Icono nombre="pending" className="text-[16px]" />
                      Sin verificar
                    </span>
                  </span>
                </span>
                <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
              </button>
            </li>
          );
        })}
      </ul>

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
        <Boton type="submit" className="min-h-[56px] w-full" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar'}
        </Boton>
      </form>
    </Hoja>
  );
}
