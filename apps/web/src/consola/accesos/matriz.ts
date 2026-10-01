import type { Ubicacion } from '../../api/red';
import type { EstadoUsuario, Usuario } from '../../api/usuarios';
import { nombreRol } from '../../sesion/roles';

export interface FilaMatriz {
  usuario: Usuario;
  /** Sus ubicaciones, con nombre, en el mismo orden que las columnas. */
  ubicaciones: Ubicacion[];
  restablecimientoPendiente: boolean;
  puede: (ubicacionId: string) => boolean;
}

export interface Matriz {
  columnas: Ubicacion[];
  filas: FilaMatriz[];
  /** Los Administradores no van en filas: pueden tocar todas las ubicaciones (J-07). */
  administradores: number;
}

export interface FiltroMatriz {
  rol?: Usuario['rol'];
  estado?: EstadoUsuario;
  ubicacionId?: string;
}

const porNombre = (a: { nombre: string }, b: { nombre: string }) =>
  a.nombre.localeCompare(b.nombre, 'es-CO');

const ordenUbicacion = (a: Ubicacion, b: Ubicacion) =>
  a.tipo === b.tipo ? porNombre(a, b) : a.tipo === 'ACOPIO' ? -1 : 1;

/** RF-IDE-011: cruza las personas con las ubicaciones que pueden tocar (B-07). */
export function cruzarMatriz(usuarios: Usuario[], ubicaciones: Ubicacion[]): Matriz {
  const columnas = [...ubicaciones].sort(ordenUbicacion);
  const porId = new Map(columnas.map((u) => [u.id, u]));
  const filas = usuarios
    .filter((u) => u.rol !== 'ADMIN' && u.rol !== 'DONADOR')
    .sort(porNombre)
    .map((usuario): FilaMatriz => {
      const ids = new Set(usuario.asignaciones.map((a) => a.ubicacionId));
      const suyas = usuario.asignaciones
        .map(
          (a): Ubicacion =>
            porId.get(a.ubicacionId) ?? {
              tipo: a.tipo,
              id: a.ubicacionId,
              nombre: 'Ubicación sin nombre',
              municipio: '',
              estado: '',
            },
        )
        .sort(ordenUbicacion);
      return {
        usuario,
        ubicaciones: suyas,
        restablecimientoPendiente: usuario.restablecimientoPendiente != null,
        puede: (id) => ids.has(id),
      };
    });
  return {
    columnas,
    filas,
    administradores: usuarios.filter((u) => u.rol === 'ADMIN').length,
  };
}

export function filtrarMatriz(filas: FilaMatriz[], filtro: FiltroMatriz): FilaMatriz[] {
  return filas.filter(
    (f) =>
      (!filtro.rol || f.usuario.rol === filtro.rol) &&
      (!filtro.estado || f.usuario.estado === filtro.estado) &&
      (!filtro.ubicacionId || f.puede(filtro.ubicacionId)),
  );
}

const ESTADO_CSV: Record<EstadoUsuario, string> = {
  ACTIVO: 'Activo',
  INVITADO: 'Invitado',
  SUSPENDIDO: 'Suspendido',
};

function campo(valor: string): string {
  // Excel ejecuta como fórmula lo que empieza con = + - @
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** CSV para Excel en Colombia: BOM, `;` y CRLF (J-08). Una fila por persona y ubicación. */
export function matrizCsv(filas: FilaMatriz[]): string {
  const encabezado = [
    'Nombre',
    'Usuario',
    'Rol',
    'Estado',
    'Restablecimiento pendiente',
    'Tipo',
    'Ubicación',
    'Municipio',
  ];
  const lineas = [encabezado];
  for (const f of filas) {
    const persona = [
      f.usuario.nombre,
      f.usuario.username ?? '',
      nombreRol(f.usuario.rol),
      ESTADO_CSV[f.usuario.estado],
      f.restablecimientoPendiente ? 'Sí' : 'No',
    ];
    if (f.ubicaciones.length === 0) lineas.push([...persona, '', '', '']);
    for (const u of f.ubicaciones) {
      lineas.push([...persona, u.tipo === 'ACOPIO' ? 'Acopio' : 'Zona', u.nombre, u.municipio]);
    }
  }
  return '\uFEFF' + lineas.map((l) => l.map(campo).join(';')).join('\r\n') + '\r\n';
}
