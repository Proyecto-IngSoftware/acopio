import type { Rol } from './cliente-auth';

const NOMBRES: Record<Rol, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  AUDITOR: 'Auditor',
  RECEPTOR: 'Receptor',
  DONADOR: 'Donador',
};

/** Nombre del rol como lo lee una persona (glosario). */
export const nombreRol = (rol: Rol): string => NOMBRES[rol] ?? rol;

/** «Daniela Méndez» → «DM». */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((p) => p[0]!.toLocaleUpperCase('es-CO'))
    .join('');
}
