#!/bin/sh
# Arranque del contenedor de la API. Antes de levantarla puede aplicar las migraciones y el
# seed, cada uno con su variable. Apagados por defecto: en desarrollo se corren a mano.
#
#   MIGRAR_AL_ARRANCAR=true   prisma migrate deploy, como dueño (DATABASE_URL_OWNER)
#   SEMBRAR_AL_ARRANCAR=true  catálogo, canasta y primer administrador; idempotente
#
# Si un paso falla, la API no arranca y el error queda en el log del contenedor.
set -eu

if [ "${MIGRAR_AL_ARRANCAR:-false}" = "true" ]; then
  echo "arrancar: aplicando migraciones"
  node_modules/.bin/prisma migrate deploy
fi

if [ "${SEMBRAR_AL_ARRANCAR:-false}" = "true" ]; then
  echo "arrancar: sembrando datos base"
  node dist/seed/main.js
fi

exec "$@"
