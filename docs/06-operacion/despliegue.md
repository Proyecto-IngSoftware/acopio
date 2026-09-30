---
title: "Despliegue"
type: operacion
tags: [operacion]
estado: vigente
actualizado: 2026-09-28
---

# Despliegue

Todo va en contenedores. El equipo clona y ejecuta `docker compose up`.

---

## Servicios

```yaml
# infra/docker-compose.yml

services:
  db:        postgres:16-alpine   volumen: pgdata · crea el rol acopio_app al iniciar
  api:       apps/api/Dockerfile  oven/bun construye, node:22-trixie-slim ejecuta
                                  (Bloque 0, D-01) · volumen: llaves
  storage:   dxflrs/garage        volúmenes: garagemeta, garagedata · compatible con S3
                                  (ADR-0012)
  web:       build apps/web       nginx sirviendo el build de Vite · llega con la interfaz
  proxy:     nginx:alpine         puerto 80/443 · solo en local; en el VPS lo
                                  reemplaza Traefik, incluido en Dokploy — ver
                                  «Producción» más abajo · llega con la interfaz
```

**Dos roles de base de datos.** `acopio_owner` es el dueño: corre las migraciones y el
*seed*. `acopio_app` es el de la API: no puede modificar ni borrar la bitácora. La API
recibe `DATABASE_URL` con `acopio_app`; las migraciones, `DATABASE_URL_OWNER`.

**Supabase Auth es externo**, en la nube. No hay contenedor para él.

## Enrutamiento del proxy

```
/          → web
/api/*     → api
/files/*   → api      (nunca directo al almacenamiento)
```

**El almacenamiento no se expone jamás.** Todo archivo pasa por la API, que valida
permisos y entrega URLs firmadas de expiración corta. Garage escucha solo en la red
interna de Docker; el puerto 3900 se publica únicamente en el perfil de desarrollo.

## Variables de entorno

Un `.env` en la raíz. Nunca se versiona; sí se versiona `.env.example`.

```bash
# Base de datos
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=acopio
DATABASE_URL=postgresql://...

# Supabase — SOLO autenticación
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=          # público, puede ir al frontend
SUPABASE_SERVICE_ROLE_KEY=  # SECRETO · SOLO BACKEND · nunca VITE_*
SUPABASE_JWKS_URL=https://xxxx.supabase.co/auth/v1/.well-known/jwks.json

# Almacenamiento: Garage, compatible con S3 (ADR-0012)
GARAGE_RPC_SECRET=          # openssl rand -hex 32
GARAGE_ADMIN_TOKEN=         # openssl rand -base64 32
S3_ENDPOINT=http://storage:3900
S3_REGION=garage
S3_BUCKET=comprobantes
S3_ACCESS_KEY=              # GK + 24 hexadecimales: echo GK$(openssl rand -hex 12)
S3_SECRET_KEY=              # openssl rand -hex 32

# Correo
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
CORREO_REMITENTE=

# Aplicación
APP_URL=https://...          # base de los enlaces de invitación
NODE_ENV=production
AUTH_PROVEEDOR=supabase      # local | supabase. «local» solo en desarrollo (P-025)
```

### La regla que no se rompe

**`SUPABASE_SERVICE_ROLE_KEY` vive solo en el contenedor `api`.**

Puede crear y borrar cualquier usuario. Nunca en `apps/web`, nunca en una variable
con prefijo `VITE_` —Vite las incrusta en el paquete que descarga el navegador—,
nunca en el repositorio.

Antes de cada despliegue: barrido de secretos sobre el árbol de trabajo.

## Producción — VPS con Dokploy

**Decisión (P-005, 2026-09-12):** el despliegue de referencia es un VPS con
[Dokploy](https://dokploy.com) — PaaS autoalojado, de código abierto, construido
sobre Docker y Traefik. Gestiona el mismo `infra/docker-compose.yml` sin
reescribirlo: se registra como proyecto tipo *Compose* y Dokploy hace el resto.

**Requisitos del VPS:** 2 vCPU / 4 GB RAM como mínimo cómodo. Con 1 vCPU / 2 GB
funciona, pero con riesgo real de quedarse sin memoria al construir la imagen de
`api`.

**Qué resuelve que antes había que hacer a mano:**

- **Dominio y HTTPS.** Traefik —incluido en Dokploy— emite el certificado con Let's
  Encrypt al agregar el dominio desde su panel. El servicio `proxy: nginx:alpine`
  deja de hacer falta en producción: Dokploy enruta directo hacia `web` y `api` con
  las mismas reglas (`/` → web, `/api` y `/files` → api).
- **Redeploy sin repartir la llave del servidor.** El panel web de Dokploy deja ver
  logs y volver a desplegar sin que los cuatro necesiten acceso SSH al VPS.
- **Backups y monitoreo básicos**, que complementan —no reemplazan— la rutina de
  `pg_dump` / `rclone sync` de [Respaldos](#respaldos).

**Pasos:**

```
1  Aprovisionar el servidor y el dominio          (P-005, resuelto: servidor de pruebas propio)
2  Instalar Dokploy con su script oficial          <10 min, servidor en blanco
3  Crear un proyecto tipo Compose, apuntado a
   infra/docker-compose.yml
4  Cargar las variables de entorno desde el panel de Dokploy,
   no en un .env versionado
5  Agregar el dominio a web y a api; Dokploy emite el certificado
6  Ejecutar el «Primer arranque» de abajo, una sola vez
```

## Perfil de desarrollo

Los comandos, desde la raíz del repositorio:

```bash
bun run servicios          # db, storage y mailpit
bun run servicios:todo     # además construye y levanta la api
bun run servicios:parar
bun run servicios:logs
```

Para desarrollar la API con recarga, se corre fuera de Docker:
`bun run --filter @acopio/api start:dev`.

**Puerto de la base.** El perfil de desarrollo publica PostgreSQL en el puerto que diga
`DB_PUERTO`, 5432 si no se define. En un equipo que ya tiene un PostgreSQL instalado
el 5432 está ocupado y el contenedor `db` no arranca (`address already in use`). Se
resuelve con `DB_PUERTO=5440` en `.env` y ese mismo puerto en `DATABASE_URL` y
`DATABASE_URL_OWNER`. Dentro de la red de Docker la API sigue hablando con `db:5432`;
el cambio solo afecta a lo que corre en el anfitrión: migraciones, seed y la API con
recarga.

`infra/docker-compose.dev.yml` sobrescribe:
- `api` con `npm run start:dev` y volumen montado
- `web` con el servidor de Vite en lugar de nginx
- Puertos de la base de datos y de la API S3 de Garage expuestos al anfitrión
- `mailpit`, que atrapa todo el correo SMTP y lo muestra en una bandeja web
- `AUTH_PROVEEDOR=local`

```bash
docker compose -f infra/docker-compose.yml \
               -f infra/docker-compose.dev.yml up
```

## Autenticación en desarrollo

**Decisión (P-025, 2026-09-28):** mientras el desarrollo es local, el login lo
resuelve la API con el adaptador `local`. No hace falta un proyecto de Supabase para
trabajar. Supabase Auth en la nube sigue siendo el destino
([ADR-0001](../02-arquitectura/adr/ADR-0001-supabase-solo-auth.md)): solo inicia
sesión, confirma el correo y envía esos correos.

| | Adaptador `local` | Adaptador `supabase` |
|---|---|---|
| Quién emite el JWT | La API, con RS256 | Supabase Auth |
| URL del JWKS | `http://api:3000/auth/.well-known/jwks.json` | `https://xxxx.supabase.co/auth/v1/.well-known/jwks.json` |
| Contraseñas | bcrypt en nuestra base | bcrypt en Supabase |
| Correos de confirmación y restablecer | SMTP de la API; en desarrollo, Mailpit | SMTP propio configurado en Supabase |

El guard valida contra `SUPABASE_JWKS_URL` en los dos casos; lo único que cambia es la
URL.

**Pasar a Supabase:**

```
1  Crear el proyecto de Supabase (plan gratuito, cómputo Nano)
2  Configurarlo según «Configuración de Supabase», más abajo
3  Importar los usuarios con su UUID y su hash bcrypt por el API de administración
4  AUTH_PROVEEDOR=supabase y SUPABASE_JWKS_URL del proyecto
5  Probar login, confirmación de correo y restablecer contraseña
```

## Primer arranque

```bash
1  cp .env.example .env         # y llenarlo
2  docker compose up -d db storage
3  DC="docker compose" ./infra/garage/iniciar.sh     # capacidad, llave y bucket privado
4  docker compose run --rm api npm run db:migrar     # migraciones, como dueño
5  docker compose run --rm api npm run seed:dist     # catálogo, canasta y primer admin
6  docker compose up -d
```

El script de Garage y el *seed* son idempotentes: correrlos de nuevo no duplica nada ni
pisa lo que se editó.

El paso 5 crea el catálogo inicial de categorías y **el primer administrador**, que
es el único usuario que no nace de una invitación. Su contraseña se define por
variable de entorno en ese único arranque y debe cambiarse de inmediato.

## Configuración de Supabase

En el panel del proyecto:

1. **Deshabilitar el registro público.** El alta es solo por invitación desde
   nuestra API
2. Agregar `APP_URL` a las URLs de redirección permitidas
3. Confirmación de correo activada
4. Anotar la URL del JWKS
5. **Configurar el SMTP propio** (*Authentication → SMTP Settings*) con el mismo
   servidor que usa la API. Supabase envía los correos de restablecer contraseña y
   verificar correo, y su servidor por defecto solo manda 2 por hora. Al activar el
   propio, subir el límite en *Rate Limits*
   ([I-004](../00-contexto/investigaciones.md))

## Respaldos

| Qué | Cómo | Frecuencia |
|---|---|---|
| PostgreSQL | `pg_dump` a volumen externo | Diaria |
| Archivos (Garage) | `rclone sync` del bucket a un destino externo, por la API de S3 | Diaria |
| Supabase | Exportación de usuarios desde el panel | Semanal |

Para los archivos, `rclone` se configura una vez con dos remotos: `garage` (el
`S3_ENDPOINT` y las llaves de la API) y el destino externo. El respaldo es
`rclone sync garage:comprobantes destino:acopio/comprobantes`, y restaurar es el mismo
comando al revés. Garage guarda una sola copia (`replication_factor = 1`): sin este
respaldo, perder el disco es perder las facturas.

**Restauración probada al menos una vez antes de la sustentación.** Un respaldo que
nunca se restauró no es un respaldo, es una suposición.

## Lista de verificación previa

- [ ] `.env` completo, sin valores de ejemplo
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausente de todo artefacto del frontend
- [ ] Bucket de Garage privado: solo la llave de la API tiene permisos (`garage bucket info comprobantes`)
- [ ] Migraciones aplicadas
- [ ] HTTPS activo, HTTP redirigido
- [ ] Respaldos programados y verificados
- [ ] Registro público deshabilitado en Supabase
- [ ] Proyecto de Supabase activo (ver [runbook](runbook.md))
