import type { Remision } from '../../api/remisiones';
import { remision } from '../remisiones/datos-prueba';

export const ZONA = 'd0000000-0000-4000-8000-000000000031';

/** Las dos remisiones de la demo: una hacia la zona y un despacho general. */
export const HACIA_ZONA: Remision = remision({
  id: 'r-a2',
  codigo: 'R-2026-DEMA2',
  estado: 'EN_TRANSITO',
  acopio: { id: 'a-kennedy', nombre: 'Acopio Kennedy (prueba)' },
  zona: { id: ZONA, nombre: 'Barrio San Agustín (prueba)' },
  responsable: 'Carlos',
  qrToken: 'tok-a2',
  despachadaEn: '2026-10-16T08:00:00.000Z',
  folios: ['ACO-2026-DEMB2'],
  lineas: [
    {
      categoriaId: 'c-agua',
      categoria: 'Agua potable',
      unidad: 'LITRO',
      cantidadPlaneada: 400,
      cantidadRecibida: null,
    },
  ],
});

export const GENERAL: Remision = remision({
  id: 'r-a3',
  codigo: 'R-2026-DEMA3',
  estado: 'EN_TRANSITO',
  acopio: { id: 'a-kennedy', nombre: 'Acopio Kennedy (prueba)' },
  zona: null,
  responsable: 'Carlos',
  qrToken: 'tok-a3',
  despachadaEn: '2026-10-16T08:00:00.000Z',
  lineas: [
    {
      categoriaId: 'c-arroz',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      cantidadPlaneada: 60,
      cantidadRecibida: null,
    },
  ],
});

export const RECEPTORA = {
  id: 'u-r',
  username: 'receptor1',
  nombre: 'Alejandra',
  rol: 'RECEPTOR' as const,
};
