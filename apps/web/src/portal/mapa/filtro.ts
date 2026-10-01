import type { Punto } from '../../api/red';

export const leerPunto = (texto: string | null): Punto | null => {
  const [lat, lng] = (texto ?? '').split(',').map(Number);
  return texto && Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat!, lng: lng! } : null;
};

/** Los filtros de P5 que van a la API, leídos de la URL. */
export const filtroDelMapa = (parametros: URLSearchParams) => ({
  abiertoAhora: parametros.get('abierto') === '1',
  cerca: leerPunto(parametros.get('cerca')),
});
