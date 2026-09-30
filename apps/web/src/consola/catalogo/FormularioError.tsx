import { AlertaError } from '../../acceso/AlertaError';

/** Error de un formulario de la consola, con el mensaje de la API. */
export function FormularioError({ mensaje }: { mensaje: string | null | undefined }) {
  return mensaje ? <AlertaError mensaje={mensaje} /> : null;
}
