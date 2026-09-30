/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El .env vive en la raíz del monorepo
  envDir: '../..',
  server: {
    port: 5173,
    strictPort: true,
    // Mismo origen que la API, como en producción detrás de Traefik (ADR-0014)
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/preparar.ts'],
    css: false,
  },
});
