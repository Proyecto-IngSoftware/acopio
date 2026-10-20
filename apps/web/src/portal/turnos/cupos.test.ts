import { jornadaDe } from '../../pruebas/datos-turnos';
import { estadoCupos, porLugar, textoPunto } from './cupos';

it('con menos de la mitad del cupo ocupado faltan personas', () => {
  expect(estadoCupos(jornadaDe({ cupoMaximo: 10, ocupados: 3, ajuste: 0, libres: 7 }))).toEqual({
    estado: 'faltan',
    texto: 'FALTAN 7 PERSONAS',
  });
});

it('con la mitad o más ocupada quedan cupos', () => {
  // 3 ≥ 5 / 2
  expect(estadoCupos(jornadaDe({ cupoMaximo: 5, ocupados: 3, ajuste: 0, libres: 2 }))).toEqual({
    estado: 'cupos',
    texto: 'QUEDAN 2 CUPOS',
  });
});

it('el ajuste a mano cuenta como ocupado', () => {
  expect(estadoCupos(jornadaDe({ cupoMaximo: 10, ocupados: 3, ajuste: 2, libres: 5 }))).toEqual({
    estado: 'cupos',
    texto: 'QUEDAN 5 CUPOS',
  });
});

it('un cupo libre va en singular y sin cupos está llena', () => {
  expect(estadoCupos(jornadaDe({ cupoMaximo: 4, ocupados: 3, ajuste: 0, libres: 1 }))).toEqual({
    estado: 'cupos',
    texto: 'QUEDA 1 CUPO',
  });
  expect(
    estadoCupos(
      jornadaDe({
        cupoMaximo: 4,
        ocupados: 4,
        libres: 0,
        aceptaReservas: false,
        motivoSinReserva: 'LLENA',
      }),
    ),
  ).toEqual({ estado: 'llena', texto: 'LLENA' });
});

it('una jornada fuera de plazo, cerrada o cancelada no tiene estado', () => {
  expect(estadoCupos(jornadaDe({ aceptaReservas: false, motivoSinReserva: 'PLAZO' }))).toBeNull();
  expect(
    estadoCupos(jornadaDe({ aceptaReservas: false, motivoSinReserva: 'CANCELADA' })),
  ).toBeNull();
});

it('porLugar agrupa por lugar con coordenadas, la más urgente primero', () => {
  const lugar = jornadaDe().lugar;
  const llena = jornadaDe({
    id: 'llena',
    ocupados: 10,
    libres: 0,
    aceptaReservas: false,
    motivoSinReserva: 'LLENA',
  });
  const faltan = jornadaDe({ id: 'faltan' });
  const sinCoordenadas = jornadaDe({
    id: 'sin',
    lugar: { ...lugar, id: 'a2', lat: null, lng: null },
  });
  const grupos = porLugar([llena, faltan, sinCoordenadas]);
  expect(grupos).toHaveLength(1);
  expect(grupos[0]!.lugar.id).toBe('a1');
  expect(grupos[0]!.jornadas.map((j) => j.id)).toEqual(['faltan', 'llena']);
});

it('porLugar deja fuera las jornadas sin estado de cupos', () => {
  const cerrada = jornadaDe({ id: 'c', aceptaReservas: false, motivoSinReserva: 'PLAZO' });
  expect(porLugar([cerrada])).toEqual([]);
});

it('el punto dice la jornada más urgente y cuántas más hay en el lugar', () => {
  const llena = jornadaDe({ id: 'l', libres: 0, aceptaReservas: false, motivoSinReserva: 'LLENA' });
  const [grupo] = porLugar([llena, jornadaDe()]);
  expect(textoPunto(grupo!)).toEqual({ estado: 'faltan', texto: 'FALTAN 7 PERSONAS +1' });
  expect(textoPunto(porLugar([llena])[0]!)).toEqual({ estado: 'llena', texto: 'LLENA' });
});
