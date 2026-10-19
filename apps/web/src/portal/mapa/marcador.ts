import type { AcopioPublico } from '../../api/red';

/** Lo que anuncia el lector de pantalla al llegar a un marcador del mapa. */
export const etiquetaMarcador = (a: AcopioPublico) =>
  a.fuente ? `Punto de ${a.fuente.nombre}: ${a.nombre}` : a.nombre;

const anillo = (elegido: boolean) => (elegido ? 'ring-4 ring-primary' : '');

/** El círculo de cada punto. Los tres se distinguen por forma o ícono, no solo por color
 *  (RNF-11): el acopio lleno, el pausado en gris y el de RedAcopio blanco con borde. */
export function htmlMarcador(a: AcopioPublico, elegido: boolean) {
  const icono = (nombre: string) =>
    `<span aria-hidden="true" class="material-symbols-outlined text-[18px]">${nombre}</span>`;
  if (a.tipo === 'REFERENCIADO')
    return `<div class="flex size-9 items-center justify-center rounded-full border-2 border-primary-container bg-surface-container-lowest text-primary-container shadow-md ${anillo(elegido)}">${icono('link')}</div>`;
  if (a.estado === 'PAUSADO')
    return `<div class="flex size-9 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-outline text-on-primary shadow-md ${anillo(elegido)}">${icono('pause_circle')}</div>`;
  return `<div class="flex size-9 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-container text-on-primary shadow-md ${anillo(elegido)}">${icono('inventory_2')}</div>`;
}
