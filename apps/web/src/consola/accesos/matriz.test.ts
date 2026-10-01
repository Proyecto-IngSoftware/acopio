import { describe, expect, it } from 'vitest';
import type { Ubicacion } from '../../api/red';
import type { Usuario } from '../../api/usuarios';
import { cruzarMatriz, filtrarMatriz, matrizCsv } from './matriz';

const ACOPIO_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACOPIO_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ZONA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const ubicaciones: Ubicacion[] = [
  { tipo: 'ZONA', id: ZONA, nombre: 'Vereda El Carmen', municipio: 'Mocoa', estado: 'SIN_ATENDER' },
  {
    tipo: 'ACOPIO',
    id: ACOPIO_B,
    nombre: 'Parroquia San José',
    municipio: 'Bogotá',
    estado: 'ACTIVO',
  },
  {
    tipo: 'ACOPIO',
    id: ACOPIO_A,
    nombre: 'Coliseo El Salitre',
    municipio: 'Bogotá',
    estado: 'ACTIVO',
  },
];

const asignacion = (tipo: 'ACOPIO' | 'ZONA', ubicacionId: string) => ({
  tipo,
  ubicacionId,
  asignadoPor: '99999999-9999-4999-8999-999999999999',
  asignadoEn: '2026-09-30T12:00:00.000Z',
});

const persona = (datos: Partial<Usuario>): Usuario => ({
  id: '11111111-1111-4111-8111-111111111111',
  username: 'persona',
  nombre: 'Persona',
  correo: null,
  sinCorreoReal: true,
  rol: 'OPERADOR',
  estado: 'ACTIVO',
  creadoEn: '2026-09-30T12:00:00.000Z',
  asignaciones: [],
  invitacionPendiente: null,
  restablecimientoPendiente: null,
  ...datos,
});

const usuarios: Usuario[] = [
  persona({
    id: '1',
    nombre: 'Daniela Méndez',
    username: 'dmendez',
    asignaciones: [asignacion('ACOPIO', ACOPIO_A), asignacion('ACOPIO', ACOPIO_B)],
  }),
  persona({
    id: '2',
    nombre: 'Jorge Rincón',
    username: 'jrincon',
    asignaciones: [asignacion('ACOPIO', ACOPIO_B)],
    restablecimientoPendiente: { venceEn: '2026-10-02T12:00:00.000Z' },
  }),
  persona({
    id: '3',
    nombre: 'Luisa Cárdenas',
    username: null,
    rol: 'RECEPTOR',
    estado: 'INVITADO',
    asignaciones: [asignacion('ZONA', ZONA)],
  }),
  persona({ id: '4', nombre: 'Ana Admin', rol: 'ADMIN' }),
  persona({ id: '5', nombre: 'Beto Admin', rol: 'ADMIN' }),
  persona({ id: '6', nombre: 'Carla Donadora', rol: 'DONADOR' }),
  persona({ id: '7', nombre: 'Andrés Pinto', rol: 'AUDITOR' }),
] as Usuario[];

describe('cruzarMatriz', () => {
  const m = cruzarMatriz(usuarios, ubicaciones);

  it('ordena las columnas: acopios primero y luego por nombre', () => {
    expect(m.columnas.map((c) => c.nombre)).toEqual([
      'Coliseo El Salitre',
      'Parroquia San José',
      'Vereda El Carmen',
    ]);
  });

  it('deja fuera a Donadores y Administradores, y cuenta a los Administradores', () => {
    expect(m.filas.map((f) => f.usuario.nombre)).toEqual([
      'Andrés Pinto',
      'Daniela Méndez',
      'Jorge Rincón',
      'Luisa Cárdenas',
    ]);
    expect(m.administradores).toBe(2);
  });

  it('cruza cada asignación con el nombre de su ubicación', () => {
    const daniela = m.filas.find((f) => f.usuario.id === '1')!;
    expect(daniela.ubicaciones.map((u) => u.nombre)).toEqual([
      'Coliseo El Salitre',
      'Parroquia San José',
    ]);
    expect(daniela.puede(ACOPIO_B)).toBe(true);
    expect(daniela.puede(ZONA)).toBe(false);
  });

  it('marca el restablecimiento pendiente', () => {
    expect(m.filas.find((f) => f.usuario.id === '2')!.restablecimientoPendiente).toBe(true);
    expect(m.filas.find((f) => f.usuario.id === '1')!.restablecimientoPendiente).toBe(false);
  });

  it('una asignación a una ubicación que no está en la lista sale como «Ubicación sin nombre»', () => {
    const otra = cruzarMatriz(
      [persona({ asignaciones: [asignacion('ACOPIO', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')] })],
      ubicaciones,
    );
    expect(otra.filas[0]!.ubicaciones[0]!.nombre).toBe('Ubicación sin nombre');
  });
});

describe('filtrarMatriz', () => {
  const m = cruzarMatriz(usuarios, ubicaciones);
  const nombres = (f: { rol?: Usuario['rol']; estado?: Usuario['estado']; ubicacionId?: string }) =>
    filtrarMatriz(m.filas, f).map((x) => x.usuario.nombre);

  it('por rol', () => {
    expect(nombres({ rol: 'RECEPTOR' })).toEqual(['Luisa Cárdenas']);
  });

  it('por estado', () => {
    expect(nombres({ estado: 'INVITADO' })).toEqual(['Luisa Cárdenas']);
  });

  it('por ubicación: quién puede tocarla', () => {
    expect(nombres({ ubicacionId: ACOPIO_B })).toEqual(['Daniela Méndez', 'Jorge Rincón']);
  });

  it('combina los filtros', () => {
    expect(nombres({ ubicacionId: ACOPIO_B, rol: 'RECEPTOR' })).toEqual([]);
  });
});

describe('matrizCsv', () => {
  const m = cruzarMatriz(usuarios, ubicaciones);
  const csv = matrizCsv(m.filas);
  const lineas = csv
    .replace(/^\uFEFF/, '')
    .trimEnd()
    .split('\r\n');

  it('empieza con BOM y usa punto y coma', () => {
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lineas[0]).toBe(
      'Nombre;Usuario;Rol;Estado;Restablecimiento pendiente;Tipo;Ubicación;Municipio',
    );
  });

  it('una fila por persona y ubicación; sin asignaciones, la ubicación va vacía', () => {
    expect(lineas.slice(1)).toEqual([
      'Andrés Pinto;persona;Auditor;Activo;No;;;',
      'Daniela Méndez;dmendez;Operador;Activo;No;Acopio;Coliseo El Salitre;Bogotá',
      'Daniela Méndez;dmendez;Operador;Activo;No;Acopio;Parroquia San José;Bogotá',
      'Jorge Rincón;jrincon;Operador;Activo;Sí;Acopio;Parroquia San José;Bogotá',
      'Luisa Cárdenas;;Receptor;Invitado;No;Zona;Vereda El Carmen;Mocoa',
    ]);
  });

  it('pone entre comillas los campos con punto y coma o comillas', () => {
    const raro = cruzarMatriz([persona({ nombre: 'Ana "la jefa"; Ruiz' })], []);
    expect(matrizCsv(raro.filas)).toContain('"Ana ""la jefa""; Ruiz"');
  });

  it('neutraliza los campos que Excel leería como fórmula', () => {
    const raro = cruzarMatriz([persona({ nombre: '=HYPERLINK("x")' })], []);
    expect(matrizCsv(raro.filas)).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
