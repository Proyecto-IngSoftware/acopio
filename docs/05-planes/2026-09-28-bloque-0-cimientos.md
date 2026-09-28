---
title: "Bloque 0 · Cimientos — plan de implementación"
type: plan
tags: [plan, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-28
---

# Bloque 0 · Cimientos — plan de implementación

**Especificación:** [2026-09-28-bloque-0-cimientos-design.md](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md)
**Sprint:** 1
**Estado:** aprobado el 2026-09-28 · backend terminado el mismo día

El reparto sigue la [especificación general §4](../superpowers/specs/2026-08-20-acopio-design.md#reparto-entre-las-4-personas-del-equipo):
Joseph lleva `catalogo`, Michael `identidad` y `auditoria`, Brayan la interfaz base y
C18, y Alejandra, que no tiene módulo en este bloque, lleva `notificaciones` y la
documentación que cambia.

---

## Estado al 2026-09-28

El backend completo quedó construido y probado en una sesión de trabajo. La interfaz
pasa a Google Stitch ([ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md)).
Lo que cambió al construir está en la
[especificación, §11](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md#11-cambios-al-construir).

| Tarea | Estado | Qué falta |
|---|---|---|
| T01 Monorepo | ✅ | — |
| T02 Docker Compose | ✅ | Que cada integrante lo levante en su equipo ([#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27)). MinIO pendiente de reemplazo ([P-027](../01-requerimientos/pendientes.md)) |
| T03 Prisma y migración | ✅ | — |
| T04 Esqueleto de la API | ✅ | — |
| T05 Integración continua | ✅ escrita | Verla en verde en el primer PR |
| T06 Spike de autenticación | ✅ | Probar la importación de usuarios contra un proyecto real de Supabase ([#19](https://github.com/Proyecto-IngSoftware/acopio/issues/19)) |
| T07 Usuarios y autorización | ✅ | — |
| T08 Invitaciones y login | ✅ | — |
| T09 Bitácora | ✅ | Confirmar el alcance del Auditor ([P-028](../01-requerimientos/pendientes.md)) |
| T10 Notificaciones | ✅ | La prueba con el SMTP del dominio (RTA-04) espera el dominio |
| T11 API del catálogo | ✅ | — |
| T12 Seed | ✅ | La canasta se cargó con la fuente marcada «por verificar» ([#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20)) |
| T13 a T16 Interfaz | ➡️ Stitch | Se trabajan con Google Stitch sobre el [contrato de la API](../03-diseno/api/README.md) |
| T17 Concurrencia | ✅ | La prueba del saldo se suma en el Bloque 2 |
| T18 Revisión de salida | ⬜ | Con la interfaz y el Compose en los cuatro equipos |

## Orden y dependencias

```
Fase A · Esqueleto        T01 → T02 → T03 → T04 → T05
                                         │
Fase B · Identidad                       ├→ T06 (spike) → T07 → T08
                                         │                  │
                                         │        T09 ←─────┤
                                         │        T10 ──────┘ (T08 envía invitaciones)
                                         │
Fase C · Catálogo                        ├→ T11 → T12
                                         │
Fase D · Interfaz         T13 → T14 → T15 → T16 (pantallas, cuando su API exista)
                                         │
Fase E · Cierre                          └→ T17 (concurrencia) → T18 (salida)
```

- **T01 a T04 los hace una sola persona** (Joseph) antes de que entren los demás:
  cuatro personas creando el esqueleto a la vez producen cuatro esqueletos.
- Cuando T04 está en `main`, las fases B, C y D avanzan en paralelo.
- T13 y T14 no dependen de la API: Brayan puede empezar el primer día.

---

## Fase A · Esqueleto

### T01 · Monorepo
**Quién:** Joseph · **Depende de:** nada
- Bun con workspaces (`apps/*`, `packages/*`) y `bun.lock` versionado. Node 22 como
  runtime (`.nvmrc` y `engines`). TypeScript en modo estricto con un
  `tsconfig.base.json` compartido
- ESLint y Prettier con una sola configuración en la raíz
- Scripts en la raíz: `lint`, `typecheck`, `test`, `test:int`, `format`

**Verificación:** en un clon limpio, `bun install --frozen-lockfile && bun run lint &&
bun run typecheck` termina sin errores, y las pruebas corren sobre Node 22.

**Hecho el 2026-09-28.** Verificado en un clon limpio. Lo que cambió al construirlo:
- **TypeScript fijado en 6.0.** La 7 ya salió, pero typescript-eslint declara
  soporte hasta `<6.1`. Se sube cuando lo amplíe
- **Jest transforma con `@swc/jest`, no con ts-jest.** ts-jest falla con las opciones
  de módulo que TypeScript 6 marca como obsoletas. SWC solo quita los tipos; la verificación de
  tipos la hace `typecheck`, también sobre los archivos de prueba
- **`packages/shared` nace aquí**, con el formato de números en español de Colombia
  (RNF-12). Sirvió para probar la cadena completa: lint, tipos y pruebas. La conversión
  de unidades llega con los códigos de barras, en el Bloque 2
- Los scripts de la raíz usan `bun run --workspaces --if-present`: un paquete sin
  pruebas de integración no hace fallar `test:int`

### T02 · Docker Compose
**Quién:** Joseph · **Depende de:** T01
- `infra/docker-compose.yml` con `db`, `api`, `storage`, `web`, `proxy`
- Imágenes de varias etapas: `oven/bun` instala las dependencias y construye;
  `node:22-alpine` ejecuta la API
- `infra/docker-compose.dev.yml` con la API en modo observador, Vite, puertos
  expuestos, `mailpit` y `AUTH_PROVEEDOR=local`
- `.env.example` completo, con las variables de [despliegue.md](../06-operacion/despliegue.md#variables-de-entorno)

**Verificación:** `docker compose ... up` deja los servicios sanos y Mailpit responde
en `localhost:8025`. Lo prueba **cada integrante en su equipo** y lo marca en
[#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27).

### T03 · Prisma y primera migración
**Quién:** Joseph · **Depende de:** T02
- Tablas del §5 de la especificación, con sus `CHECK`
- Extensiones `citext`, `unaccent`, `pg_trgm`
- Dos roles de base de datos: `acopio_owner`, que corre las migraciones, y `acopio_app`,
  con el que se conecta la API. `acopio_app` no tiene `UPDATE` ni `DELETE` sobre
  `bitacora`

**Verificación:** `prisma migrate deploy` sobre una base vacía termina bien; una
prueba de integración confirma que `acopio_app` no puede modificar la bitácora.

### T04 · Esqueleto de la API
**Quién:** Joseph · **Depende de:** T03
- NestJS con `GET /api/salud`, validación de variables de entorno al arrancar y
  errores con el mismo formato en toda la API
- dependency-cruiser con las reglas de dependencias permitidas

**Verificación:** `/api/salud` responde 200 con la base arriba y 503 sin ella; un
import prohibido entre módulos hace fallar `bun run lint`.

### T05 · Integración continua
**Quién:** Michael · **Depende de:** T04
- GitHub Actions en cada PR: lint, tipos, dependency-cruiser, pruebas unitarias y de
  integración con PostgreSQL 16 como servicio. Instala con `oven-sh/setup-bun` y corre
  las pruebas con `actions/setup-node` en 22
- Revisión de colores hexadecimales fuera de `packages/ui-tokens`

**Verificación:** un PR con una prueba rota queda en rojo; al arreglarla, en verde.

---

## Fase B · Identidad

### T06 · Spike: puerto de autenticación y guard
**Quién:** Joseph, con Michael · **Depende de:** T04 · **Issue:** [#19](https://github.com/Proyecto-IngSoftware/acopio/issues/19)
- `ProveedorIdentidad` con el adaptador `local`: llaves RS256, JWKS, `identidad_local`
  con bcrypt
- `AuthGuard` que valida contra `SUPABASE_JWKS_URL` con la librería `jose`
- El adaptador `supabase` escrito, sin probar contra un proyecto real
- La API se niega a arrancar con `local` en producción

**Verificación:**
- Prueba de integración: iniciar sesión → token → endpoint protegido responde 200
- Un token firmado con otra llave, vencido o con la firma alterada: 401
- Con `NODE_ENV=production` y `AUTH_PROVEEDOR=local`, la API no arranca
- Queda escrito en #19 el patrón de módulo que copian los demás

### T07 · Usuarios, asignaciones y autorización
**Quién:** Michael · **Depende de:** T06
- RF-IDE-005, 006, 007, 008 y 010: `ScopeGuard`, asignaciones con quién y cuándo,
  suspender y reactivar, último administrador
- El guard consulta la base en cada request; nada del rol ni del alcance viaja en el
  token

**Verificación:** pruebas de integración para cada criterio de aceptación de esos RF.
Como mínimo: un usuario suspendido recibe 403 en el siguiente request con un token
todavía vigente; el último administrador no se puede suspender ni degradar; un
operador recibe 403 con un `ubicacion_id` que no tiene asignado.

### T08 · Invitaciones, login por usuario y restablecer acceso
**Quién:** Michael · **Depende de:** T07, T10
- RF-IDE-001 a 004 y 009
- Límite de intentos por IP en el login y en el canje (`@nestjs/throttler`)
- Contraseña de 12 caracteres mínimo, contrastada con una lista de contraseñas comunes

**Verificación:** pruebas de integración para cada criterio. Como mínimo: el token en
claro no aparece en la base; un token vencido, usado o inexistente produce el mismo
mensaje; el enlace de invitación llega a Mailpit y la API también lo devuelve para copiarlo
(C16 lo muestra en T16).

### T09 · Bitácora
**Quién:** Michael · **Depende de:** T03, T07
- Interceptor que registra cada escritura con usuario, momento, acción, entidad y los
  datos antes y después
- Eventos destacados: restablecer acceso, cambio de rol
- `GET /api/bitacora` filtrable (RF-IDE-012)

**Verificación:** crear, suspender y restablecer un usuario deja tres registros, el
último marcado como destacado.

### T10 · Notificaciones
**Quién:** Alejandra · **Depende de:** T03
- `NotificacionService` con nodemailer y la tabla `correo_saliente`
- Tarea cada 5 minutos que reintenta los fallidos, con espera creciente y un máximo de
  intentos
- Plantillas: invitación, restablecer acceso, asignación y revocación

**Verificación:**
- Con Mailpit arriba, el correo llega
- Con el SMTP apagado, queda `FALLIDO` y sale solo al volver
- Con el SMTP del dominio, un correo llega a una cuenta de Gmail y a una de Outlook
  sin caer en spam (RTA-04). Antes hay que configurar SPF, DKIM y DMARC del dominio

---

## Fase C · Catálogo

### T11 · API del catálogo
**Quién:** Joseph · **Depende de:** T04, T07
- RF-CAT-001: categorías, con archivado en vez de borrado
- RF-CAT-002: búsqueda con `unaccent` y `pg_trgm` sobre nombre y sinónimos
- RF-CAT-003: canasta versionada
- RF-CAT-005: emergencias y la tarea diaria de `destacada_hasta`

**Verificación:** «panal» encuentra «Pañal adulto» y «aroz» encuentra «Arroz»; la
búsqueda responde en menos de 100 ms; cambiar la canasta deja la versión anterior
intacta; una categoría usada no se puede borrar.

### T12 · Seed
**Quién:** Joseph · **Depende de:** T11
- Las 39 categorías y la canasta de 10 de [catalogo-inicial.md](../01-requerimientos/catalogo-inicial.md)
- El primer administrador, con su contraseña tomada de una variable de entorno

**Verificación:** correrlo dos veces deja 39 categorías, 10 filas de canasta y un
administrador. Antes de cargar la canasta se completa la lista de verificación del
catálogo ([#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20)); si no
alcanza, las filas se cargan con la fuente marcada «por verificar».

---

## Fase D · Interfaz

### T13 · Tokens y componentes base
**Quién:** Brayan · **Depende de:** T01
- `packages/ui-tokens` con los tokens del sistema de diseño, conectado a Tailwind
- Los componentes del §8 de la especificación, sobre shadcn/ui

**Verificación:** una página de muestra con todos los componentes pasa axe-core sin
violaciones críticas y se ve bien en 360 × 640 px.

### T14 · Estructura de la SPA
**Quién:** Brayan · **Depende de:** T13
- Rutas públicas y de consola, protegidas por rol
- `ClienteAuth` con la implementación local
- Barra superior con el conmutador de contexto (RF-IDE-010)

**Verificación:** sin sesión, una ruta de consola lleva a C01; con sesión de operador,
una ruta de administrador muestra «no autorizado»; la ubicación elegida se conserva
al recargar.

### T15 · C01 Acceso
**Quién:** Michael · **Depende de:** T08, T14
Iniciar sesión con nombre de usuario y canjear la invitación.

### T16 · C16, C17 y C18
**Quién:** Michael (C16, C17) · Brayan (C18) · **Depende de:** T08, T09, T11, T14
- C16: crear, invitar, asignar, suspender, restablecer
- C17: bitácora filtrable, solo lectura
- C18: categorías, canasta y emergencias

**Verificación de T15 y T16:** cada pantalla se revisa contra su lienzo en
360 × 640 px y pasa axe-core sin violaciones críticas.

---

## Fase E · Cierre

### T17 · Esqueleto de la prueba de concurrencia
**Quién:** Michael · **Depende de:** T08 · **Issue:** [#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27)
- Arnés que lanza N transacciones simultáneas contra el PostgreSQL de las pruebas
- Primer caso real: canjear la misma invitación dos veces a la vez

**Verificación:** de 10 canjes simultáneos, uno termina bien y nueve reciben el
mensaje genérico. El arnés queda listo para la prueba del saldo en el Bloque 2 (RTA-02).

### T18 · Revisión de salida
**Quién:** los cuatro · **Depende de:** todo lo anterior
Recorrer los [criterios de salida](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md#9-criterios-de-salida-del-bloque)
de la especificación uno por uno, en un equipo recién clonado.

---

## Qué se recorta si el tiempo no alcanza

En este orden. Lo que se recorta pasa al bloque siguiente, no desaparece.

1. **C17 Bitácora:** queda solo la API; la pantalla pasa al Bloque 1
2. **Emergencias en C18:** se cargan con el *seed*; la pantalla pasa al Bloque 1
3. **Restablecer acceso en C16:** queda solo la API
4. **Pruebas de integración en CI:** se corren locales antes de cada PR

**No se recorta:** el guard y sus pruebas, la bitácora append-only, el *seed*, el
Compose en los cuatro equipos y la prueba de concurrencia. Todo lo demás se apoya en
eso.
