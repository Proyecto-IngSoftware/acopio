#!/usr/bin/env bash
# Pruebas manuales de la API con curl, para la evidencia del Sprint Review.
# Corre contra la API del Compose (bun run servicios:todo) y deja cada petición con su
# respuesta. La contraseña y el token nunca se imprimen.
#
# Uso: scripts/pruebas-manuales.sh [salida.txt]
# Variables: API (por defecto http://localhost:3000/api); ACOPIO_USUARIO y
# ACOPIO_CONTRASENA (por defecto, SEED_ADMIN_USUARIO y SEED_ADMIN_CONTRASENA del .env).
set -euo pipefail

raiz="$(cd "$(dirname "$0")/.." && pwd)"
API="${API:-http://localhost:3000/api}"
leer_env() { grep -E "^$1=" "$raiz/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"; }
USUARIO="${ACOPIO_USUARIO:-$(leer_env SEED_ADMIN_USUARIO)}"
CONTRASENA="${ACOPIO_CONTRASENA:-$(leer_env SEED_ADMIN_CONTRASENA)}"
salida="${1:-/dev/stdout}"
[ "$salida" != /dev/stdout ] && : > "$salida"

registro() { printf '%s\n' "$*" >> "$salida"; }

# Imprime la petición como se escribiría a mano y la respuesta con su código HTTP.
peticion() {
  local titulo="$1" metodo="$2" ruta="$3" cuerpo="${4:-}" token="${5:-}" mostrar="${6:-${4:-}}"
  local args=(-s -w '\n%{http_code}' -X "$metodo" "$API$ruta")
  local linea="curl -X $metodo $API$ruta"
  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
    linea+=" -H 'Authorization: Bearer <token>'"
  fi
  if [ -n "$cuerpo" ]; then
    args+=(-H 'Content-Type: application/json' -d "$cuerpo")
    linea+=" -H 'Content-Type: application/json' -d '$mostrar'"
  fi
  local r codigo
  r="$(curl "${args[@]}")"
  codigo="${r##*$'\n'}"
  registro "### $titulo"
  registro "\$ $linea"
  registro "HTTP $codigo"
  registro "$(printf '%s' "${r%$'\n'*}" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch{console.log(s||"(sin cuerpo)")}})')"
  registro ""
  ULTIMO="${r%$'\n'*}"
}

registro "# Pruebas manuales de la API de Acopio"
registro "Fecha: $(date '+%Y-%m-%d %H:%M %Z') · API: $API"
registro ""

peticion "1. Estado del servicio (público)" GET /salud

peticion "2. Sin sesión, una ruta protegida responde 401" GET /categorias

# Inicio de sesión: el token viaja en la cookie acopio_sesion; aquí se saca de Set-Cookie.
cuerpo_sesion="$(printf '{"usuario":"%s","contrasena":"%s"}' "$USUARIO" "$CONTRASENA")"
encabezados="$(curl -s -D - -o /dev/null -X POST "$API/auth/sesion" -H 'Content-Type: application/json' \
  -d "$cuerpo_sesion" | tr -d '\r')"
TOKEN="$(printf '%s\n' "$encabezados" | sed -n 's/^[Ss]et-[Cc]ookie: acopio_sesion=\([^;]*\).*/\1/p')"
estado_sesion="$(printf '%s\n' "$encabezados" | head -1)"
cookie="$(printf '%s\n' "$encabezados" | grep -i '^set-cookie: acopio_sesion=' | sed 's/acopio_sesion=[^;]*/acopio_sesion=<token>/')"
registro "### 3. Inicio de sesión del administrador"
registro "\$ curl -X POST $API/auth/sesion -H 'Content-Type: application/json' -d '{\"usuario\":\"$USUARIO\",\"contrasena\":\"********\"}'"
if [ -n "$TOKEN" ]; then
  registro "$estado_sesion"
  registro "$cookie"
else
  registro "No se obtuvo la cookie de sesión: revisar usuario y contraseña."; exit 1
fi
registro ""

peticion "4. Quién soy" GET /auth/yo "" "$TOKEN"

nombre="Pilas AA prueba $(date +%H%M%S)"
peticion "5. Crear una categoría (C de CRUD)" POST /categorias \
  "{\"nombre\":\"$nombre\",\"grupo\":\"HERRAMIENTAS\",\"unidadBase\":\"UNIDAD\",\"sinonimos\":[\"baterías\"]}" "$TOKEN"
ID="$(printf '%s' "$ULTIMO" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')"

peticion "6. Consultar la categoría creada (R)" GET "/categorias/$ID" "" "$TOKEN"

peticion "7. Modificarla (U)" PATCH "/categorias/$ID" '{"perecedero":false,"sinonimos":["baterías","pilas doble A"]}' "$TOKEN"

peticion "8. Validación: falta la unidad base, responde 400 con el detalle" POST /categorias \
  '{"nombre":"Sin unidad","grupo":"HERRAMIENTAS"}' "$TOKEN"

peticion "9. Borrarla (D)" DELETE "/categorias/$ID" "" "$TOKEN"

peticion "10. Ya no existe: 404 con el formato único de error" GET "/categorias/$ID" "" "$TOKEN"

peticion "11. Seguimiento público de un folio que no existe: mensaje genérico" GET /seguimiento/DON-0000-0000
