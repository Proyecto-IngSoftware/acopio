import type { CausaGestion, CausaPublica } from '../api/causas';

/** Una causa activa de una entidad verificada; `extra` cambia lo que la prueba necesita. */
export const causaDePrueba = (extra: Partial<CausaPublica> = {}): CausaPublica => ({
  id: 'c1',
  categoria: 'PERSONAS',
  titulo: 'Mercados para familias damnificadas en Mocoa',
  descripcion: 'Alimentos no perecederos y elementos de aseo para 300 familias.',
  pasos: ['Entra al sitio oficial de la fundación.', 'Elige «Donar a Mocoa».'],
  urlOficial: 'https://www.fundacion.org/donar',
  dominio: 'fundacion.org',
  tieneImagen: false,
  actualizadoEn: '2026-10-17T15:00:00.000Z',
  publicadaEn: '2026-10-17T15:00:00.000Z',
  cierraEl: '2026-12-01',
  cerroEl: null,
  motivo: null,
  entidad: {
    id: 'e1',
    nombre: 'Fundación Tierra Viva',
    tieneLogo: false,
    verificadaEn: '2026-08-12T15:00:00.000Z',
  },
  ...extra,
});

export const causaGestionDePrueba = (extra: Partial<CausaGestion> = {}): CausaGestion => ({
  ...causaDePrueba(),
  urlOficial: 'https://www.fundacion.org/donar',
  estado: 'ACTIVA',
  porCerrar: false,
  dominioDistinto: false,
  creadaPor: 'u1',
  ...extra,
});
