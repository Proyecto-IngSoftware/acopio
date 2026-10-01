import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

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
