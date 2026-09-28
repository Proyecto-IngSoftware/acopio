import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Client } from 'pg';
import {
  BASE_PRUEBAS,
  CLAVE_APP_PRUEBAS,
  URL_ADMIN_SERVIDOR,
  URL_DUENO_PRUEBAS,
} from './entorno-pruebas';

/** Global setup de Jest: base de pruebas nueva, rol de la API y migraciones. */
export default async function prepararBase(): Promise<void> {
  const admin = new Client({ connectionString: URL_ADMIN_SERVIDOR });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${BASE_PRUEBAS} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${BASE_PRUEBAS}`);
    // Lo que en Docker hace infra/db/init/01-rol-app.sh
    await admin.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'acopio_app') THEN
          CREATE ROLE acopio_app LOGIN PASSWORD '${CLAVE_APP_PRUEBAS}';
        ELSE
          ALTER ROLE acopio_app LOGIN PASSWORD '${CLAVE_APP_PRUEBAS}';
        END IF;
      END $$;`);
  } finally {
    await admin.end();
  }
  // El binario local de Prisma, nunca uno descargado por npx
  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL_OWNER: URL_DUENO_PRUEBAS },
    stdio: 'pipe',
  });
}
