type Punto = { lat: number; lng: number };
type Par = [number, number];

/** Lo que define el encuadre del mapa, como texto: dos renders con los mismos puntos dan la
 *  misma clave aunque los objetos sean nuevos. Así el mapa no vuelve a encuadrarse al tocar
 *  algo o al refrescar la consulta, y respeta lo que la persona movió o acercó. */
export function claveEncuadre(
  acopios: Punto[],
  zonas: { centro: Punto }[],
  centro: Punto | null,
): string {
  return JSON.stringify({
    centro: centro ? [centro.lat, centro.lng] : null,
    puntos: [
      ...acopios.map((a): Par => [a.lat, a.lng]),
      ...zonas.map((z): Par => [z.centro.lat, z.centro.lng]),
    ],
  });
}

export function leerClave(clave: string): { centro: Par | null; puntos: Par[] } {
  return JSON.parse(clave) as { centro: Par | null; puntos: Par[] };
}
