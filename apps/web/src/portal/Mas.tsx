import { Boton } from '../componentes/Boton';
import { Icono } from '../componentes/Icono';
import { FilaMenu, SeccionMenu } from '../componentes/Menu';
import type { Rol } from '../sesion/cliente-auth';
import { iniciales, nombreRol } from '../sesion/roles';
import { useSesion } from '../sesion/Sesion';
import { useSalida } from '../sesion/useSalida';
import { useUbicacionActiva } from '../sesion/ubicacion-activa';
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
    a: '/consola/accesos',
    icono: 'grid_view',
    titulo: 'Matriz de acceso',
    descripcion: 'Quién puede tocar cada ubicación',
    roles: ['AUDITOR'],
  },
  {
    a: '/consola/catalogo',
    icono: 'category',
    titulo: 'Catálogo maestro',
    descripcion: 'Categorías, canasta y emergencias',
    roles: ['ADMIN'],
  },
  {
    a: '/consola/acopios',
    icono: 'inventory_2',
    titulo: 'Acopios',
    descripcion: 'Crear, editar, pausar y cerrar',
    roles: ['ADMIN'],
  },
  {
    a: '/consola/entidades',
    icono: 'verified_user',
    titulo: 'Entidades',
    descripcion: 'Quién responde por cada acopio',
    roles: ['ADMIN'],
  },
  {
    a: '/consola/zonas',
    icono: 'map',
    titulo: 'Zonas afectadas',
    descripcion: 'Comunidades de cada emergencia',
    roles: ['ADMIN'],
  },
];

/** Las herramientas del acopio donde opera la persona, según su rol (J-04, E-07). */
function MiAcopio() {
  const { usuario } = useSesion();
  const { activa } = useUbicacionActiva();
  if (activa?.tipo !== 'ACOPIO' || !usuario) return null;
  const operador = usuario.rol === 'OPERADOR';
  const base = `/consola/acopios/${activa.id}`;
  return (
    <SeccionMenu id="mi-acopio" titulo="Mi acopio">
      {operador && (
        <FilaMenu
          a={`${base}/entrada`}
          icono="add_circle"
          titulo="Entrada rápida"
          descripcion="Registrar lo que llega"
        />
      )}
      {operador && (
        <FilaMenu
          a={`${base}/salida`}
          icono="output"
          titulo="Salida"
          descripcion="Registrar lo que sale y por qué"
        />
      )}
      {operador && (
        <FilaMenu
          a={`${base}/conteo`}
          icono="fact_check"
          titulo="Conteo físico"
          descripcion="Corregir el saldo después de contar"
        />
      )}
      {(operador || usuario.rol === 'AUDITOR') && (
        <FilaMenu
          a={`${base}/inventario`}
          icono="inventory"
          titulo="Inventario"
          descripcion="Saldo y estado de cada categoría"
        />
      )}
      {operador && (
        <FilaMenu
          a={`${base}/operacion`}
          icono="inventory_2"
          titulo={activa.nombre}
          descripcion="Estado, horario y lo que no recibe"
        />
      )}
    </SeccionMenu>
  );
}

function descripcionCuenta(rol: Rol, asignadas: number): string {
  if (rol === 'ADMIN') return 'Administrador · todas las ubicaciones';
  if (asignadas < 2) return nombreRol(rol);
  return `${nombreRol(rol)} · ${asignadas} ubicaciones`;
}

/** «Más» para todos: con sesión suma la cuenta y las herramientas del rol (R-01).
 *  Diseño: docs/03-diseno/stitch/mas-con-sesion. */
export function Mas() {
  const { usuario } = useSesion();
  const { pedirSalida, hoja } = useSalida();
  const { ubicaciones } = useUbicacionActiva();
  const herramientas = usuario ? HERRAMIENTAS.filter((h) => h.roles.includes(usuario.rol)) : [];

  return (
    <div className="flex flex-col gap-space-lg px-margin py-space-lg">
      <h1 className="text-headline-lg-mobile tracking-tight text-on-surface">Más</h1>

      {usuario && (
        <SeccionMenu id="tu-cuenta" titulo="Tu cuenta">
          <FilaMenu
            icono="person"
            titulo={usuario.nombre}
            descripcion={descripcionCuenta(usuario.rol, ubicaciones.length)}
            distintivo={
              <span className="text-label-md font-bold">{iniciales(usuario.nombre)}</span>
            }
          />
        </SeccionMenu>
      )}

      <MiAcopio />

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
        <Boton variante="secundario" className="w-full" onClick={() => void pedirSalida()}>
          <Icono nombre="logout" className="text-[20px]" />
          Cerrar sesión
        </Boton>
      )}

      <AvisoSinDinero />
      {hoja}
    </div>
  );
}
