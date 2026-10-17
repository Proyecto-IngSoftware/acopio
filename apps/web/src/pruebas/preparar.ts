import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup, configure } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, vi } from 'vitest';

// Un findBy espera hasta 3 s y no 1: la primera carga de una pantalla diferida (lazy) puede
// tardar más con la máquina ocupada, y daba rojos que no dependían del cambio (P-059)
configure({ asyncUtilTimeout: 3000 });

// Cada prueba arranca con un IndexedDB vacío: la copia local no pasa de una a otra
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

// Una petición sin simular falla como sin red: así ninguna prueba depende de que la API
// del Compose esté arriba, ni le cierra la sesión a la prueba siguiente con un 401
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Petición sin simular'));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
