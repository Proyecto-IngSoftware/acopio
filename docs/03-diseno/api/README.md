---
title: "Contrato de la API para el frontend"
type: diseno
tags: [diseno, api, frontend]
estado: vigente
actualizado: 2026-09-30
---

# Contrato de la API para el frontend

Lo que necesita quien construye la interfaz con Google Stitch
([ADR-0011](../../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md)) para conectarla
al backend del Bloque 0.

- **Contrato completo:** [openapi.json](openapi.json). Se regenera con
  `bun run --filter @acopio/api openapi` cada vez que cambia un endpoint
- **Interfaz navegable:** `http://localhost:3000/api/docs` con el backend corriendo

---

## Levantar el backend

```bash
bun install
cp .env.example .env                        # y ajustar contraseñas
bun run servicios                           # PostgreSQL, Garage y Mailpit en Docker
bun run almacenamiento:iniciar              # la primera vez: bucket privado de Garage
bun run --filter @acopio/api db:migrar      # esquema
bun run --filter @acopio/api seed           # catálogo y primer administrador
bun run --filter @acopio/api start:dev      # API en http://localhost:3000
```

- El primer administrador es `SEED_ADMIN_USUARIO` con `SEED_ADMIN_CONTRASENA` del `.env`
- Los correos no salen a internet: se ven en Mailpit, `http://localhost:8025`
- La API acepta peticiones desde `APP_URL` (CORS). Si Vite corre en otro puerto,
  cambiarlo en el `.env`

## Sesión

```
POST /api/auth/sesion   { usuario, contrasena }
  → 200 { accessToken, expiraEn, usuario: { id, username, nombre, rol } }
  → 401 «Usuario o contraseña incorrectos»   (el mismo mensaje en todos los casos)
  → 429 tras 5 intentos por minuto desde la misma IP
```

- **Cada request lleva** `Authorization: Bearer <accessToken>`
- **El token dura 8 horas y no se renueva** mientras la autenticación sea local
  ([P-025](../../01-requerimientos/pendientes.md)). Al pasar a Supabase llega la
  renovación; por eso toda llamada de sesión pasa por `ClienteAuth` (D-06)
- **401** en cualquier endpoint: la sesión venció o se restableció el acceso. Volver
  a C01
- **403 `NO_AUTORIZADO`**: el usuario fue suspendido o su rol no permite la acción.
  Mostrar el mensaje; no reintentar
- El inicio de sesión es con **nombre de usuario**, no con correo (RF-IDE-004)

### Conmutador de contexto (RF-IDE-010)

`GET /api/auth/yo` devuelve el rol y las ubicaciones del usuario:

```json
{ "rol": "OPERADOR", "alcanceGlobal": false,
  "asignaciones": [{ "tipo": "ACOPIO", "ubicacionId": "…" }] }
```

- Con una sola ubicación, se elige sola y el selector no se muestra
- Con varias, selector fijo arriba; la elegida se guarda en el dispositivo
- `alcanceGlobal: true` (Administrador): puede actuar en cualquier ubicación
- **El selector es una comodidad:** la ubicación viaja en el cuerpo de cada request
  y la API la valida siempre
- Los nombres de acopios y zonas llegan en el Bloque 1. Por ahora solo hay
  identificadores

## Invitación y restablecimiento

La API genera enlaces `APP_URL/invitacion/<token>`. **La SPA necesita esa ruta, sin
sesión.**

```
GET  /api/invitaciones/:token          → usuario, nombre, rol, ubicaciones, esRestablecimiento
POST /api/invitaciones/:token/canje    { contrasena } → 200 { username }
```

- Enlace vencido, usado, revocado o inexistente: **404 `INVITACION_INVALIDA`** con un
  único mensaje. Mostrarlo tal cual
- Contraseña rechazada: **422 `CONTRASENA_DEBIL`** con el motivo en `mensaje`
  (menos de 12 caracteres, demasiado común, contiene el usuario). Sin exigir símbolos
- Después del canje, llevar a C01 con el usuario ya escrito

## Errores

Todas las respuestas de error tienen la misma forma:

```json
{ "estado": 409, "codigo": "ULTIMO_ADMIN", "mensaje": "No se puede suspender al último…" }
```

- `mensaje` está en español y se muestra tal cual
- `codigo` es estable: la interfaz decide por él, nunca por el texto
- En errores de validación (400 `VALIDACION`) llega `detalles`: un mensaje por campo,
  para mostrarlo junto a cada entrada

```json
{ "estado": 400, "codigo": "VALIDACION", "mensaje": "Hay datos inválidos en la solicitud",
  "detalles": [{ "campo": "username", "mensaje": "Demasiado pequeño: …" }] }
```

| Código | Estado | Qué hace la interfaz |
|---|---|---|
| `NO_AUTENTICADO` | 401 | Volver a C01 |
| `NO_AUTORIZADO` | 403 | Mostrar el mensaje |
| `DEMASIADOS_INTENTOS` | 429 | Pedir que espere un minuto |
| `VALIDACION` | 400 | Marcar los campos de `detalles` |
| `DUPLICADO` | 409 | Mostrar el mensaje junto al campo |
| `UBICACION_SIN_RESPONSABLE` | 409 | Pedir confirmación y repetir con `?confirmar=true` |
| `ULTIMO_ADMIN`, `PROPIO_ROL`, `PROPIA_SUSPENSION` | 409 / 403 | Mostrar el mensaje; explica por qué |
| `INVITACION_INVALIDA` | 404 | Mostrar el mensaje; pedir un enlace nuevo |
| `CONTRASENA_DEBIL` | 422 | Mostrar el motivo |
| `CATEGORIA_EN_USO` | 409 | Ofrecer archivarla |
| `EMERGENCIA_CERRADA` | 409 | Pantalla en solo lectura |

## Pantallas del Bloque 0

| Pantalla | Endpoints |
|---|---|
| **C01 Acceso** | `POST /auth/sesion` · ruta `/invitacion/:token` con `GET /invitaciones/:token` y `POST /invitaciones/:token/canje` |
| **C02 Tablero** | `GET /auth/yo`. Vacío por rol hasta los bloques siguientes |
| **C16 Usuarios y accesos** | `GET /usuarios` (filtros `rol`, `estado`, `q`) · `POST /usuarios` · `PATCH /usuarios/:id` · `POST /usuarios/:id/suspender` · `/reactivar` · `/invitacion` (reinvitar) · `DELETE /usuarios/:id/invitacion` · `POST /usuarios/:id/restablecer` · `POST /usuarios/:id/asignaciones` · `DELETE /usuarios/:id/asignaciones/:tipo/:ubicacionId` |
| **C17 Bitácora** | `GET /bitacora` (filtros `usuarioId`, `ubicacionId`, `accion`, `entidad`, `destacado`, `desde`, `hasta`, `pagina`, `porPagina`) |
| **C18 Catálogo maestro** | `GET/POST /categorias` · `PATCH/DELETE /categorias/:id` · `POST /categorias/:id/archivar` · `/reactivar` · `GET /canasta` · `GET/POST /categorias/:id/canasta` · `GET/POST /emergencias` · `PATCH /emergencias/:id` · `POST /emergencias/:id/cerrar` |

**Lectura pública.** `GET /emergencias` no exige sesión: la usa la Portada. Crear,
editar y cerrar una emergencia sigue siendo del administrador.

Todas las rutas llevan el prefijo `/api`.

### Detalles que cambian la interfaz

- **C16 · crear usuario:** la respuesta trae `invitacion.enlace`. Mostrarlo con un
  botón de copiar: es la forma de entregarlo por WhatsApp a quien no tiene correo
- **C16 · sin correo:** `correo` puede ir vacío. El formulario advierte que no habrá
  recuperación de contraseña (RF-IDE-001)
- **C16 · marcas:** `invitacionPendiente` y `restablecimientoPendiente` se muestran en
  la lista; el segundo es un evento que se destaca (RF-IDE-009)
- **C16 · restablecer:** pide motivo de 20 caracteres o más
- **C17 · destacados:** `destacado: true` se distingue a la vista (RF-IDE-012)
- **C18 · unidad base:** no se puede cambiar después de crear la categoría
- **C18 · canasta:** cada versión exige `fuente`; mostrarla junto al valor
- **Búsqueda de categorías** (`GET /categorias/buscar?q=`): sin tildes, tolerante a
  errores de tipeo, sobre nombre y sinónimos. La usa la entrada rápida (C04) en el
  Bloque 2

### Fechas

- Fechas con hora (`creadoEn`, `ocurrido_en`, `venceEn`): ISO 8601 en UTC. Mostrarlas
  en hora de Colombia, con formato `d MMM yyyy, h:mm a` (RNF-12)
- **Fechas sin hora** (`inicio` y `destacadaHasta` de una emergencia,
  `vigenteDesde` de la canasta): llegan como medianoche UTC
  (`2026-09-28T00:00:00.000Z`). **Formatearlas en UTC**, no en hora local: en
  Colombia se verían un día antes. Al enviarlas, solo la fecha: `2026-09-28`

## Cliente tipado

Con el contrato se genera el cliente de TypeScript, por ejemplo con
`openapi-typescript` y `openapi-fetch`. Así, un cambio en la API que rompa la
interfaz aparece como error de tipos, no en producción.
