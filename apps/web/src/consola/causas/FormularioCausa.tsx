import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  CATEGORIAS_CAUSA,
  cierreValido,
  dominioDe,
  hoyBogota,
  mismoDominio,
  topeCierre,
} from '@acopio/shared';
import {
  subirImagenCausa,
  useCrearCausa,
  useEditarCausa,
  type CategoriaCausa,
  type CausaGestion,
  type DatosCausa,
} from '../../api/causas';
import { useEntidades } from '../../api/red';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Icono } from '../../componentes/Icono';
import { diaConAnio } from '../../formato';
import { NOMBRE_CATEGORIA } from '../../portal/causas/piezas';
import { FormularioError } from '../catalogo/FormularioError';
import { Confirmar, DestinoCausa } from './Confirmar';
import { EditorPasos } from './EditorPasos';

/** C22: crear o editar una causa (RF-RED-007). Publicar pide la confirmación corta (C-09). */
export function FormularioCausa({
  causa,
  alTerminar,
}: {
  causa: CausaGestion | null;
  alTerminar: () => void;
}) {
  const hoy = hoyBogota(new Date());
  const tope = topeCierre(hoy);
  const { data: entidades } = useEntidades();
  const verificadas = (entidades ?? []).filter((e) => e.verificacion === 'VERIFICADA');
  const [datos, fijarDatos] = useState<DatosCausa>({
    entidadId: causa?.entidad.id ?? '',
    categoria: causa?.categoria ?? 'PERSONAS',
    titulo: causa?.titulo ?? '',
    descripcion: causa?.descripcion ?? '',
    pasos: causa?.pasos ?? [''],
    urlOficial: causa?.urlOficial ?? '',
    cierraEl: causa?.cierraEl ?? '',
  });
  const [imagen, fijarImagen] = useState<File | null>(null);
  const [confirmando, fijarConfirmando] = useState(false);
  const crear = useCrearCausa();
  const editar = useEditarCausa(causa?.id ?? '');
  const [errorImagen, fijarErrorImagen] = useState<string>();
  const cambiar = <K extends keyof DatosCausa>(k: K, v: DatosCausa[K]) =>
    fijarDatos((d) => ({ ...d, [k]: v }));

  const entidadId = datos.entidadId || verificadas[0]?.id || '';
  const entidad = verificadas.find((e) => e.id === entidadId);
  const destinoCambia =
    !causa || datos.urlOficial !== causa.urlOficial || entidadId !== causa.entidad.id;
  const mutacion = causa ? editar : crear;

  function revisar(e: FormEvent) {
    e.preventDefault();
    if (destinoCambia) fijarConfirmando(true);
    else enviar();
  }

  function enviar() {
    const cuerpo = { ...datos, entidadId, pasos: datos.pasos.map((p) => p.trim()) };
    const alGuardar = async (guardada: CausaGestion) => {
      if (imagen) {
        try {
          await subirImagenCausa(guardada.id, imagen);
        } catch (error) {
          fijarErrorImagen((error as Error).message);
          return;
        }
      }
      alTerminar();
    };
    if (causa) {
      editar.mutate(destinoCambia ? { ...cuerpo, confirmo: true } : cuerpo, {
        onSuccess: (g) => void alGuardar(g),
      });
    } else {
      crear.mutate(cuerpo, { onSuccess: (g) => void alGuardar(g) });
    }
  }

  const titulo = causa ? `Editar ${causa.titulo}` : 'Nueva causa';
  const fechaInvalida = datos.cierraEl !== '' && !cierreValido(datos.cierraEl, hoy);

  return (
    <div className="flex flex-col gap-space-md">
      <button
        type="button"
        onClick={alTerminar}
        className="-ml-space-xs flex min-h-[44px] w-fit items-center gap-space-xs px-space-xs text-label-md text-primary-container"
      >
        <Icono nombre="arrow_back" className="text-[20px]" />
        Volver
      </button>
      <h1 className="text-headline-md text-on-surface">{causa ? 'Editar causa' : 'Nueva causa'}</h1>
      <form aria-label={titulo} onSubmit={revisar} className="flex flex-col gap-space-md">
        <Selector
          id="causa-entidad"
          etiqueta="Entidad"
          ayuda="Solo aparecen entidades verificadas."
          value={entidadId}
          onChange={(e) => cambiar('entidadId', e.target.value)}
          required
        >
          {verificadas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Selector>
        <fieldset className="flex flex-col gap-space-xs">
          <legend className="pb-space-xs text-label-md text-on-surface">Categoría</legend>
          <div className="flex flex-wrap gap-space-xs">
            {CATEGORIAS_CAUSA.map((c: CategoriaCausa) => (
              <button
                key={c}
                type="button"
                aria-pressed={datos.categoria === c}
                onClick={() => cambiar('categoria', c)}
                className={`min-h-[40px] rounded-full border px-space-md text-label-md ${
                  datos.categoria === c
                    ? 'border-primary-container bg-primary-container text-on-primary'
                    : 'border-outline-variant bg-surface-container-lowest text-on-surface'
                }`}
              >
                {NOMBRE_CATEGORIA[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <Campo
          id="causa-titulo"
          etiqueta="Título"
          value={datos.titulo}
          minLength={5}
          maxLength={120}
          required
          onChange={(e) => cambiar('titulo', e.target.value)}
        />
        <div className="flex flex-col gap-space-xs">
          <label htmlFor="causa-descripcion" className="text-label-md text-on-surface">
            Descripción
          </label>
          <textarea
            id="causa-descripcion"
            rows={4}
            minLength={20}
            maxLength={2000}
            required
            value={datos.descripcion}
            onChange={(e) => cambiar('descripcion', e.target.value)}
            className="w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface focus:border-primary-container"
          />
        </div>
        <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-outline text-body-sm text-on-surface-variant">
          <Icono nombre="add_a_photo" className="text-[24px]" />
          {imagen ? imagen.name : causa?.tieneImagen ? 'Cambiar imagen' : 'Subir imagen (opcional)'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => fijarImagen(e.target.files?.[0] ?? null)}
          />
        </label>
        <EditorPasos pasos={datos.pasos} alCambiar={(p) => cambiar('pasos', p)} />
        <Campo
          id="causa-url"
          etiqueta="Enlace oficial"
          type="url"
          ayuda="Debe empezar por https://."
          pattern="https://.*"
          maxLength={500}
          required
          value={datos.urlOficial}
          onChange={(e) => cambiar('urlOficial', e.target.value.trim())}
        />
        <Campo
          id="causa-cierre"
          etiqueta="Fecha de cierre"
          type="date"
          min={hoy}
          max={tope}
          ayuda={`Hasta el ${diaConAnio(tope)} (6 meses).`}
          required
          value={datos.cierraEl}
          onChange={(e) => cambiar('cierraEl', e.target.value)}
        />
        {fechaInvalida && <FormularioError mensaje="La fecha de cierre va de hoy a seis meses." />}
        <FormularioError mensaje={(!confirmando && mutacion.error?.message) || errorImagen} />
        <Boton
          type="submit"
          className="min-h-[56px] w-full"
          disabled={mutacion.isPending || fechaInvalida || !entidad}
        >
          {causa ? 'Guardar cambios' : 'Publicar causa'}
        </Boton>
      </form>
      {confirmando && entidad && (
        <Confirmar
          titulo={causa ? '¿Guardar el enlace nuevo?' : '¿Publicar esta causa?'}
          accion={causa ? 'Guardar' : 'Publicar'}
          ocupado={mutacion.isPending}
          error={mutacion.error?.message}
          alConfirmar={enviar}
          alCerrar={() => fijarConfirmando(false)}
        >
          <DestinoCausa
            verbo={causa ? 'cambiar el destino de' : 'publicar'}
            entidad={entidad.nombre}
            dominio={dominioDe(datos.urlOficial) ?? datos.urlOficial}
            dominioEntidad={
              entidad.sitioWeb && !mismoDominio(datos.urlOficial, entidad.sitioWeb)
                ? dominioDe(entidad.sitioWeb)
                : null
            }
          />
        </Confirmar>
      )}
    </div>
  );
}
