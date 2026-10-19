import { leerCsv } from './leer-csv';

const csv = (texto: string) => Buffer.from(texto, 'utf8');

describe('leerCsv', () => {
  it('lee filas con coma como separador y recorta espacios', () => {
    expect(leerCsv(csv('nombre,url\n Uno , https://uno.test \nDos,https://dos.test\n'))).toEqual([
      { nombre: 'Uno', url: 'https://uno.test' },
      { nombre: 'Dos', url: 'https://dos.test' },
    ]);
  });

  it('detecta el punto y coma de una hoja de cálculo en español', () => {
    expect(leerCsv(csv('nombre;url\nUno;https://uno.test\n'))).toEqual([
      { nombre: 'Uno', url: 'https://uno.test' },
    ]);
  });

  it('quita la marca BOM que deja Excel al guardar en UTF-8', () => {
    expect(leerCsv(csv('﻿nombre,url\nUno,https://uno.test\n'))[0]).toHaveProperty('nombre', 'Uno');
  });

  it('respeta las celdas entre comillas con comas adentro', () => {
    expect(leerCsv(csv('nombre,descripcion\nUno,"Ropa, cobijas y agua"\n'))[0]).toEqual({
      nombre: 'Uno',
      descripcion: 'Ropa, cobijas y agua',
    });
  });

  it('salta las filas vacías', () => {
    expect(leerCsv(csv('nombre\nUno\n\n\nDos\n'))).toHaveLength(2);
  });

  it('rechaza más de 5 000 filas', () => {
    const filas = Array.from({ length: 5_001 }, (_, i) => `fila ${i}`).join('\n');
    expect(() => leerCsv(csv(`nombre\n${filas}\n`))).toThrow(
      expect.objectContaining({ codigo: 'CSV_DEMASIADO_GRANDE', estado: 413 }),
    );
  });

  it('rechaza un archivo de más de 2 MB', () => {
    expect(() => leerCsv(Buffer.alloc(2 * 1024 * 1024 + 1, 'a'))).toThrow(
      expect.objectContaining({ codigo: 'CSV_DEMASIADO_GRANDE' }),
    );
  });

  it('un archivo sin cabecera es un CSV inválido', () => {
    expect(() => leerCsv(csv(''))).toThrow(expect.objectContaining({ codigo: 'CSV_INVALIDO' }));
  });
});
