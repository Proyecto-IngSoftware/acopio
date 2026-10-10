# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Acopio es una plataforma de coordinación logística para respuesta a desastres, proyecto de Ingeniería de Software I (ETITC) de un equipo de cuatro personas. El código, los nombres y la documentación están en español; los términos salen de `docs/00-contexto/glosario.md` (`acopio`, no `CollectionCenter`).

## Comandos

Bun 1.3 instala y corre los scripts. El código y las pruebas corren sobre Node 22 (`.nvmrc`, `engines`): si el equipo tiene otra versión por defecto, activar la 22 antes (`nvm use`).

```bash
bun install
cp .env.example .env                      # la primera vez
bun run servicios                         # db, storage (Garage) y mailpit en Docker
bun run servicios:todo                    # además construye y levanta la api en contenedor
bun run almacenamiento:iniciar            # la primera vez: llave y bucket de Garage
bun run --filter @acopio/api db:migrar
bun run --filter @acopio/api seed         # idempotente
bun run --filter @acopio/api seed:demo    # acopios, una cuenta por rol con el correo de maqueta de cada integrante (joseph@acopio.co…) y donador1@demo.acopio.local, todas con la contraseña demo-acopio-2026; inventario y donaciones de prueba
bun run --filter @acopio/api start:dev    # API con recarga en localhost:3000/api
bun run --filter @acopio/web dev          # web en localhost:5173

bun run lint                              # ESLint y Prettier
bun run typecheck
bun run test                              # unitarias
bun run test:int                          # integración, necesita PostgreSQL
bun run --filter @acopio/api depcruise    # límites entre módulos
bun run --filter @acopio/api openapi      # regenera docs/03-diseno/api/openapi.json
bun run --filter @acopio/web api:tipos    # regenera los tipos del cliente desde el contrato
```

Los recorridos de punta a punta (`apps/web/recorridos/*.mjs`) prueban la web contra la API del Compose en Chromium; cómo se corren y qué cubre cada uno está en `docs/06-operacion/recorridos.md`. Se corren al cerrar cada bloque.

Una sola prueba, desde `apps/api`:

```bash
bunx jest src/config/entorno.test.ts -t 'parte del nombre'
bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/catalogo.int.test.ts
```

Las pruebas de integración crean y borran la base `acopio_test` en el servidor de `PRUEBAS_PG_URL` (por defecto `postgresql://acopio_owner:acopio@localhost:5432`), y le cambian la contraseña al rol `acopio_app` de ese servidor. Por eso no se corren contra el PostgreSQL del Compose: la API del Compose deja de autenticarse. Se usa un contenedor aparte, por ejemplo `docker run -d --rm --name acopio-pg-pruebas -e POSTGRES_USER=acopio_owner -e POSTGRES_PASSWORD=acopio -e POSTGRES_DB=postgres -p 127.0.0.1:5439:5432 postgres:16-alpine` con `PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439`. Si ya pasó, se arregla con `ALTER ROLE acopio_app PASSWORD '<APP_DB_PASSWORD del .env>'`.

Las pruebas de la web corren con Vitest (`bun run --filter @acopio/web test`); una sola: `cd apps/web && bunx vitest run src/portal/Portada.test.tsx -t 'parte del nombre'`.

Si el 5432 está ocupado por un PostgreSQL del equipo, cambiar `DB_PUERTO` en `.env` y usar el mismo puerto en `DATABASE_URL` y `DATABASE_URL_OWNER`.

CI (`.github/workflows/ci.yml`) corre en cada PR y en `main`: lint, tipos, depcruise, `scripts/revisar-colores.sh`, unitarias, integración y `docker build` de la API.

## Arquitectura

Monorepo con workspaces de Bun:

- `apps/api`: NestJS 11 y Prisma 7.10 sobre PostgreSQL 16. Monolito modular, sin microservicios.
- `packages/shared`: funciones puras que usan la API y el frontend (formato, unidades y las fórmulas del motor).
- `prisma/`: esquema y migraciones, en la raíz. `apps/api/prisma.config.ts` apunta allá y carga el `.env` de la raíz.
- `infra/`: `docker-compose.yml` es la base de producción; `docker-compose.dev.yml` añade puertos, Mailpit y el login local.
- `apps/web`: SPA con Vite, React, React Router, TanStack Query y Tailwind 4. Las pantallas se diseñan en Google Stitch y se reescriben con componentes propios (ADR-0011). El cliente de la API se tipa desde el contrato OpenAPI (`src/api/esquema.d.ts`, generado). Lee `@acopio/shared` desde su código fuente (alias en `vite.config.ts`). El script `build` fija `NODE_ENV=production` porque el `.env` de la raíz trae `development` para la API y Vite lo leería. El build mete en el HTML la precarga de las pantallas que suelen abrirse primero por un enlace (`PRECARGAS` en `vite.config.ts`); una pantalla así se agrega ahí.
- `packages/ui-tokens`: el único lugar con colores. Tokens del tema de Stitch con sus mismos nombres, así las clases del HTML de Stitch (`bg-primary-container`, `text-body-md`, `p-space-md`) funcionan en `apps/web` (ADR-0013).

### Módulos de la API

Cada carpeta de `apps/api/src/modulos/` es un límite de dominio. Hoy existen `identidad`, `auditoria`, `catalogo`, `notificaciones`, `salud`, `acopios`, `inventario` (movimientos, saldos, umbrales y «no recibir»; los códigos de barras viven en `catalogo`), `comprobantes` (donaciones con folio, recepción, conciliación y seguimiento), `almacenamiento` (Garage por S3, hoja del grafo) y `motor` (necesidad, excedentes, sugerencias y pesos; las fórmulas viven en `packages/shared/src/motor`; remisiones y recepción llegan en la etapa 2); faltan `turnos` e `importacion`.

Quién puede importar a quién está en la tabla «Dependencias permitidas» de `docs/02-arquitectura/vista-general.md`, y `apps/api/.dependency-cruiser.cjs` la hace cumplir. Un módulo nuevo se agrega a las dos. `comun/`, `config/` y `generado/` no son módulos y los usa cualquiera; los decoradores de autorización viven en `comun/autorizacion` para evitar un ciclo entre `identidad` y `auditoria`.

### Reglas que atraviesan varios archivos

Los patrones en uso, los descartados y el catálogo de lo reutilizable están en `docs/02-arquitectura/patrones-y-practicas.md`. Una pieza reutilizable nueva se anota en ese catálogo; los hooks de `.claude/settings.json` lo recuerdan al crear archivos.

- Dos roles de base de datos. `acopio_owner` (`DATABASE_URL_OWNER`) corre migraciones y seed. La API se conecta como `acopio_app` (`DATABASE_URL`), que no tiene `UPDATE` ni `DELETE` sobre `bitacora`.
- La bitácora la escribe cada servicio dentro de la misma transacción que el cambio, con los datos de antes y después. No hay interceptor.
- La sesión viaja en la cookie `acopio_sesion` (`HttpOnly`, `SameSite=Strict`, `Path=/api`, ADR-0014). La web nunca ve el token: todo pasa por `ClienteAuth` (`apps/web/src/sesion/`). El guard acepta la cookie o `Authorization: Bearer` (pruebas y curl); `iniciarSesion` de las pruebas de integración saca el token de `Set-Cookie`. Un guard global rechaza escrituras con la cookie desde un `Origin` distinto de `APP_URL`. En desarrollo Vite reenvía `/api` a la API.
- Las pruebas de la web usan `envolver(ui, ruta, cliente)` de `src/pruebas/utilidades.tsx`, con un `ClienteAuth` falso (`clienteFalso(usuario)`); por defecto, sin sesión. Para varias llamadas, `responderSegun({ 'GET /api/ruta/*': cuerpo })` responde por método y ruta; lo que no está en el mapa da 404. Una petición sin simular falla como sin red (`src/pruebas/preparar.ts`), así ninguna prueba toca la API del Compose.
- Las herramientas de cada rol viven en `/consola/...`, detrás de `RequiereRol`, y se llega a ellas desde «Más».
- Autenticación por un puerto `ProveedorIdentidad` con dos adaptadores, `local` y `supabase`, elegidos con `AUTH_PROVEEDOR`. La API no arranca con `local` en producción. El guard valida el JWT y lee el rol, el estado y las asignaciones de la base en cada request; nada de eso viaja en el token.
- Todos los endpoints exigen sesión salvo los marcados con `@Publico()`. `@Roles(...)` restringe por rol y `@UsuarioActual()` entrega el usuario.
- El correo siempre pasa por la cola `correo_saliente`. `NotificacionService.encolar` se llama dentro de la transacción de la operación y una tarea programada envía cada minuto.
- `identidad` valida las ubicaciones de una asignación con el puerto `VerificadorUbicaciones` (token en `comun/ubicaciones`), que implementa `acopios`. Las pruebas de integración parten de una entidad, dos acopios (`ACOPIO_A`, `ACOPIO_B`), una emergencia y una zona (`ZONA_A`) con id fijo, creados en `crearAppPrueba`; Nominatim va siempre con el adaptador falso.
- Las tareas programadas (`@Cron`) no se registran con `NODE_ENV=test`. Las pruebas llaman al método directamente.
- El saldo de inventario se deriva de los movimientos (ADR-0002). Lo guarda la tabla `saldo`, que mantiene un disparador sobre `movimiento` con `CHECK (cantidad >= 0)` (ADR-0015). `acopio_app` solo inserta y lee movimientos y solo lee `saldo`. Antes de una salida o un ajuste, la API toma `pg_advisory_xact_lock` por acopio y categoría: `SELECT … FOR UPDATE` pediría permiso de `UPDATE` sobre `saldo`.
- El cliente de Prisma se genera en `apps/api/src/generado/` y no se versiona. Los scripts `typecheck`, `test` y `test:int` lo regeneran.
- Los errores salen con un solo formato (`estado`, `codigo`, `mensaje`) desde `comun/errores`.
- Si cambia un endpoint, se regenera el contrato con `openapi`, luego los tipos de la web con `api:tipos`, y se versionan los dos.
- Los íconos son Material Symbols y `index.html` baja solo los que usa el código. Tras usar uno nuevo se corre `node scripts/iconos.mjs` en `apps/web`; `src/iconos.test.ts` falla si falta alguno.
- En `apps/web` no se escriben colores hexadecimales. Salen de `packages/ui-tokens` y CI lo revisa. La estética la fija el diseño de Stitch (ADR-0013); cuando la bóveda y Stitch no coinciden, se alinea la bóveda.
- Cada pantalla guarda su diseño en `docs/03-diseno/stitch/<código>-<nombre>/`: captura, HTML de Stitch, maqueta aprobada y nota con las diferencias. No se escribe código de una pantalla sin la maqueta aprobada por Joseph.

### Versiones fijadas a propósito

TypeScript 6.0 (typescript-eslint aún no soporta la 7), NestJS 11 (la 12 es solo ESM) y Prisma 7.10. Jest transforma con `@swc/jest`, que solo quita los tipos; los tipos los revisa `typecheck`. No subirlas sin revisar la razón en `docs/superpowers/specs/2026-09-28-bloque-0-cimientos-design.md`, §11.

## Documentación

`docs/` es una bóveda de Obsidian y es la fuente de verdad del proyecto. Reglas de `docs/GUIA-OBSIDIAN.md`:

- Enlaces Markdown relativos, nunca `[[wikilinks]]`.
- Toda nota lleva el frontmatter con `title`, `type`, `tags`, `estado` y `actualizado`. Los nombres de las propiedades son fijos y al editar una nota se actualiza la fecha.
- Prettier no toca `docs/` ni los `.md`.
- Una idea, duda o requerimiento nuevo entra por `docs/01-requerimientos/pendientes.md` con el siguiente número `P-0NN`. Una decisión de arquitectura va a un ADR nuevo; los números no se reutilizan.
- Lo que cambia al construir respecto de una especificación se anota en la sección «Cambios al construir» de esa especificación.

Los archivos usan finales de línea LF (`.gitattributes`).

## Redacción

Antes de escribir documentación, un comentario o cierre de issue, o la descripción de un PR, invocar la skill `humanizer:humanizer` y aplicarla a ese texto. Se invoca para cada texto, no una vez por sesión.

## Flujo de trabajo

Mientras Joseph trabaje solo, los cambios van directo a `main`, sin PR: se corre la verificación de abajo y, si pasa, se hace commit y se sube. Después del push se revisa el CI con `gh run watch`. Los mensajes de commit van en español, con el área al inicio (`CI: …`, `Compose: …`, `ADR-0012: …`).

El trabajo se organiza por bloques, según el plan vigente en `docs/05-planes/`.

Hoy el único que trabaja en el repositorio es Joseph. La documentación reparte módulos y pantallas entre cuatro personas (`docs/superpowers/specs/2026-08-20-acopio-design.md`, §4), pero ese reparto no frena nada:

- Se avanza en cualquier módulo o pantalla, sea de quien sea en el reparto.
- No se espera a que otro integrante pruebe, revise, documente o marque una casilla. Si una tarea o un issue pide la verificación de los cuatro, basta con la de Joseph y se deja escrito que fue así.
- Las decisiones que los documentos dejan «para el equipo» las toma Joseph en la sesión. Se registran en `pendientes.md` o en un ADR, como cualquier otra.

Para retomar entre sesiones, leer en este orden:

1. `git status`, la rama actual y `gh pr list`, para ver si quedó trabajo sin subir o sin fusionar.
2. El plan vigente en `docs/05-planes/`. Su tabla de estado dice qué tarea está hecha y qué le falta. Los issues abiertos son el plan de trabajo: uno por bloque o ciclo pendiente (etiquetas `bloque-N`) y uno por pendiente técnico (`deuda`).
3. `docs/01-requerimientos/pendientes.md`, sección «Abiertos», y `gh issue list`.
4. `gh run list --limit 5`, para confirmar que `main` está en verde antes de empezar algo nuevo.

Al terminar una sesión, dejar el estado escrito donde el equipo lo lee:

- Actualizar la fila de la tarea en el plan del bloque.
- Si apareció una decisión o un hueco, anotarlo en `pendientes.md` o en «Cambios al construir».
- Comentar en el issue lo que se probó y lo que falta. Si una casilla solo depende de otro integrante, no bloquea el cierre: se cierra y el comentario dice qué quedó sin hacer y dónde quedó anotado.

Un cambio se da por hecho cuando pasan `lint`, `typecheck`, `depcruise`, `test`, `test:int` y `scripts/revisar-colores.sh`. Si toca el Compose o el Dockerfile, además se levanta con `bun run servicios:todo`.

Si las verificaciones y el commit van en un mismo comando, el commit y el push se encadenan con `&&` (y `set -o pipefail` si la salida pasa por `|`). Con `;` o en otra línea corren aunque una prueba falle. El hook `~/.claude/hooks/commit-tras-verificar.sh` rechaza esos comandos.
