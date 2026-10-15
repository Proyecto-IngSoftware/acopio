import type { Excedente, Remision } from '../../api/remisiones';

export const excedente = (datos: Partial<Excedente>): Excedente => ({
  categoriaId: 'c-arroz',
  categoria: 'Arroz',
  unidad: 'KILOGRAMO',
  saldo: 600,
  umbral: { minimo: 50, maximo: 160 },
  noRecibe: false,
  superavit: 440,
  comprometido: 0,
  vencido: 0,
  movible: 440,
  diasParaVencer: null,
  aviso: null,
  ...datos,
});

/** El excedente de Kennedy de las pruebas: arroz y agua se pueden mandar; aceite no. */
export const EXCEDENTE_KENNEDY: Excedente[] = [
  excedente({}),
  excedente({
    categoriaId: 'c-agua',
    categoria: 'Agua potable',
    unidad: 'LITRO',
    movible: 120,
    superavit: 120,
    diasParaVencer: 12,
  }),
  excedente({
    categoriaId: 'c-aceite',
    categoria: 'Aceite',
    unidad: 'LITRO',
    movible: 0,
    superavit: 0,
  }),
];

export const remision = (datos: Partial<Remision>): Remision => ({
  id: 'r1',
  codigo: 'R-2026-K4P7Q',
  estado: 'BORRADOR',
  acopio: { id: 'a-kennedy', nombre: 'Acopio Kennedy' },
  zona: { id: 'z-agustin', nombre: 'Barrio San Agustín' },
  responsable: null,
  qrToken: 'tok-qr',
  creadaEn: '2026-10-15T08:00:00.000Z',
  despachadaEn: null,
  recibidaEn: null,
  canceladaEn: null,
  motivoCancelacion: null,
  notaRecepcion: null,
  evidencias: 0,
  folios: [],
  lineas: [
    {
      categoriaId: 'c-arroz',
      categoria: 'Arroz',
      unidad: 'KILOGRAMO',
      cantidadPlaneada: 40,
      cantidadRecibida: null,
    },
  ],
  ...datos,
});
