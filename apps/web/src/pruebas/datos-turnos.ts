import type { Inscrito, JornadaGestion, JornadaPublica } from '../api/turnos';

/** Una jornada de acopio abierta, con cupos, el miércoles 21 de octubre de 8 a 12 en Bogotá;
 *  `extra` cambia lo que la prueba necesita. */
export const jornadaDe = (extra: Partial<JornadaPublica> = {}): JornadaPublica => ({
  id: 'j1',
  titulo: 'Armar mercados',
  descripcion: 'Empacar arroz, granos y aceite para 200 familias de Mocoa.',
  queLlevar: 'Guantes, agua y ropa cómoda',
  inicio: '2026-10-21T13:00:00.000Z',
  fin: '2026-10-21T17:00:00.000Z',
  cierreReservas: '2026-10-21T01:00:00.000Z',
  cupoMaximo: 10,
  ocupados: 3,
  ajuste: 0,
  ajusteActualizadoEn: null,
  libres: 7,
  requisitos: { ropaCerrada: true, carga: false },
  perfilRequerido: null,
  estado: 'ABIERTA',
  motivoCancelacion: null,
  aceptaReservas: true,
  motivoSinReserva: null,
  lugar: {
    tipo: 'ACOPIO',
    id: 'a1',
    nombre: 'Acopio Chapinero',
    direccion: 'Calle 60 # 9-23',
    municipio: 'Bogotá',
    lat: 4.6486,
    lng: -74.0628,
  },
  ...extra,
});

export const gestionDe = (extra: Partial<JornadaGestion> = {}): JornadaGestion => ({
  ...jornadaDe(),
  serieId: null,
  creadaPor: 'u1',
  creadoEn: '2026-10-17T15:00:00.000Z',
  ...extra,
});

export const inscritoDe = (extra: Partial<Inscrito> = {}): Inscrito => ({
  id: 'r1',
  codigo: 'K7QM4XPA',
  nombre: 'María Fernanda Ruiz',
  correo: 'mafe.ruiz@correo.co',
  telefono: '3105550101',
  perfilDeclarado: false,
  estado: 'ACTIVA',
  creadaEn: '2026-10-17T16:00:00.000Z',
  ...extra,
});
