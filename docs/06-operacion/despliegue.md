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
# infra/docker-compose.yml  (esquema, no archivo final)

services:
  db:        postgres:16          volumen: pgdata
  api:       build apps/api       multi-stage, node:22-alpine
  storage:   minio/minio          volumen: miniodata
  web:       build apps/web       nginx sirviendo el build de Vite
  proxy:     nginx:alpine         puerto 80/443 · solo en local; en el VPS lo
                                  reemplaza Traefik, incluido en Dokploy — ver
                                  «Producción» más abajo
```

**Supabase Auth es externo**, en la nube. No hay contenedor para él.

## Enrutamiento del proxy

```
/          → web
/api/*     → api
/files/*   → api      (nunca directo a MinIO)
```

**MinIO no se expone jamás.** Todo archivo pasa por la API, que valida permisos y
entrega URLs firmadas de expiración corta.

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

# MinIO
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_BUCKET=comprobantes

# Correo
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
CORREO_REMITENTE=

# Aplicación
APP_URL=https://...          # base de los enlaces de invitación
NODE_ENV=production
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
  `pg_dump` / `mc mirror` de [Respaldos](#respaldos).

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

`infra/docker-compose.dev.yml` sobrescribe:
- `api` con `npm run start:dev` y volumen montado
- `web` con el servidor de Vite en lugar de nginx
- Puertos de base de datos y MinIO expuestos al anfitrión

```bash
docker compose -f infra/docker-compose.yml \
               -f infra/docker-compose.dev.yml up
```

## Primer arranque

```bash
1  cp .env.example .env         # y llenarlo
2  docker compose up -d db storage
3  docker compose run --rm api npx prisma migrate deploy
4  docker compose run --rm api npm run seed    # catálogo y primer admin
5  docker compose up -d
```

El paso 4 crea el catálogo inicial de categorías y **el primer administrador**, que
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
| MinIO | `mc mirror` a destino externo | Diaria |
| Supabase | Exportación de usuarios desde el panel | Semanal |

**Restauración probada al menos una vez antes de la sustentación.** Un respaldo que
nunca se restauró no es un respaldo, es una suposición.

## Lista de verificación previa

- [ ] `.env` completo, sin valores de ejemplo
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ausente de todo artefacto del frontend
- [ ] Buckets de MinIO en modo privado
- [ ] Migraciones aplicadas
- [ ] HTTPS activo, HTTP redirigido
- [ ] Respaldos programados y verificados
- [ ] Registro público deshabilitado en Supabase
- [ ] Proyecto de Supabase activo (ver [runbook](runbook.md))
