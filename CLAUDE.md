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
bun run --filter @acopio/api start:dev    # API con recarga en localhost:3000/api

bun run lint                              # ESLint y Prettier
bun run typecheck
bun run test                              # unitarias
bun run test:int                          # integración, necesita PostgreSQL
bun run --filter @acopio/api depcruise    # límites entre módulos
bun run --filter @acopio/api openapi      # regenera docs/03-diseno/api/openapi.json
```

Una sola prueba, desde `apps/api`:

```bash
bunx jest src/config/entorno.test.ts -t 'parte del nombre'
bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/catalogo.int.test.ts
```

Las pruebas de integración crean y borran la base `acopio_test` en el servidor de `PRUEBAS_PG_URL` (por defecto `postgresql://acopio_owner:acopio@localhost:5432`). Con el Compose local hay que pasar la contraseña y el puerto del `.env`.

Si el 5432 está ocupado por un PostgreSQL del equipo, cambiar `DB_PUERTO` en `.env` y usar el mismo puerto en `DATABASE_URL` y `DATABASE_URL_OWNER`.

CI (`.github/workflows/ci.yml`) corre en cada PR y en `main`: lint, tipos, depcruise, `scripts/revisar-colores.sh`, unitarias, integración y `docker build` de la API.

## Arquitectura

Monorepo con workspaces de Bun:

- `apps/api`: NestJS 11 y Prisma 7.10 sobre PostgreSQL 16. Monolito modular, sin microservicios.
- `packages/shared`: funciones puras que usan la API y el frontend (formato, unidades, y más adelante las fórmulas del motor).
- `prisma/`: esquema y migraciones, en la raíz. `apps/api/prisma.config.ts` apunta allá y carga el `.env` de la raíz.
- `infra/`: `docker-compose.yml` es la base de producción; `docker-compose.dev.yml` añade puertos, Mailpit y el login local.
- `apps/web` y `packages/ui-tokens` todavía no existen. La interfaz se diseña en Google Stitch y se adapta a React, Vite y Tailwind (ADR-0011).

### Módulos de la API

Cada carpeta de `apps/api/src/modulos/` es un límite de dominio. Hoy existen `identidad`, `auditoria`, `catalogo`, `notificaciones` y `salud`; faltan `acopios`, `inventario`, `comprobantes`, `motor`, `turnos`, `almacenamiento` e `importacion`.

Quién puede importar a quién está en la tabla «Dependencias permitidas» de `docs/02-arquitectura/vista-general.md`, y `apps/api/.dependency-cruiser.cjs` la hace cumplir. Un módulo nuevo se agrega a las dos. `comun/`, `config/` y `generado/` no son módulos y los usa cualquiera; los decoradores de autorización viven en `comun/autorizacion` para evitar un ciclo entre `identidad` y `auditoria`.

### Reglas que atraviesan varios archivos

- Dos roles de base de datos. `acopio_owner` (`DATABASE_URL_OWNER`) corre migraciones y seed. La API se conecta como `acopio_app` (`DATABASE_URL`), que no tiene `UPDATE` ni `DELETE` sobre `bitacora`.
- La bitácora la escribe cada servicio dentro de la misma transacción que el cambio, con los datos de antes y después. No hay interceptor.
- Autenticación por un puerto `ProveedorIdentidad` con dos adaptadores, `local` y `supabase`, elegidos con `AUTH_PROVEEDOR`. La API no arranca con `local` en producción. El guard valida el JWT y lee el rol, el estado y las asignaciones de la base en cada request; nada de eso viaja en el token.
- Todos los endpoints exigen sesión salvo los marcados con `@Publico()`. `@Roles(...)` restringe por rol y `@UsuarioActual()` entrega el usuario.
- El correo siempre pasa por la cola `correo_saliente`. `NotificacionService.encolar` se llama dentro de la transacción de la operación y una tarea programada envía cada minuto.
- Las tareas programadas (`@Cron`) no se registran con `NODE_ENV=test`. Las pruebas llaman al método directamente.
- El saldo de inventario se deriva de los movimientos, no se guarda (ADR-0002).
- El cliente de Prisma se genera en `apps/api/src/generado/` y no se versiona. Los scripts `typecheck`, `test` y `test:int` lo regeneran.
- Los errores salen con un solo formato (`estado`, `codigo`, `mensaje`) desde `comun/errores`.
- Si cambia un endpoint, se regenera el contrato con `openapi` y se versiona: el frontend trabaja contra `docs/03-diseno/api/`.
- En `apps/web` no se escriben colores hexadecimales. Salen de `packages/ui-tokens` y CI lo revisa (ADR-0006).

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

Trabajo en rama y PR hacia `main`; no se hace commit directo a `main`. Los mensajes de commit van en español, con el área al inicio (`CI: …`, `Compose: …`, `ADR-0012: …`).

El trabajo se organiza por bloques, según el plan vigente en `docs/05-planes/`.

Hoy el único que trabaja en el repositorio es Joseph. La documentación reparte módulos y pantallas entre cuatro personas (`docs/superpowers/specs/2026-08-20-acopio-design.md`, §4), pero ese reparto no frena nada:

- Se avanza en cualquier módulo o pantalla, sea de quien sea en el reparto.
- No se espera a que otro integrante pruebe, revise, documente o marque una casilla. Si una tarea o un issue pide la verificación de los cuatro, basta con la de Joseph y se deja escrito que fue así.
- Las decisiones que los documentos dejan «para el equipo» las toma Joseph en la sesión. Se registran en `pendientes.md` o en un ADR, como cualquier otra.

Para retomar entre sesiones, leer en este orden:

1. `git status`, la rama actual y `gh pr list`, para ver si quedó trabajo sin subir o sin fusionar.
2. El plan vigente en `docs/05-planes/`. Su tabla de estado dice qué tarea está hecha y qué le falta.
3. `docs/01-requerimientos/pendientes.md`, sección «Abiertos», y `gh issue list`.
4. `gh run list --limit 5`, para confirmar que `main` está en verde antes de empezar algo nuevo.

Al terminar una sesión, dejar el estado escrito donde el equipo lo lee:

- Actualizar la fila de la tarea en el plan del bloque.
- Si apareció una decisión o un hueco, anotarlo en `pendientes.md` o en «Cambios al construir».
- Comentar en el issue lo que se probó y lo que falta. Si una casilla solo depende de otro integrante, no bloquea el cierre: se cierra y el comentario dice qué quedó sin hacer y dónde quedó anotado.

Un cambio se da por hecho cuando pasan `lint`, `typecheck`, `depcruise`, `test` y `test:int`. Si toca el Compose o el Dockerfile, además se levanta con `bun run servicios:todo`.
