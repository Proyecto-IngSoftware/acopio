import type { Rol } from '../../generado/prisma/enums';

export interface UsuarioAutenticado {
  id: string;
  username: string | null;
  nombre: string;
  rol: Rol;
}
