/** Una ubicación asignable: un acopio o una zona. */
export interface RefUbicacion {
  tipo: 'ACOPIO' | 'ZONA';
  ubicacionId: string;
}

/**
 * Lo que `identidad` necesita saber de las ubicaciones sin importar `acopios` (B-05).
 * Lo implementa `acopios`; el token vive aquí para que ninguno importe al otro.
 */
export interface VerificadorUbicaciones {
  /** El nombre de cada una, en el mismo orden; null si no existe. */
  nombres(refs: RefUbicacion[]): Promise<(string | null)[]>;
}

export const VERIFICADOR_UBICACIONES = Symbol('VERIFICADOR_UBICACIONES');
