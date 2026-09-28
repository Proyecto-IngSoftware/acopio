/**
 * Contraseña (especificación general §6, RF-IDE-003): 12 caracteres mínimo, sin
 * exigir símbolos, contrastada con contraseñas comunes. Las reglas barrocas
 * producen «Acopio2026!» en todos los usuarios.
 */
export const LONGITUD_MINIMA = 12;

/** Base de palabras frecuentes; se rechaza también con números o símbolos al final. */
const COMUNES = [
  '123456789012',
  'contraseña',
  'contrasena',
  'password',
  'qwertyuiop',
  'asdfghjkl',
  'abcdefghijkl',
  'iloveyou',
  'teamo',
  'colombia',
  'bogota',
  'medellin',
  'cali',
  'barranquilla',
  'acopio',
  'donacion',
  'donaciones',
  'emergencia',
  'ayuda',
  'voluntario',
  'administrador',
  'admin',
  'usuario',
  'bienvenido',
  'bienvenida',
  'principal',
  'millonarios',
  'nacional',
  'america',
  'junior',
  'futbol',
  'dios',
  'jesus',
  'amor',
  'familia',
  'mama',
  'papa',
  'princesa',
  'estrella',
  'mariposa',
  'superman',
  'batman',
  'dragon',
  'monkey',
  'football',
  'baseball',
  'welcome',
  'letmein',
  'sunshine',
  'master',
  'shadow',
  'qazwsxedc',
  '1q2w3e4r5t6y',
];

const RAIZ_COMUN = new Set(COMUNES.map(normalizar));

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Devuelve el motivo del rechazo, o null si la contraseña sirve. */
export function motivoRechazo(contrasena: string, contexto: string[] = []): string | null {
  if ([...contrasena].length < LONGITUD_MINIMA) {
    return `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres`;
  }
  const n = normalizar(contrasena);
  // Una palabra común con números o símbolos pegados sigue siendo común
  const raiz = n.replace(/[^a-z]+$/u, '').replace(/^[^a-z]+/u, '');
  if (RAIZ_COMUN.has(n) || RAIZ_COMUN.has(raiz)) {
    return 'Esa contraseña es demasiado común; elige otra';
  }
  if (/^(.)\1+$/u.test(n) || /^(0123456789|1234567890|9876543210)+/u.test(n)) {
    return 'Esa contraseña es demasiado fácil de adivinar';
  }
  for (const dato of contexto.filter((d) => d.length >= 4).map(normalizar)) {
    if (n.includes(dato)) return 'La contraseña no puede contener tu usuario ni tu nombre';
  }
  return null;
}
