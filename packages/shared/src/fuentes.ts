/** Fuentes externas de acopios (pieza E, RF-RED-011): cómo se nombran y se enlazan. */
const FUENTES: Record<string, { etiqueta: string; url: string; municipio: string }> = {
  redacopio: {
    etiqueta: 'RedAcopio Bogotá',
    url: 'https://redacopiobogota.com/',
    municipio: 'Bogotá',
  },
};

/** El nombre visible, la página y el municipio de una fuente, por su clave en `acopio.fuente`. */
export function datosFuente(clave: string): {
  etiqueta: string;
  url: string | null;
  municipio: string | null;
} {
  return FUENTES[clave] ?? { etiqueta: clave, url: null, municipio: null };
}
