import { ICONO_GRUPO, type Grupo } from '../api/catalogo';
import { Icono } from './Icono';

/** El ícono del grupo de una categoría, en el recuadro menta del menú Más. Decorativo. */
export function IconoGrupo({ grupo, tamano = 'md' }: { grupo: string; tamano?: 'sm' | 'md' }) {
  const icono = ICONO_GRUPO[grupo as Grupo] ?? 'inventory_2';
  const caja = tamano === 'sm' ? 'h-9 w-9 rounded-lg' : 'h-11 w-11 rounded-xl';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-primary-fixed text-primary-container ${caja}`}
    >
      <Icono nombre={icono} className={tamano === 'sm' ? 'text-[20px]' : 'text-[22px]'} />
    </span>
  );
}
