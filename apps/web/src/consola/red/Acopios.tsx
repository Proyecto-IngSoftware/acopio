import { tramoActual } from '@acopio/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAcopiosGestion, type Acopio, type EstadoAcopio } from '../../api/red';
import { EnlaceBoton } from '../../componentes/Boton';
import { Esqueleto } from '../../componentes/Esqueleto';
import { EstadoError } from '../../componentes/EstadoError';
import { EstadoVacio } from '../../componentes/EstadoVacio';
import { EtiquetaEstado } from '../../componentes/EtiquetaEstado';
import { Icono } from '../../componentes/Icono';
import { Encabezado } from '../Encabezado';
import { Buscador } from './Buscador';

const FILTROS: { valor: EstadoAcopio | undefined; texto: string }[] = [
  { valor: undefined, texto: 'Todos' },
  { valor: 'ACTIVO', texto: 'Activos' },
  { valor: 'PAUSADO', texto: 'Pausados' },
  { valor: 'CERRADO', texto: 'Cerrados' },
];

/** «Abierto ahora · Cierra 12:00», «Cerrado ahora» o, si está pausado, por qué no recibe. */
export function lineaApertura(a: Pick<Acopio, 'estado' | 'abiertoAhora' | 'horario'>): string {
  if (a.estado === 'CERRADO') return 'No aparece en el mapa';
  if (a.estado === 'PAUSADO') return 'Pausado: el mapa no lo muestra abierto';
  const tramo = tramoActual(a.horario, new Date());
  return a.abiertoAhora && tramo ? `Abierto ahora · Cierra ${tramo.cierra}` : 'Cerrado ahora';
}

/** C21 Acopios: lista para el Administrador (RF-RED-001). */
export function Acopios() {
  const [q, fijarQ] = useState('');
  const [estado, fijarEstado] = useState<EstadoAcopio | undefined>();
  const { data, error, isPending, refetch } = useAcopiosGestion();

  const todos = data ?? [];
  const texto = q.trim().toLocaleLowerCase('es-CO');
  const visibles = todos.filter(
    (a) =>
      (!estado || a.estado === estado) &&
      `${a.nombre} ${a.municipio}`.toLocaleLowerCase('es-CO').includes(texto),
  );

  return (
    <div className="flex flex-col gap-space-md">
      <Encabezado titulo="Acopios" subtitulo="Centros de acopio de la red" />
      <EnlaceBoton a="/consola/acopios/nuevo" className="min-h-[56px] w-full">
        <Icono nombre="add" className="text-[20px]" />
        Nuevo acopio
      </EnlaceBoton>
      <Buscador etiqueta="Buscar por nombre o municipio" valor={q} alCambiar={fijarQ} />
      <div className="flex gap-space-xs overflow-x-auto pb-1">
        {FILTROS.map((f) => {
          const n = f.valor ? todos.filter((a) => a.estado === f.valor).length : todos.length;
          return (
            <button
              key={f.texto}
              type="button"
              aria-pressed={estado === f.valor}
              onClick={() => fijarEstado(f.valor)}
              className="flex min-h-[44px] shrink-0 items-center gap-space-xs rounded-full border border-outline-variant bg-surface-container-lowest px-space-md text-label-md text-on-surface aria-pressed:border-primary-container aria-pressed:bg-primary-container aria-pressed:text-on-primary"
            >
              {f.texto}
              <span className="rounded-full bg-surface-container px-1.5 text-body-sm text-on-surface-variant">
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {isPending && <Esqueleto etiqueta="Cargando acopios" />}
      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}
      {data && todos.length === 0 && (
        <EstadoVacio titulo="Todavía no hay acopios">
          Crea el primero con «Nuevo acopio».
        </EstadoVacio>
      )}
      <ul className="flex flex-col gap-space-sm">
        {visibles.map((a) => (
          <li key={a.id}>
            <Link
              to={`/consola/acopios/${a.id}`}
              className={`flex items-center gap-space-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-space-md ${a.estado === 'CERRADO' ? 'opacity-70' : ''}`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-lg font-semibold text-on-surface">{a.nombre}</span>
                <span className="text-body-md text-on-surface">{a.entidad.nombre}</span>
                <span className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                  <Icono nombre="location_on" className="text-[18px]" />
                  {a.municipio}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-space-xs border-t border-outline-variant pt-space-xs text-body-sm text-on-surface-variant">
                  <EtiquetaEstado estado={a.estado} />
                  {lineaApertura(a)}
                </span>
              </span>
              <Icono nombre="chevron_right" className="text-[22px] text-on-surface-variant" />
            </Link>
          </li>
        ))}
      </ul>
      {data && todos.length > 0 && (
        <p className="text-center text-body-sm text-on-surface-variant">
          Mostrando {visibles.length} de {todos.length}
        </p>
      )}
    </div>
  );
}
