---
title: "Pieza C · verificación de entidades y causas · plan"
type: plan
tags: [plan, bloque-1, causas, api, web]
estado: vigente
bloque: 1
actualizado: 2026-10-17
---

# Pieza C · verificación de entidades y causas · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** el Administrador verifica entidades con un aviso de seguridad y les publica causas
con fecha de cierre; cualquiera ve el directorio, la ficha y las causas atendidas (HU-02,
HU-15).

**Arquitectura:** todo vive en el módulo `acopios`, que primero pasa a DAO. Las reglas puras de
fechas y enlaces van en `packages/shared/src/causas.ts`, porque las usan la API y la web. La API
suma `CausasService`, `CausasController`, `CausasPublicasController` y una tarea diaria; las
imágenes pasan por `procesarImagen` y el `Almacen` de `almacenamiento`. En la web, un cliente
`api/causas.ts`, tres pantallas públicas en `portal/causas/` y C22 en `consola/causas/`.

**Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16, zod con `crearDto`, sharp; React 19, React
Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`, Vitest con `responderSegun`,
Playwright para los recorridos.

**Especificación:** [2026-10-17-pieza-c-causas-design.md](../superpowers/specs/2026-10-17-pieza-c-causas-design.md),
aprobada por Joseph el 2026-10-17. Maquetas aprobadas de
[P3 y P4](../03-diseno/stitch/P03-causas/maqueta.html). Issue
[#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48), hasta el 1 de noviembre.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 `acopios` a DAO | ✅ | Suites de red, zonas, usuarios y «no recibir» en verde, 47/47 |
| 2 Reglas puras de causas | ✅ | 15 pruebas en `packages/shared` |
| 3 Esquema y migración | ✅ | La migración da `verificada_en` a las entidades que ya estuvieran verificadas, para que el `CHECK` no rompa el despliegue |
| 4 Verificación y logotipo | ✅ | |
| 5 Gestión de causas | ✅ | |
| 6 Rutas públicas y tarea diaria | ✅ | `test:int` 400/400 |
| 7 Contrato y cliente web | ✅ | |
| 8 Público: P3, atendidas y P4 | ✅ | |
| 9 Maquetas de C22 y C15 | ✅ | Joseph las aprobó el 2026-10-17 |
| 10 C15 con verificación y logotipo | ✅ | |
| 11 C22 Causas | ✅ | |
| 12 Demo, recorridos y cierre | 🟨 | Verificación completa en verde (`test:int` 402/402, web 853/853) y recorridos 4/4 y 6/6 en local; `portal-causas.mjs` 4/4 contra el servidor tras desplegar #117. Faltan `consola-causas.mjs` contra el servidor, que necesita la contraseña del administrador, y los criterios de HU-02 y HU-15 con Joseph ([P-066](../01-requerimientos/pendientes.md)) |

La revisión final de la rama fue una autorrevisión: el revisor aparte no pudo correr porque se agotó el límite semanal del modelo. Encontró que editar una causa sin cambiar el destino pedía confirmar, y se corrigió con su prueba. Los menores quedaron en [P-066](../01-requerimientos/pendientes.md).

Un solo PR para toda la pieza (P-051 y la regla de un PR por fase), con commits por tema:
DAO, API, contrato, público, consola y cierre.

## Global Constraints

- Node 22, Bun 1.3, TypeScript 6.0, NestJS 11, Prisma 7.10. No se suben versiones.
- Español en código, rutas y textos; términos de `docs/00-contexto/glosario.md`.
- Errores con `ErrorDominio(codigo, mensaje, estado)`: `ENTIDAD_SIN_VERIFICAR` 409,
  `CIERRE_FUERA_DE_RANGO` 422, `URL_NO_SEGURA` 422, `CONFIRMACION_REQUERIDA` 422,
  `CAUSA_ATENDIDA` 409, `CAUSA_NO_ENCONTRADA` 404, `ENTIDAD_SIN_SITIO` 422,
  `ENTIDAD_NO_ENCONTRADA` 404 (ya existe), `SIN_ARCHIVO` 400.
- «Hoy» es la fecha en `America/Bogota` (UTC−5, sin horario de verano).
- Tope de cierre: hoy más 6 meses de calendario; si el día no existe en ese mes, el último día
  del mes.
- Toda escritura deja su fila en la bitácora en la misma transacción, con antes y después.
- `acopio_app` no borra ni trunca `causa`.
- En `apps/web` no hay colores hexadecimales; los íconos nuevos se registran con
  `node scripts/iconos.mjs`.
- Ninguna pantalla de consola se escribe sin su maqueta aprobada por Joseph (tarea 9).
- Base de pruebas compartida entre suites (`acopio_test`): ninguna prueba siembra datos
  globales ni cuenta totales. Cada prueba crea su propia entidad, con nombre único, y busca sus
  causas por id.

## Review Focus

- Una causa con `cierra_el` de ayer y sin `archivada_en` (la tarea diaria no corrió) no debe
  salir en `GET /causas` ni en la ficha como activa. Prueba en la tarea 6.
- Una entidad verificada, con causas, a la que le quitan la verificación: sus atendidas en
  `GET /causas/:id` traen `urlOficial: null` y `verificadaEn: null`, y la web no pinta el botón.
  Pruebas en las tareas 6 y 8.
- Un enlace `https://usuario:clave@sitio.org`, `javascript:alert(1)` o `http://` se rechaza al
  crear y al editar. Pruebas en las tareas 2 y 5.
- Renovar con una fecha 6 meses y un día adelante, o con la de ayer, da 422; con exactamente
  6 meses pasa. Prueba en la tarea 5, con las fechas de la tarea 2.
- Un visitante sin sesión no ve en ninguna respuesta pública quién creó o archivó la causa.
  Prueba en la tarea 6.

---

### Task 1: `acopios` a DAO

**Files:**
- Create: `apps/api/src/modulos/acopios/dao/entidad.dao.ts`
- Modify: `apps/api/src/modulos/acopios/dao/acopio.dao.ts`, `dao/zona.dao.ts`,
  `entidades.service.ts`, `acopios.service.ts`, `zonas.service.ts`, `ubicaciones.service.ts`,
  `acopios.module.ts`
- Modify: `apps/api/.dependency-cruiser.cjs:23` (agregar `'acopios'` a `MIGRADOS_A_DAO`)
- Test: las suites existentes `red.int.test.ts`, `zonas-poblacion.int.test.ts`,
  `usuarios.int.test.ts`, `no-recibir.int.test.ts`

**Interfaces:**
- Produces: `EntidadDao` con un método por consulta y `bd: ClienteBd` como último parámetro
  (patrón de `ZonaDao`); los servicios abren la transacción con `Transacciones.ejecutar`.

- [ ] **Step 1:** Agregar `'acopios'` a `MIGRADOS_A_DAO` y correr
  `bun run --filter @acopio/api depcruise`. Esperado: falla, listando los cuatro servicios que
  inyectan `PrismaService`.
- [ ] **Step 2:** Mover cada consulta de esos servicios a su DAO (`EntidadDao`, `AcopioDao`,
  `ZonaDao`, y las de ubicaciones a `AcopioDao`/`ZonaDao`), sin cambiar comportamiento.
- [ ] **Step 3:** `bun run --filter @acopio/api depcruise && bun run typecheck`. Esperado: sin
  errores.
- [ ] **Step 4:** Con el PostgreSQL de pruebas aparte (ver `CLAUDE.md`),
  `cd apps/api && bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/red.int.test.ts src/pruebas-integracion/zonas-poblacion.int.test.ts src/pruebas-integracion/usuarios.int.test.ts src/pruebas-integracion/no-recibir.int.test.ts`.
  Esperado: todas pasan, igual que en `main`.
- [ ] **Step 5:** Commit `Acopios: módulo migrado a DAO (ADR-0019)`.

### Task 2: Reglas puras de causas

**Files:**
- Create: `packages/shared/src/causas.ts`, `packages/shared/src/causas.test.ts`
- Modify: `packages/shared/src/index.ts` (`export * from './causas.js';`)

**Interfaces:**
- Produces:
  - `hoyBogota(instante: Date): string` → `'AAAA-MM-DD'`
  - `sumarMeses(fecha: string, meses: number): string`
  - `topeCierre(hoy: string): string` = `sumarMeses(hoy, 6)`
  - `cierreValido(cierraEl: string, hoy: string): boolean` (de `hoy` a `topeCierre(hoy)`,
    ambos incluidos)
  - `porCerrar(cierraEl: string, hoy: string): boolean` (de `hoy` a hoy + 15 días, incluidos)
  - `validarUrlOficial(url: string): { dominio: string } | null`
  - `dominioDe(url: string): string | null` (hostname en minúsculas, sin `www.`)
  - `mismoDominio(urlOficial: string, sitioWeb: string): boolean` (igual o subdominio)
  - `CATEGORIAS_CAUSA = ['PERSONAS', 'ANIMALES', 'ADULTOS_MAYORES', 'RESCATISTAS'] as const`
  - `ENLACES_DESAPARECIDOS`: arreglo fijo de `{ nombre, url }` con la UBPD
    (`https://ubpdbusquedadesaparecidos.co`), la Cruz Roja Colombiana (`https://www.cruzrojacolombiana.org`)
    y Medicina Legal (`https://www.medicinalegal.gov.co`)

- [ ] **Step 1: Pruebas que fallan**, en `causas.test.ts`:

```ts
expect(hoyBogota(new Date('2026-10-18T04:59:00Z'))).toBe('2026-10-17');
expect(hoyBogota(new Date('2026-10-18T05:00:00Z'))).toBe('2026-10-18');
expect(sumarMeses('2026-08-31', 6)).toBe('2027-02-28');
expect(sumarMeses('2027-08-31', 6)).toBe('2028-02-29');
expect(topeCierre('2026-10-17')).toBe('2027-04-17');
expect(cierreValido('2027-04-17', '2026-10-17')).toBe(true);
expect(cierreValido('2027-04-18', '2026-10-17')).toBe(false);
expect(cierreValido('2026-10-16', '2026-10-17')).toBe(false);
expect(cierreValido('2026-10-17', '2026-10-17')).toBe(true);
expect(porCerrar('2026-11-01', '2026-10-17')).toBe(true);   // 15 días
expect(porCerrar('2026-11-02', '2026-10-17')).toBe(false);
expect(validarUrlOficial('https://www.unicef.org/colombia/donar')).toEqual({ dominio: 'unicef.org' });
for (const mala of ['http://unicef.org', 'javascript:alert(1)', 'https://u:c@unicef.org', 'https://localhost/x', 'no es url'])
  expect(validarUrlOficial(mala)).toBeNull();
expect(mismoDominio('https://donar.unicef.org/x', 'https://www.unicef.org')).toBe(true);
expect(mismoDominio('https://unicef-donar.co', 'https://www.unicef.org')).toBe(false);
```

- [ ] **Step 2:** `bun run --filter @acopio/shared test` (o `bunx vitest run src/causas.test.ts`
  en `packages/shared`). Esperado: falla, el módulo no existe.
- [ ] **Step 3:** Implementar en `causas.ts`. `hoyBogota` resta 5 horas y toma la fecha ISO;
  `sumarMeses` trabaja con año, mes y día enteros y recorta el día al último del mes destino.
  Sin dependencias nuevas.
- [ ] **Step 4:** Esperado: pasa.
- [ ] **Step 5:** Commit junto con la tarea 3.

### Task 3: Esquema y migración

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261018120000_pieza_c_causas/migration.sql`
- Test: `apps/api/src/pruebas-integracion/causas.int.test.ts` (se crea aquí y crece en las
  tareas 4 a 6)

**Interfaces:**
- Produces: modelos `Causa`, enums `CategoriaCausa` (`PERSONAS`, `ANIMALES`, `ADULTOS_MAYORES`,
  `RESCATISTAS`) y `MotivoArchivo` (`VENCIDA`, `MANUAL`, `ENTIDAD_SIN_VERIFICAR`); columnas de
  `Entidad`: `verificada_por String? @db.Uuid`, `verificada_en DateTime? @db.Timestamptz`,
  `logo_key String?`, relación `causas Causa[]`. Columnas de `causa` exactamente como en §4 de la
  especificación, con `@@map("causa")`, `@@index([archivada_en, publicada_en(sort: Desc)])`.

- [ ] **Step 1: Prueba que falla** en `causas.int.test.ts`:
  `acopio_app no borra causas` (con un `Client` de `pg` sobre `URL_APP_PRUEBAS`, como en
  `base.int.test.ts`, `DELETE FROM causa` y `TRUNCATE causa` fallan con `permission denied`), y
  `el CHECK de verificación` (un `UPDATE entidad SET verificacion='VERIFICADA'` sin
  `verificada_en`, como `acopio_owner`, falla).
- [ ] **Step 2:** Correr la suite. Esperado: falla, la tabla no existe.
- [ ] **Step 3:** Editar `schema.prisma`, generar la migración con
  `bun run --filter @acopio/api prisma migrate dev --create-only --name pieza_c_causas`,
  renombrar la carpeta a `20261018120000_pieza_c_causas` y agregar a mano al final del SQL los
  dos `CHECK` de la especificación y
  `REVOKE DELETE, TRUNCATE ON "causa" FROM acopio_app;`.
- [ ] **Step 4:** `bun run --filter @acopio/api db:migrar` y la suite. Esperado: pasa.
- [ ] **Step 5:** Commit `Pieza C: reglas de causas y esquema`.

### Task 4: Verificación y logotipo

**Files:**
- Modify: `apps/api/src/modulos/acopios/entidades.service.ts`, `entidades.controller.ts`,
  `dao/entidad.dao.ts`, `apps/api/src/comun/respuestas.ts` (`EntidadDto`)
- Create: `apps/api/src/modulos/acopios/logos.controller.ts` (público)
- Test: `causas.int.test.ts`

**Interfaces:**
- Consumes: `procesarImagen`, `ALMACEN`, `RELOJ` para `verificada_en`.
- Produces:
  - `EntidadesService.verificar(admin, id, confirmo: boolean)`,
    `quitarVerificacion(admin, id): Promise<{ archivadas: number }>`,
    `subirLogo(admin, id, datos: Buffer)`, `quitarLogo(admin, id)`,
    `leerLogo(id): Promise<{ datos: Buffer; tipo: string }>`
  - `presentarEntidad` suma `verificadaEn: string | null`, `tieneLogo: boolean`,
    `causasActivas: number` (este último solo en `listar`)
  - Rutas `POST /entidades/:id/verificar`, `POST /entidades/:id/quitar-verificacion`,
    `PUT|DELETE /entidades/:id/logo` (Administrador) y `GET /entidades/:id/logo` (`@Publico()`,
    `Cache-Control: public, max-age=300`)
  - Claves de bitácora: `entidad.verificada`, `entidad.verificacion_quitada`,
    `entidad.logo_cambiado`; `causa.archivada` por cada causa archivada al quitar

- [ ] **Step 1: Pruebas que fallan:** verificar sin `confirmo` da 422
  `CONFIRMACION_REQUERIDA`; una entidad sin `sitioWeb` da 422 `ENTIDAD_SIN_SITIO`; verificar
  deja `verificacion: 'VERIFICADA'` y `verificadaEn` con la fecha de hoy, y una fila de bitácora
  `entidad.verificada` con `confirmo: true` en `despues`; quitar la verificación de una entidad
  con dos causas activas (insertadas con `a.prisma` en este paso) responde `{ archivadas: 2 }` y
  las dos quedan con `archivo_motivo = 'ENTIDAD_SIN_VERIFICAR'`; subir un JPEG como logotipo y
  leerlo sin sesión devuelve `image/webp`; un Operador recibe 403 al verificar.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar. La clave del logotipo es `entidades/<id>/logo.webp` y guarda la
  miniatura de `procesarImagen`. El controlador público va aparte porque `EntidadesController`
  lleva `@Roles('ADMIN')` en la clase.
- [ ] **Step 4:** Esperado: pasan, y las suites de la tarea 1 siguen en verde.
- [ ] **Step 5:** Commit con la tarea 6.

### Task 5: Gestión de causas

**Files:**
- Create: `apps/api/src/modulos/acopios/causas.service.ts`, `causas.controller.ts`,
  `dao/causa.dao.ts`
- Modify: `acopios.module.ts`, `apps/api/src/comun/respuestas.ts` (`CausaGestionDto`)
- Test: `causas.int.test.ts`

**Interfaces:**
- Consumes: tarea 2 completa, `EntidadDao`, `RELOJ` (ya existe en `geocodificacion.ts`;
  `reloj.ahora()` devuelve milisegundos) para la hora actual, `BitacoraService`, `Transacciones`.
- Modify también: `apps/api/test/app-prueba.ts`: `crearAppPrueba({ ahora?: number })` reemplaza
  `RELOJ` por `{ ahora: () => ahora, esperar: relojReal.esperar }`. La suite de causas usa
  `ahora: Date.parse('2026-10-17T15:00:00Z')`, así «hoy» es `2026-10-17`.
- Produces:
  - `DatosCausa = { entidadId, categoria, titulo, descripcion, pasos: string[], urlOficial, cierraEl }`
  - `CausasService.crear(admin, datos, confirmo)`, `editar(admin, id, cambios)`,
    `renovar(admin, id, cierraEl, confirmo)`, `archivar(admin, id)`,
    `reactivar(admin, id, cierraEl, confirmo)`, `subirImagen(admin, id, datos)`,
    `quitarImagen(admin, id)`, `listarGestion(estado: 'activas' | 'por-cerrar' | 'atendidas')`
  - `CausaGestionDto`: los campos públicos (tarea 6) más `estado: 'ACTIVA' | 'ATENDIDA'`,
    `porCerrar: boolean`, `dominioDistinto: boolean`, `motivo`, `creadaPor`
  - Rutas de §5 «Administrador» de la especificación, todas con `@Roles('ADMIN')`
  - Validación zod: `titulo` 5 a 120, `descripcion` 20 a 2000, `pasos` 1 a 10 de 3 a 300,
    `urlOficial` máximo 500, `cierraEl` `AAAA-MM-DD`, `categoria` en `CATEGORIAS_CAUSA`
  - Claves de bitácora: `causa.creada`, `causa.editada`, `causa.renovada`, `causa.archivada`,
    `causa.reactivada`, `causa.imagen_cambiada`

- [ ] **Step 1: Pruebas que fallan** (con `crearAppPrueba({ ahora })`, hoy es `2026-10-17`):
  crear con entidad sin verificar da 409; sin `confirmo` da 422; con `urlOficial`
  `https://u:c@sitio.org` da 422 `URL_NO_SEGURA`; con `cierraEl: '2027-04-18'` da 422 y con
  `'2027-04-17'` da 201; con categoría `PERSONAS_DESAPARECIDAS` da 400; renovar con
  `'2026-10-16'` da 422; editar una atendida da 409 `CAUSA_ATENDIDA`; renovar mueve
  `publicada_en` y editar el título no; reactivar una atendida cuya entidad ya no está
  verificada da 409; `listarGestion('por-cerrar')` incluye una causa con cierre `2026-11-01` y
  no una con `2026-11-02`; un enlace a otro dominio que el sitio de la entidad trae
  `dominioDistinto: true`; cada operación deja su fila de bitácora.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar. El servicio revisa la entidad `VERIFICADA` dentro de la
  transacción; las fechas salen de `hoyBogota(reloj.ahora())`. La imagen va a
  `causas/<id>.webp` con la imagen grande de `procesarImagen`. `actualizado_en` cambia en cada
  escritura.
- [ ] **Step 4:** Esperado: pasan.
- [ ] **Step 5:** Commit con la tarea 6.

### Task 6: Rutas públicas y tarea diaria

**Files:**
- Create: `apps/api/src/modulos/acopios/causas-publicas.controller.ts`
- Modify: `causas.service.ts`, `dao/causa.dao.ts`, `respuestas.ts` (`CausaPublicaDto`),
  `docs/02-arquitectura/vista-general.md` (fila de la tarea diaria: «Archivar causas vencidas»)
- Test: `causas.int.test.ts`

**Interfaces:**
- Produces:
  - `CausaPublicaDto = { id, categoria, titulo, descripcion, pasos, urlOficial: string | null,
    dominio: string | null, tieneImagen, actualizadoEn, publicadaEn, cierraEl,
    cerroEl: string | null, motivo: MotivoArchivo | null,
    entidad: { id, nombre, tieneLogo, verificadaEn: string | null } }`
  - `GET /causas?categoria=`, `GET /causas/atendidas?categoria=`, `GET /causas/:id`,
    `GET /causas/:id/imagen`, todas `@Publico()`
  - `CausasService.archivarVencidas(): Promise<number>` con
    `@Cron('10 0 * * *', { name: 'archivar-causas', timeZone: 'America/Bogota' })`, sin
    registrarse con `NODE_ENV=test`

- [ ] **Step 1: Pruebas que fallan:** una causa insertada con `a.prisma` con `cierra_el` de ayer
  y sin `archivada_en` no sale en `GET /causas`, sí sale en `/causas/atendidas` con `cerroEl` de
  hoy, y `archivarVencidas()` la marca `VENCIDA`; `GET /causas` ordena por `publicada_en`
  descendente (dos causas de la prueba, comparando su posición relativa); la ficha de una causa
  cuya entidad perdió la verificación trae `urlOficial: null` y `entidad.verificadaEn: null`; el
  JSON de las rutas públicas no contiene `creadaPor` ni `archivadaPor`; un id inexistente da 404.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar. Activa = sin `archivada_en`, `cierra_el >= hoy` y entidad
  `VERIFICADA`; atendida = lo demás. `cerroEl` según §4 de la especificación.
- [ ] **Step 4:** `bun run test:int` completo. Esperado: todo en verde.
- [ ] **Step 5:** Commit `Pieza C: API de verificación y causas`.

### Task 7: Contrato y cliente web

**Files:**
- Modify: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts` (generados)
- Create: `apps/web/src/api/causas.ts`, `apps/web/src/api/causas.test.tsx`

**Interfaces:**
- Produces: tipos `CausaPublica`, `CausaGestion`, `CategoriaCausa`; hooks `useCausas(categoria?)`,
  `useCausasAtendidas(categoria?)`, `useCausa(id)`, `useCausasGestion(estado)`,
  `useCrearCausa()`, `useEditarCausa(id)`, `useRenovarCausa(id)`, `useArchivarCausa(id)`,
  `useReactivarCausa(id)`, `useSubirImagenCausa(id)`, `useVerificarEntidad(id)`,
  `useQuitarVerificacion(id)`, `useSubirLogo(id)`; `urlImagenCausa(c)` y `urlLogo(entidad)` con
  `?v=` de `actualizadoEn`. Claves de consulta bajo `['causas', …]` y `['entidades']`.

- [ ] **Step 1:** `bun run --filter @acopio/api openapi && bun run --filter @acopio/web api:tipos`.
- [ ] **Step 2: Prueba que falla** en `causas.test.tsx`: con `responderSegun({ 'GET /api/causas': [...] })`
  `useCausas()` devuelve la lista; `useCausas('ANIMALES')` pide `?categoria=ANIMALES`.
- [ ] **Step 3:** Implementar `causas.ts` con el patrón de `api/red.ts`.
- [ ] **Step 4:** `bun run typecheck && bun run --filter @acopio/web test`. Esperado: pasa.
- [ ] **Step 5:** Commit `Pieza C: contrato y cliente de causas`.

### Task 8: Público: P3, atendidas y P4

**Files:**
- Create: `apps/web/src/portal/causas/Directorio.tsx`, `Atendidas.tsx`, `Ficha.tsx`,
  `TarjetaCausa.tsx`, `Desaparecidas.tsx`, `HojaSalida.tsx`, y sus `*.test.tsx`
- Modify: `apps/web/src/rutas.tsx` (quitar `'causas'` de `SIN_CONSTRUIR`; rutas `/causas`,
  `/causas/atendidas`, `/causas/:id` con `lazy`), `apps/web/vite.config.ts` (`'/causas/'` en
  `PRECARGAS`), `apps/web/index.html` vía `node scripts/iconos.mjs`
- Referencia: la [maqueta aprobada](../03-diseno/stitch/P03-causas/maqueta.html), con la nota
  «Verificada por el equipo de Acopio»

**Interfaces:**
- Consumes: hooks de la tarea 7, `ENLACES_DESAPARECIDOS` y `CATEGORIAS_CAUSA` de la tarea 2.

- [ ] **Step 1: Pruebas que fallan:** P3 con dos causas muestra «Verificada el 12 de agosto de
  2026» (con `verificadaEn: '2026-08-12T15:00:00Z'`) y el aviso «Acopio no recibe dinero»; el
  chip «Personas desaparecidas» muestra solo los tres enlaces y ninguna tarjeta; P3 sin causas
  muestra «Aún no hay causas»; P4 al tocar «Ir al sitio oficial» abre la hoja con el dominio y
  «Continuar al sitio» es un `<a target="_blank" rel="noopener noreferrer">` con la URL; P4 de
  una atendida con `urlOficial: null` no tiene ningún enlace al sitio y muestra «Esta entidad ya
  no está verificada por Acopio»; P4 de una atendida verificada muestra «Cerró el…» y el enlace
  como botón secundario.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar con los componentes base y los tokens.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/portal/causas src/iconos.test.ts`, y
  `bash scripts/revisar-colores.sh`. Esperado: pasan.
- [ ] **Step 5:** Commit `Pieza C: directorio, atendidas y ficha de causa`.

### Task 9: Maquetas de C22 y C15

**Files:**
- Create: `docs/03-diseno/stitch/C22-causas/` (captura, HTML, `maqueta.html`, `README.md`)
- Modify: `docs/03-diseno/stitch/C15-entidades/` (captura y nota de los cambios),
  `docs/03-diseno/stitch/README.md`

- [ ] **Step 1:** Generar en Stitch (proyecto `10306891818878200068`, tema
  `assets/3694704229522762996`, modelo `GEMINI_3_5_FLASH_LITE`, una pantalla por llamada):
  C22 lista con pestañas, C22 formulario con pasos reordenables, la confirmación corta al
  publicar y C15 con el aviso de verificación y su casilla.
- [ ] **Step 2:** Armar la maqueta con los tokens y publicarla.
- [ ] **Step 3:** Joseph la aprueba. Sin esa aprobación no empiezan las tareas 10 y 11.
- [ ] **Step 4:** Commit `Diseño: maquetas de C22 y C15`.

### Task 10: C15 con verificación y logotipo

**Files:**
- Modify: `apps/web/src/consola/red/Entidades.tsx`, `Entidades.test.tsx`

- [ ] **Step 1: Pruebas que fallan:** la fila de una verificada muestra el sello con fecha; en
  la hoja, «Verificar» abre el aviso con el texto de §6 de la especificación y el botón queda
  inactivo hasta marcar «Confirmo que revisé la entidad y su sitio oficial»; al confirmar se
  envía `{ confirmo: true }`; «Quitar verificación» dice cuántas causas activas pasan a
  atendidas (de `causasActivas`); una entidad sin sitio web muestra «Agrega el sitio web para
  poder verificarla» en lugar del botón.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta de la tarea 9.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/consola/red/Entidades.test.tsx`. Esperado: pasa.
- [ ] **Step 5:** Commit con la tarea 11.

### Task 11: C22 Causas

**Files:**
- Create: `apps/web/src/consola/causas/Causas.tsx`, `FormularioCausa.tsx`, `EditorPasos.tsx`,
  `ConfirmarPublicacion.tsx`, y sus `*.test.tsx`
- Modify: `apps/web/src/rutas.tsx` (`/consola/causas` con `RequiereRol roles={['ADMIN']}`),
  `apps/web/src/portal/Mas.tsx` (fila «Causas» para el Administrador),
  `docs/02-arquitectura/patrones-y-practicas.md` (si `EditorPasos` queda reutilizable)

- [ ] **Step 1: Pruebas que fallan:** las pestañas piden `?estado=activas|por-cerrar|atendidas`;
  el selector de entidad solo lista verificadas; no aparece la categoría de personas
  desaparecidas; agregar, quitar y subir un paso cambia el orden enviado; la fecha de cierre no
  acepta más allá de `topeCierre(hoy)`; publicar abre la confirmación con la entidad y el
  dominio, y con `dominioDistinto` muestra «Ojo: el sitio de la entidad es …»; renovar y
  reactivar también confirman; un 409 `ENTIDAD_SIN_VERIFICAR` se muestra como mensaje.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta de la tarea 9.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/consola/causas src/portal/Mas.test.tsx src/rutas.test.tsx`.
  Esperado: pasan.
- [ ] **Step 5:** Commit `Pieza C: consola de entidades y causas`.

### Task 12: Demo, recorridos y cierre

**Files:**
- Modify: `apps/api/src/seed/demo.ts`
- Create: `apps/web/recorridos/portal-causas.mjs`, `apps/web/recorridos/consola-causas.mjs`
- Modify: `docs/06-operacion/recorridos.md`, este plan (tabla de estado), la especificación
  (§11 «Cambios al construir»), `docs/05-planes/README.md`, informe de sesión

- [ ] **Step 1:** `seed:demo` crea, si no existen, Cruz Roja Colombiana
  (`https://www.cruzrojacolombiana.org`) y UNICEF Colombia (`https://www.unicef.org/colombia`)
  verificadas por la cuenta de Joseph, tres causas activas con títulos terminados en «(demo)»,
  categorías distintas y cierres a 1, 2 y 4 meses, y una atendida `VENCIDA`. Los enlaces van a la
  página general de donaciones de cada organización. Correrlo dos veces no duplica nada.
- [ ] **Step 2:** `portal-causas.mjs` (P3, chip de desaparecidas, ficha, hoja de salida,
  atendidas) y `consola-causas.mjs` (verificar con el aviso, crear, renovar, archivar, quitar la
  verificación y comprobar en P4 que el enlace desaparece), con capturas en las carpetas de
  diseño.
- [ ] **Step 3:** Verificación completa:
  `bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bun run test && bun run test:int && bash scripts/revisar-colores.sh`.
  Esperado: código de salida 0.
- [ ] **Step 4:** Los dos recorridos contra el Compose (`bun run servicios:todo`) y, tras
  desplegar, contra el servidor de pruebas.
- [ ] **Step 5:** Criterios de HU-02 y HU-15 (§9 de la especificación) uno por uno con Joseph.
- [ ] **Step 6:** Commit `Pieza C: demo, recorridos y cierre`, PR, CI y fusión.
