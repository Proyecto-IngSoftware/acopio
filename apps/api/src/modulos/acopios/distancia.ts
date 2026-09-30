export interface Punto {
  lat: number;
  lng: number;
}

/** Distancia en km por la fórmula del haversine. Basta para ordenar por cercanía. */
export function distanciaKm(a: Punto, b: Punto): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
