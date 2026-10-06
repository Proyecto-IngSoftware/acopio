/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Pantallas que se descargan al abrirlas pero que suelen ser la primera visita, por un
// enlace compartido. Si la dirección coincide, el HTML pide sus archivos desde el
// principio, en paralelo con el principal, y no después de él (§9 del Bloque 1: el mapa
// en menos de 3 s en 3G)
const PRECARGAS: Record<string, string> = {
  '/mapa': 'src/portal/mapa/Mapa.tsx',
  '/acopios/': 'src/portal/ficha/FichaAcopio.tsx',
};

function precargarPantallas(): Plugin {
  return {
    name: 'acopio:precargar-pantallas',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        const entrada = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry);
        const yaEstan = new Set(
          entrada?.type === 'chunk' ? [entrada.fileName, ...entrada.imports] : [],
        );
        const mapa: Record<string, string[]> = {};
        for (const [prefijo, modulo] of Object.entries(PRECARGAS)) {
          const raiz = Object.values(bundle).find(
            (c) => c.type === 'chunk' && c.facadeModuleId?.endsWith(modulo),
          );
          if (!raiz) throw new Error(`precarga: no hay fragmento para ${modulo}`);
          const archivos = new Set<string>();
          const visitar = (nombre: string) => {
            const c = bundle[nombre];
            if (!c || c.type !== 'chunk' || yaEstan.has(nombre) || archivos.has(nombre)) return;
            archivos.add(nombre);
            c.viteMetadata?.importedCss.forEach((css) => archivos.add(css));
            c.imports.forEach(visitar);
          };
          visitar(raiz.fileName);
          mapa[prefijo] = [...archivos].map((f) => `/${f}`);
        }
        const script = `(function(){var p=location.pathname,m=${JSON.stringify(mapa)};for(var k in m){if(k.slice(-1)==='/'?p.indexOf(k)!==0:p!==k)continue;m[k].forEach(function(h){var l=document.createElement('link');if(/\\.css$/.test(h)){l.rel='stylesheet'}else{l.rel='modulepreload';l.crossOrigin=''}l.href=h;document.head.appendChild(l)})}})()`;
        return { html, tags: [{ tag: 'script', children: script, injectTo: 'head-prepend' }] };
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    precargarPantallas(),
    // Service worker para abrir sin red (ADR-0016): guarda el build y responde index.html a
    // cualquier navegación. Nunca guarda respuestas de /api; la cola sincroniza desde la página
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Los íconos de Material Symbols vienen de Google Fonts: sin esto, sin red no se ven
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fuentes-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fuentes',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Las reglas compartidas se compilan desde su código fuente: la web no depende del dist
  resolve: {
    alias: {
      '@acopio/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  // El .env vive en la raíz del monorepo
  envDir: '../..',
  server: {
    port: 5173,
    strictPort: true,
    // Mismo origen que la API, como en producción detrás de Traefik (ADR-0014)
    proxy: { '/api': 'http://localhost:3000' },
  },
  // El build con el service worker, para probar la captura sin conexión (cierre del ciclo 3).
  // Mismo puerto que en desarrollo: la API rechaza escrituras con cookie desde un origen
  // distinto de APP_URL
  preview: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/preparar.ts'],
    css: false,
  },
});
