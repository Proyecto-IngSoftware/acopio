#!/bin/sh
# Prepara Garage la primera vez: capacidad del nodo, llave de la API y bucket
# privado. Idempotente: correrlo de nuevo no cambia nada.
#
#   bun run almacenamiento:iniciar                   (desarrollo)
#   DC="docker compose" ./infra/garage/iniciar.sh     (servidor)
#
# Garage no trae shell en su imagen; cada paso es un `docker compose exec`.
set -eu

DC=${DC:-"docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.dev.yml"}
garage() { $DC exec -T -e RUST_LOG=warn storage /garage "$@"; }

# Primero el entorno (en Dokploy las variables vienen del panel); si no, el .env.
# .env es formato dotenv, no shell: se leen solo las variables que hacen falta
leer() {
  eval "valor=\${$1:-}"
  if [ -n "$valor" ]; then echo "$valor"; return; fi
  [ -f .env ] && grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//'
}
S3_ACCESS_KEY=$(leer S3_ACCESS_KEY)
S3_SECRET_KEY=$(leer S3_SECRET_KEY)
S3_BUCKET=$(leer S3_BUCKET)
CAPACIDAD=$(leer GARAGE_CAPACIDAD); CAPACIDAD=${CAPACIDAD:-10G}
: "${S3_ACCESS_KEY:?falta S3_ACCESS_KEY en .env}" "${S3_SECRET_KEY:?falta S3_SECRET_KEY en .env}" "${S3_BUCKET:?falta S3_BUCKET en .env}"

# Recién levantado, Garage tarda unos segundos en crear la llave del nodo
intentos=0
until garage status >/dev/null 2>&1; do
  intentos=$((intentos + 1))
  if [ "$intentos" -ge 30 ]; then echo "Garage no respondió en 60 s" >&2; exit 1; fi
  sleep 2
done

nodo=$(garage node id -q | cut -d@ -f1)
if [ -z "$nodo" ]; then echo "No se pudo leer el identificador del nodo" >&2; exit 1; fi

if garage layout show | grep -q "$(echo "$nodo" | cut -c1-16)"; then
  echo "Capacidad del nodo: ya asignada"
else
  garage layout assign -z local -c "$CAPACIDAD" "$nodo" >/dev/null
  version=$(garage layout show | sed -n 's/.*--version \([0-9]*\).*/\1/p' | head -1)
  garage layout apply --version "${version:-1}" >/dev/null
  echo "Capacidad del nodo: $CAPACIDAD"
fi

if garage key info "$S3_ACCESS_KEY" >/dev/null 2>&1; then
  echo "Llave de la API: ya existe"
else
  garage key import --yes -n acopio-api "$S3_ACCESS_KEY" "$S3_SECRET_KEY" >/dev/null
  echo "Llave de la API: importada"
fi

if garage bucket info "$S3_BUCKET" >/dev/null 2>&1; then
  echo "Bucket $S3_BUCKET: ya existe"
else
  garage bucket create "$S3_BUCKET" >/dev/null
  echo "Bucket $S3_BUCKET: creado"
fi

# Solo la llave de la API lee y escribe. El bucket no es público ni sirve sitio web
garage bucket allow --read --write "$S3_BUCKET" --key "$S3_ACCESS_KEY" >/dev/null
echo "Permisos: lectura y escritura solo para la llave de la API"
