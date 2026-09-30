import type { AcopioPublico } from '../api/red';

/** Un acopio público de prueba; se sobrescribe lo que cada prueba necesite. */
export const acopioDePrueba = (datos: Partial<AcopioPublico> = {}): AcopioPublico => ({
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Acopio Chapinero',
  entidad: { id: '44444444-4444-4444-8444-444444444444', nombre: 'Fundación Manos Unidas' },
  direccion: 'Carrera 13 # 60-20',
  municipio: 'Bogotá',
  lat: 4.6486,
  lng: -74.0628,
  telefono: null,
  indicacionesAcceso: null,
  horario: { dom: [], lun: [], mar: [], mie: [], jue: [], vie: [], sab: [] },
  estado: 'ACTIVO',
  abiertoAhora: true,
  actualizadoEn: '2026-09-30T12:00:00.000Z',
  ...datos,
});
