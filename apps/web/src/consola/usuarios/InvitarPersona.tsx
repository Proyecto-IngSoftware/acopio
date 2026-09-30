import { useState } from 'react';
import type { FormEvent } from 'react';
import { useCrearUsuario, type Asignacion, type RolInterno } from '../../api/usuarios';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Campo, Selector } from '../../componentes/Campo';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from '../catalogo/FormularioError';
import { Encabezado } from '../Encabezado';
import { CompartirEnlace, ROLES } from './comun';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** C16 Invitar persona (RF-IDE-001, 002). */
export function InvitarPersona() {
  const crear = useCrearUsuario();
  const [nombre, fijarNombre] = useState('');
  const [username, fijarUsername] = useState('');
  const [rol, fijarRol] = useState<RolInterno>('OPERADOR');
  const [correo, fijarCorreo] = useState('');
  const [asignaciones, fijarAsignaciones] = useState<Asignacion[]>([]);
  const [tipo, fijarTipo] = useState<Asignacion['tipo']>('ACOPIO');
  const [ubicacion, fijarUbicacion] = useState('');
  const [aviso, fijarAviso] = useState<string | null>(null);
  const conAlcance = rol !== 'ADMIN';

  function agregar() {
    const id = ubicacion.trim();
    if (!UUID.test(id)) {
      fijarAviso('El identificador de la ubicación no es válido.');
      return;
    }
    fijarAviso(null);
    if (!asignaciones.some((a) => a.ubicacionId === id))
      fijarAsignaciones([...asignaciones, { tipo, ubicacionId: id }]);
    fijarUbicacion('');
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (crear.isPending) return;
    if (conAlcance && asignaciones.length === 0) {
      fijarAviso('Agrega al menos una ubicación: un operador, receptor o auditor la necesita.');
      return;
    }
    fijarAviso(null);
    crear.mutate({
      nombre: nombre.trim(),
      username: username.trim().toLowerCase(),
      rol,
      correo: correo.trim() || null,
      asignaciones: conAlcance ? asignaciones : [],
    });
  }

  if (crear.data) {
    return (
      <div className="flex flex-col gap-space-md px-margin py-space-md">
        <Encabezado titulo="Invitar persona" volverA="/consola/usuarios" />
        <section className="flex flex-col gap-space-md rounded-xl border-2 border-primary-container bg-surface-container-lowest p-space-md">
          <div className="flex items-center gap-space-xs">
            <Icono nombre="check_circle" relleno className="text-[24px] text-primary-container" />
            <h2 className="text-headline-sm text-on-surface">
              Invitación creada para {crear.data.usuario.nombre}
            </h2>
          </div>
          <CompartirEnlace
            enlace={crear.data.invitacion.enlace}
            nombre={crear.data.usuario.nombre}
          />
        </section>
        <EnlaceBoton a={`/consola/usuarios/${crear.data.usuario.id}`} variante="secundario">
          Ver a {crear.data.usuario.nombre}
        </EnlaceBoton>
        <Boton variante="terciario" onClick={() => window.location.reload()}>
          Invitar a otra persona
        </Boton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-md px-margin py-space-md">
      <Encabezado titulo="Invitar persona" volverA="/consola/usuarios" />
      <form
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm"
      >
        <Campo
          id="inv-nombre"
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => fijarNombre(e.target.value)}
          required
        />
        <Campo
          id="inv-usuario"
          etiqueta="Nombre de usuario"
          ayuda="Con él inicia sesión. Minúsculas, sin espacios."
          autoCapitalize="none"
          spellCheck={false}
          value={username}
          onChange={(e) => fijarUsername(e.target.value)}
          required
        />

        <fieldset className="flex min-w-0 flex-col gap-space-xs">
          <legend className="pb-space-xs text-label-md text-on-surface">Rol</legend>
          {ROLES.map((r) => (
            <label
              key={r.rol}
              className={`flex min-h-[56px] cursor-pointer items-start gap-space-sm rounded-xl border-[1.5px] p-space-sm ${
                rol === r.rol
                  ? 'border-primary-container bg-primary-fixed/40'
                  : 'border-outline-variant'
              }`}
            >
              <input
                type="radio"
                name="rol"
                value={r.rol}
                checked={rol === r.rol}
                onChange={() => fijarRol(r.rol)}
                className="mt-1 h-5 w-5 accent-primary-container"
              />
              <span className="flex flex-col">
                <span className="text-label-md text-on-surface">{r.nombre}</span>
                <span className="text-body-sm text-on-surface-variant">{r.descripcion}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <Campo
          id="inv-correo"
          etiqueta="Correo (opcional)"
          ayuda="Si no tiene correo, le mandas el enlace por WhatsApp."
          type="email"
          value={correo}
          onChange={(e) => fijarCorreo(e.target.value)}
        />

        {conAlcance && (
          <fieldset className="flex min-w-0 flex-col gap-space-sm">
            <legend className="pb-space-xs text-label-md text-on-surface">
              Ubicaciones asignadas
            </legend>
            <p className="text-body-sm text-on-surface-variant">
              La lista de acopios y zonas llega con el Bloque 1. Mientras tanto, pega el
              identificador de la ubicación.
            </p>
            <Selector
              id="inv-tipo"
              etiqueta="Tipo"
              value={tipo}
              onChange={(e) => fijarTipo(e.target.value as Asignacion['tipo'])}
            >
              <option value="ACOPIO">Acopio</option>
              <option value="ZONA">Zona</option>
            </Selector>
            <Campo
              id="inv-ubicacion"
              etiqueta="Identificador de la ubicación"
              value={ubicacion}
              onChange={(e) => fijarUbicacion(e.target.value)}
            />
            <Boton variante="secundario" onClick={agregar}>
              <Icono nombre="add_location_alt" className="text-[18px]" />
              Agregar ubicación
            </Boton>
            {asignaciones.length > 0 && (
              <ul className="flex flex-col gap-space-xs">
                {asignaciones.map((a) => (
                  <li
                    key={a.ubicacionId}
                    className="flex items-center gap-space-xs rounded-lg bg-surface-container-low p-space-sm text-body-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {a.tipo === 'ACOPIO' ? 'Acopio' : 'Zona'} · {a.ubicacionId}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${a.ubicacionId}`}
                      onClick={() => fijarAsignaciones(asignaciones.filter((x) => x !== a))}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant"
                    >
                      <Icono nombre="delete" className="text-[20px]" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        )}

        <FormularioError mensaje={aviso ?? crear.error?.message} />
        <Boton type="submit" className="min-h-[56px] w-full" disabled={crear.isPending}>
          <Icono nombre="send" className="text-[18px]" />
          {crear.isPending ? 'Creando…' : 'Crear e invitar'}
        </Boton>
      </form>
    </div>
  );
}
