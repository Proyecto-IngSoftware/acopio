import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no carga .env solo. El .env vive en la raíz del monorepo.
config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Migraciones y seed corren con el dueño de la base; la API se conecta como
// acopio_app (DATABASE_URL), que no puede modificar la bitácora.
export default defineConfig({
  schema: '../../prisma/schema.prisma',
  migrations: { path: '../../prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL_OWNER ?? '' },
});
