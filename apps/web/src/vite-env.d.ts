/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Origen de la API, sin /api al final. Por defecto http://localhost:3000 */
  readonly VITE_API_URL?: string;
}
