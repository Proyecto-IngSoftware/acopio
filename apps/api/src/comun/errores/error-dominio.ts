/**
 * Regla de negocio incumplida. El filtro de errores la convierte en una respuesta
 * con su código; el mensaje se muestra tal cual en la interfaz.
 */
export class ErrorDominio extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly estado = 422,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}
