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
  tipo: 'OPERADO',
  fuente: null,
  ...datos,
});

/** Un punto de RedAcopio (pieza E): sin entidad, con lo que trae su fuente. */
export const referenciadoDePrueba = (datos: Partial<AcopioPublico> = {}): AcopioPublico =>
  acopioDePrueba({
    id: '22222222-2222-4222-8222-222222222222',
    nombre: 'Sugoi Taller Creativo',
    entidad: null,
    direccion: 'Calle 128A No. 45A-74 piso 3',
    abiertoAhora: false,
    tipo: 'REFERENCIADO',
    fuente: {
      nombre: 'RedAcopio Bogotá',
      nombreCorto: 'RedAcopio',
      url: 'https://redacopiobogota.com/',
      actualizadoEn: new Date(Date.now() - 3 * 3_600_000).toISOString(),
      estadoOriginal: 'abierto',
      necesidades: [
        { nivel: 'urgente', texto: 'Camión' },
        { nivel: 'normal', texto: 'Agua' },
      ],
      horario: '10:00 am - 7:00 pm',
      contacto: { phone: '3024821367', notes: 'Timbre de acceso en la puerta principal' },
    },
    ...datos,
  });
