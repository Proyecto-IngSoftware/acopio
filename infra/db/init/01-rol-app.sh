#!/bin/sh
# Crea el rol con el que se conecta la API. Corre una sola vez, al crear el volumen.
# Las migraciones corren con el dueño de la base; `acopio_app` solo recibe los
# permisos que le dan las migraciones (sin UPDATE ni DELETE sobre la bitácora).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE ROLE acopio_app LOGIN PASSWORD '${APP_DB_PASSWORD}';
GRANT CONNECT ON DATABASE "${POSTGRES_DB}" TO acopio_app;
GRANT USAGE ON SCHEMA public TO acopio_app;
SQL
