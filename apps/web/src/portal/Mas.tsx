import { Boton } from '../componentes/Boton';
import { Icono } from '../componentes/Icono';
import { FilaMenu, SeccionMenu } from '../componentes/Menu';
import type { Rol } from '../sesion/cliente-auth';
import { iniciales, nombreRol } from '../sesion/roles';
import { useSesion } from '../sesion/Sesion';
import { AvisoSinDinero } from './bloques/AvisoSinDinero';

interface Herramienta {
  a: string;
  icono: string;
  titulo: string;
  descripcion: string;
  roles: Rol[];
}

// Las mismas restricciones que aplica la API (R-02 del plan del ciclo 3)
const HERRAMIENTAS: Herramienta[] = [
  {
    a: '/consola/usuarios',
    icono: 'group',
    titulo: 'Usuarios y accesos',
    descripcion: 'Invitar, asignar ubicaciones, suspender',
    roles: ['ADMIN'],
  },
  {
    a: '/consola/bitacora',
    icono: 'history',
    titulo: 'Bitácora',
    descripcion: 'Quién hizo qué y cuándo',
    roles: ['ADMIN', 'AUDITOR'],
  },
  {
    a: '/consola/catalogo',
    icono: 'category',
    titulo: 'Catálogo maestro',
    descripcion: 'Categorías, canasta y emergencias',
    roles: ['ADMIN'],
  },
];

/** «Más» para todos: con sesión suma la cuenta y las herramientas del rol (R-01).
 *  Diseño: docs/03-diseno/stitch/mas-con-sesion. */
export function Mas() {
  const { usuario, salir } = useSesion();
  const herramientas = usuario ? HERRAMIENTAS.filter((h) => h.roles.includes(usuario.rol)) : [];

  return (
    <div className="flex flex-col gap-space-lg px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">Más</h1>

      {usuario && (
        <SeccionMenu id="tu-cuenta" titulo="Tu cuenta">
          <FilaMenu
            icono="person"
            titulo={usuario.nombre}
            descripcion={
              usuario.rol === 'ADMIN'
                ? 'Administrador · todas las ubicaciones'
                : nombreRol(usuario.rol)
            }
            distintivo={
              <span className="text-label-md font-bold">{iniciales(usuario.nombre)}</span>
            }
          />
        </SeccionMenu>
      )}

      {herramientas.length > 0 && (
        <SeccionMenu id="administracion" titulo="Administración">
          {herramientas.map((h) => (
            <FilaMenu
              key={h.a}
              a={h.a}
              icono={h.icono}
              titulo={h.titulo}
              descripcion={h.descripcion}
            />
          ))}
        </SeccionMenu>
      )}

      <SeccionMenu id="tu-donacion" titulo="Tu donación">
        <FilaMenu
          a="/proximamente"
          icono="qr_code_scanner"
          titulo="Preparar donación"
          descripcion="Escanea productos y genera tu folio"
        />
        <FilaMenu
          a="/proximamente"
          icono="pin"
          titulo="Rastrear donación por folio"
          descripcion="Consulta el recorrido con tu código"
        />
        <FilaMenu
          a="/proximamente"
          icono="badge"
          titulo="Mi cuenta de Donador"
          descripcion="Tus folios activos e historial"
        />
      </SeccionMenu>

      <SeccionMenu id="informacion" titulo="Información y transparencia">
        <FilaMenu
          a="/proximamente"
          icono="analytics"
          titulo="Transparencia"
          descripcion="Qué se ha movilizado y adónde"
        />
        <FilaMenu
          a="/proximamente"
          icono="do_not_disturb_on"
          titulo="¿Qué donar y qué no llevar?"
          descripcion="Lo que sirve y lo que satura los acopios"
        />
        <FilaMenu
          a="/proximamente"
          icono="history_edu"
          titulo="Emergencias anteriores"
          descripcion="Historial de las emergencias cerradas"
        />
      </SeccionMenu>

      {usuario && (
        <Boton variante="secundario" className="w-full" onClick={() => void salir()}>
          <Icono nombre="logout" className="text-[20px]" />
          Cerrar sesión
        </Boton>
      )}

      <AvisoSinDinero />
    </div>
  );
}
