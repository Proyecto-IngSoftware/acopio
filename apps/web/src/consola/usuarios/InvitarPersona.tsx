import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Ubicacion } from '../../api/red';
import { useCrearUsuario, type RolInterno } from '../../api/usuarios';
import { Boton, EnlaceBoton } from '../../componentes/Boton';
import { Campo } from '../../componentes/Campo';
import { Icono } from '../../componentes/Icono';
import { FormularioError } from '../catalogo/FormularioError';
import { Encabezado } from '../Encabezado';
import { BuscadorUbicaciones, UbicacionElegida } from './BuscadorUbicaciones';
import { CompartirEnlace, ROLES } from './comun';

/** C16 Invitar persona (RF-IDE-001, 002). */
export function InvitarPersona() {
  const crear = useCrearUsuario();
  const [nombre, fijarNombre] = useState('');
  const [username, fijarUsername] = useState('');
  const [rol, fijarRol] = useState<RolInterno>('OPERADOR');
  const [correo, fijarCorreo] = useState('');
  const [elegidas, fijarElegidas] = useState<Ubicacion[]>([]);
  const [aviso, fijarAviso] = useState<string | null>(null);
  const conAlcance = rol !== 'ADMIN';

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (crear.isPending) return;
    if (conAlcance && elegidas.length === 0) {
      fijarAviso('Agrega al menos una ubicación: un operador, receptor o auditor la necesita.');
      return;
    }
    fijarAviso(null);
    crear.mutate({
      nombre: nombre.trim(),
      username: username.trim().toLowerCase(),
      rol,
      correo: correo.trim() || null,
      asignaciones: conAlcance ? elegidas.map((u) => ({ tipo: u.tipo, ubicacionId: u.id })) : [],
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
            <BuscadorUbicaciones
              excluir={elegidas.map((u) => u.id)}
              alElegir={(u) => {
                fijarElegidas([...elegidas, u]);
                fijarAviso(null);
              }}
            />
            {elegidas.length > 0 && (
              <ul className="flex flex-col gap-space-xs">
                {elegidas.map((u) => (
                  <UbicacionElegida
                    key={u.id}
                    tipo={u.tipo}
                    nombre={u.nombre}
                    alQuitar={() => fijarElegidas(elegidas.filter((x) => x !== u))}
                  />
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
