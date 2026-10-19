/** Fuentes externas de acopios (pieza E, RF-RED-011): cómo se nombran y se enlazan. */
const FUENTES: Record<string, { etiqueta: string; corto: string; url: string; municipio: string }> =
  {
    redacopio: {
      etiqueta: 'RedAcopio Bogotá',
      corto: 'RedAcopio',
      url: 'https://redacopiobogota.com/',
      municipio: 'Bogotá',
    },
  };

/** El nombre visible (completo y corto, para «según RedAcopio»), la página y el municipio de una fuente, por su clave en `acopio.fuente`. */
export function datosFuente(clave: string): {
  etiqueta: string;
  corto: string;
  url: string | null;
  municipio: string | null;
} {
  return FUENTES[clave] ?? { etiqueta: clave, corto: clave, url: null, municipio: null };
}
