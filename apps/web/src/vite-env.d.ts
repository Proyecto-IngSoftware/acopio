/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen de la API, sin /api al final. Por defecto http://localhost:3000 */
  readonly VITE_API_URL?: string;
}
