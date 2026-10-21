import { LIMITES_TURNOS, PERFILES_VOLUNTARIO, hoyBogota } from '@acopio/shared';
import { useState, type FormEvent } from 'react';
import { useAcopiosGestion, useEntidades, useUbicacionesMias } from '../../api/red';
import {
  useCrearJornadas,
  useEditarJornada,
  type CambiosJornada,
  type DatosJornada,
  type JornadaGestion,
  type Perfil,
} from '../../api/turnos';
import { Boton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Icono } from '../../componentes/Icono';
import { Segmentado } from '../../componentes/Segmentado';
import { diaBogota } from '../../formato';
import { NOMBRE_PERFIL } from '../../portal/turnos/piezas';
import { useSesion } from '../../sesion/Sesion';
import { Encabezado } from '../Encabezado';
import { FormularioError } from '../catalogo/FormularioError';
import { CalendarioFechas } from './CalendarioFechas';

/** «14:00» en Bogotá, para los campos de hora. */
const horaCampo = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));

const AREA =
  'min-h-[96px] w-full rounded-xl border-[1.5px] border-outline-variant bg-surface-container-lowest p-space-md text-body-md text-on-surface focus:border-primary-container';

/** C14: crear una o varias jornadas, o editar una (RF-TUR-001, T-02, T-12). */
export function FormularioJornada({
  jornada,
  hoy = hoyBogota(new Date()),
  alTerminar,
}: {
  jornada: JornadaGestion | null;
  hoy?: string;
  alTerminar: () => void;
}) {
  const { usuario } = useSesion();
  const admin = usuario?.rol === 'ADMIN';
  const mias = useUbicacionesMias(!admin);
  const todos = useAcopiosGestion(admin);
  const entidades = useEntidades();
  const acopios = admin
    ? (todos.data ?? []).map((a) => ({ id: a.id, nombre: a.nombre }))
    : (mias.data ?? []).filter((u) => u.tipo === 'ACOPIO');
  const verificadas = (admin ? (entidades.data ?? []) : []).filter(
    (e) => e.verificacion === 'VERIFICADA',
  );

  const deEntidad = jornada?.lugar.tipo === 'ENTIDAD';
  const [duenio, fijarDuenio] = useState<'acopio' | 'entidad'>(deEntidad ? 'entidad' : 'acopio');
  const [acopioId, fijarAcopioId] = useState('');
  const [entidadId, fijarEntidadId] = useState('');
  const [direccion, fijarDireccion] = useState(deEntidad ? jornada!.lugar.direccion : '');
  const [municipio, fijarMunicipio] = useState(deEntidad ? jornada!.lugar.municipio : '');
  const [titulo, fijarTitulo] = useState(jornada?.titulo ?? '');
  const [descripcion, fijarDescripcion] = useState(jornada?.descripcion ?? '');
  const [queLlevar, fijarQueLlevar] = useState(jornada?.queLlevar ?? '');
  const [fechas, fijarFechas] = useState<string[]>([]);
  const [fecha, fijarFecha] = useState(jornada ? diaBogota(jornada.inicio) : '');
  const [horaInicio, fijarHoraInicio] = useState(jornada ? horaCampo(jornada.inicio) : '');
  const [horaFin, fijarHoraFin] = useState(jornada ? horaCampo(jornada.fin) : '');
  const [cupo, fijarCupo] = useState(String(jornada?.cupoMaximo ?? 10));
  const [perfil, fijarPerfil] = useState<Perfil | ''>(jornada?.perfilRequerido ?? '');
  const [ropaCerrada, fijarRopaCerrada] = useState(jornada?.requisitos.ropaCerrada ?? false);
  const [carga, fijarCarga] = useState(jornada?.requisitos.carga ?? false);
  const [edad, fijarEdad] = useState(String(jornada?.requisitos.edadMinima ?? ''));

  const crear = useCrearJornadas();
  const editar = useEditarJornada(jornada?.id ?? '');
  const mutacion = jornada ? editar : crear;
  // El Operador no cambia el lugar de una jornada de entidad (lo fija el Administrador)
  const editaLugar = admin && duenio === 'entidad';

  const requisitos = {
    ...(edad ? { edadMinima: Number(edad) } : {}),
    ropaCerrada,
    carga,
  };
  const n = jornada ? 1 : fechas.length;
  const listo =
    titulo.trim() !== '' &&
    descripcion.trim() !== '' &&
    horaInicio !== '' &&
    horaFin !== '' &&
    Number(cupo) >= 1 &&
    (jornada
      ? fecha !== ''
      : fechas.length > 0 &&
        (duenio === 'acopio'
          ? acopioId || acopios[0]?.id
          : (entidadId || verificadas[0]?.id) && direccion.trim() && municipio.trim()));

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (jornada) {
      const antes = {
        fecha: diaBogota(jornada.inicio),
        horaInicio: horaCampo(jornada.inicio),
        horaFin: horaCampo(jornada.fin),
      };
      // Solo lo que cambió: mover la hora o el lugar avisa a quienes reservaron
      const cambios: CambiosJornada = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        queLlevar: queLlevar.trim() || null,
        cupoMaximo: Number(cupo),
        requisitos,
        perfilRequerido: perfil || null,
        // La API pide la fecha y las dos horas juntas para mover la jornada, o ninguna
        ...(fecha !== antes.fecha || horaInicio !== antes.horaInicio || horaFin !== antes.horaFin
          ? { fecha, horaInicio, horaFin }
          : {}),
        ...(editaLugar && direccion.trim() !== jornada.lugar.direccion
          ? { direccion: direccion.trim() }
          : {}),
        ...(editaLugar && municipio.trim() !== jornada.lugar.municipio
          ? { municipio: municipio.trim() }
          : {}),
      };
      editar.mutate(cambios, { onSuccess: alTerminar });
      return;
    }
    const datos: DatosJornada = {
      ...(duenio === 'acopio'
        ? { acopioId: acopioId || acopios[0]!.id }
        : {
            entidadId: entidadId || verificadas[0]!.id,
            direccion: direccion.trim(),
            municipio: municipio.trim(),
          }),
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      queLlevar: queLlevar.trim() || null,
      cupoMaximo: Number(cupo),
      requisitos,
      perfilRequerido: perfil || null,
      fechas,
      horaInicio,
      horaFin,
    };
    crear.mutate(datos, { onSuccess: alTerminar });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-md">
      <Encabezado titulo={jornada ? 'Editar jornada' : 'Nueva jornada'} volverA="/consola/turnos" />

      {!jornada && admin && (
        <div className="flex flex-col gap-space-xs">
          <span className="text-label-md text-on-surface">De quién es</span>
          <Segmentado
            etiqueta="De quién es"
            valor={duenio}
            alCambiar={fijarDuenio}
            opciones={[
              { valor: 'acopio', texto: 'Un acopio' },
              { valor: 'entidad', texto: 'Una entidad' },
            ]}
          />
        </div>
      )}
      {!jornada && duenio === 'acopio' && (
        <Selector
          id="jornada-acopio"
          etiqueta="Dónde"
          value={acopioId || acopios[0]?.id || ''}
          onChange={(e) => fijarAcopioId(e.target.value)}
        >
          {acopios.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </Selector>
      )}
      {!jornada && duenio === 'entidad' && (
        <Selector
          id="jornada-entidad"
          etiqueta="Entidad"
          ayuda="Solo aparecen las entidades verificadas."
          value={entidadId || verificadas[0]?.id || ''}
          onChange={(e) => fijarEntidadId(e.target.value)}
        >
          {verificadas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </Selector>
      )}
      {(editaLugar || (!jornada && duenio === 'entidad')) && (
        <>
          <Campo
            id="jornada-direccion"
            etiqueta="Dirección"
            required
            value={direccion}
            onChange={(e) => fijarDireccion(e.target.value)}
          />
          <Campo
            id="jornada-municipio"
            etiqueta="Municipio"
            required
            value={municipio}
            onChange={(e) => fijarMunicipio(e.target.value)}
          />
        </>
      )}

      <Campo
        id="jornada-titulo"
        etiqueta="Título"
        required
        minLength={5}
        maxLength={80}
        value={titulo}
        onChange={(e) => fijarTitulo(e.target.value)}
      />
      <div className="flex flex-col gap-space-xs">
        <label htmlFor="jornada-labor" className="text-label-md text-on-surface">
          Labor
        </label>
        <textarea
          id="jornada-labor"
          required
          minLength={20}
          maxLength={1000}
          value={descripcion}
          onChange={(e) => fijarDescripcion(e.target.value)}
          className={AREA}
        />
      </div>
      <Campo
        id="jornada-llevar"
        etiqueta="Qué llevar (opcional)"
        maxLength={300}
        value={queLlevar}
        onChange={(e) => fijarQueLlevar(e.target.value)}
      />

      {jornada ? (
        <Campo
          id="jornada-fecha"
          etiqueta="Fecha"
          type="date"
          required
          value={fecha}
          onChange={(e) => fijarFecha(e.target.value)}
        />
      ) : (
        <div className="flex flex-col gap-space-xs">
          <span className="text-label-md text-on-surface">Fechas</span>
          <CalendarioFechas hoy={hoy} fechas={fechas} alCambiar={fijarFechas} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-space-sm">
        <Campo
          id="jornada-inicio"
          etiqueta="Empieza"
          type="time"
          required
          value={horaInicio}
          onChange={(e) => fijarHoraInicio(e.target.value)}
        />
        <Campo
          id="jornada-fin"
          etiqueta="Termina"
          type="time"
          required
          value={horaFin}
          onChange={(e) => fijarHoraFin(e.target.value)}
        />
      </div>
      <FormularioError mensaje={mutacion.error?.message} />

      <Campo
        id="jornada-cupo"
        etiqueta="Cupos por jornada"
        type="number"
        inputMode="numeric"
        min={1}
        max={LIMITES_TURNOS.cupoMaximo}
        required
        value={cupo}
        onChange={(e) => fijarCupo(e.target.value)}
      />
      <Selector
        id="jornada-perfil"
        etiqueta="Perfil que pide (opcional)"
        ayuda="Quien reserva lo declara; pueden pedir que lo demuestre al llegar."
        value={perfil}
        onChange={(e) => fijarPerfil(e.target.value as Perfil | '')}
      >
        <option value="">Ninguno</option>
        {PERFILES_VOLUNTARIO.map((p) => (
          <option key={p} value={p}>
            {NOMBRE_PERFIL[p]}
          </option>
        ))}
      </Selector>
      <fieldset className="flex flex-col gap-space-sm">
        <legend className="mb-space-xs text-label-md text-on-surface">Requisitos</legend>
        <label className="flex min-h-[44px] items-center gap-space-sm text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={ropaCerrada}
            onChange={(e) => fijarRopaCerrada(e.target.checked)}
            className="h-5 w-5 accent-primary-container"
          />
          Ropa y calzado cerrados
        </label>
        <label className="flex min-h-[44px] items-center gap-space-sm text-body-md text-on-surface">
          <input
            type="checkbox"
            checked={carga}
            onChange={(e) => fijarCarga(e.target.checked)}
            className="h-5 w-5 accent-primary-container"
          />
          Trabajo con carga
        </label>
        <Campo
          id="jornada-edad"
          etiqueta="Edad mínima (opcional)"
          type="number"
          inputMode="numeric"
          min={12}
          max={99}
          value={edad}
          onChange={(e) => fijarEdad(e.target.value)}
        />
      </fieldset>

      <p className="flex items-start gap-space-sm rounded-xl border border-outline-variant bg-surface-container-low p-space-sm text-body-sm text-on-surface">
        <Icono nombre="schedule" className="mt-0.5 text-[20px] text-primary-container" />
        Las reservas se cierran 12 horas antes del inicio. Crea la jornada con al menos{' '}
        {LIMITES_TURNOS.horasAnticipacion} horas de anticipación.
      </p>
      <Boton type="submit" disabled={!listo} ocupado={mutacion.isPending} className="min-h-[56px]">
        {jornada ? 'Guardar cambios' : n > 1 ? `Crear ${n} jornadas` : 'Crear jornada'}
      </Boton>
      <Boton variante="secundario" onClick={alTerminar}>
        Cancelar
      </Boton>
    </form>
  );
}
