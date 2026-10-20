---
title: "Presentaciones, códigos de barras y unidades · plan"
type: plan
tags: [plan, catalogo, inventario, comprobantes, api, web]
estado: vigente
actualizado: 2026-10-20
---

# Presentaciones, códigos de barras y unidades · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** cada código de barras apunta a una presentación genérica de su categoría (suelta o
paquete), el Administrador agrega, busca, corrige y aprueba códigos desde C18, los Donadores
proponen y los Operadores validan, y todo campo de cantidad admite g o ml sin cambiar la unidad
base.

**Arquitectura:** `catalogo` gana la tabla `presentacion` y el estado del código (`PROPUESTO` o
`VALIDADO`, más `por_revisar`). Las reglas puras (conversión de unidades, tamaño de un paquete,
topes) viven en `packages/shared` y las usan la API y la web. `comprobantes` llama a servicios de
`catalogo` dentro de su propia transacción para que el Donador proponga y para que la recepción
valide o marque para revisar; esa dependencia ya está permitida. La web convierte a la unidad base
antes de mandar cualquier cantidad, y la API, el saldo y el motor no cambian.

**Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16, zod con `crearDto`; React 19, TanStack Query 5,
Tailwind 4 con `packages/ui-tokens`, Vitest con `responderSegun`, Playwright para los recorridos.

**Spec:** [2026-10-20-presentaciones-codigos-design.md](../superpowers/specs/2026-10-20-presentaciones-codigos-design.md)

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Esquema, migración, ADR y pendiente | ✅ | |
| 2 Reglas puras en `shared` | ✅ | |
| 3 Topes en la API | ✅ | |
| 4 API de presentaciones | ✅ | |
| 5 API de códigos | ✅ | |
| 6 El Donador propone | ✅ | |
| 7 La recepción valida o marca | ✅ | |
| 8 Contrato, tipos y demo | ✅ | |
| 9 Maquetas en Stitch | ✅ | |
| 10 Selector de unidades en la web | ✅ | |
| 11 Código nuevo y presentaciones en la web | ✅ | |
| 12 C18 Códigos | ✅ | |
| 13 Recepción en la web | ✅ | |
| 14 Recorridos, despliegue y cierre | 🟡 | Falta: desplegar y migrar el servidor, y el PR, después del 23 |

Las tareas 5 y siguientes no borran códigos ni dan el 422 `PRESENTACION_DE_OTRA_CATEGORIA`; el texto de las tareas conserva esas líneas y vale lo de «Cambios al construir» del [diseño](../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

Joseph pidió ejecutarla antes de la sustentación del 23, en la rama `presentaciones` y sin PR. El despliegue y el PR esperan hasta después del 23, para no mover la demo antes.

## Global Constraints

- Node 22, Bun 1.3, TypeScript 6.0, NestJS 11, Prisma 7.10. No se suben versiones ni entran
  dependencias nuevas.
- Español en código, rutas y textos; términos de `docs/00-contexto/glosario.md`.
- La unidad base no cambia: `UnidadBase` sigue siendo `LITRO`, `KILOGRAMO` o `UNIDAD`, y todo lo
  que se guarda va en esa unidad.
- Topes (aprobados por Joseph): una presentación, suelta o paquete en total, llega hasta 50 kg o
  50 L, o 1.000 en unidades; una línea (entrada, salida, conteo, remisión, donación o recepción)
  llega hasta 10.000 en unidad base. Se revisan en la web y en la API.
- Códigos de 8, 12, 13 o 14 dígitos, como hoy (`/^(\d{8}|\d{12,14})$/`).
- Errores nuevos con `ErrorDominio(codigo, mensaje, estado)`: `PRESENTACION_NO_ENCONTRADA` 404,
  `PRESENTACION_DUPLICADA` 409 (nombre repetido en la categoría), `PRESENTACION_DE_OTRA_CATEGORIA`
  422, `PAQUETE_INVALIDO` 422 (contiene un paquete o una presentación de otra categoría),
  `TAMANO_FUERA_DE_TOPE` 422, `CANTIDAD_FUERA_DE_TOPE` 422, `CODIGO_YA_VALIDADO` 409,
  `LINEA_SIN_CODIGO` 422. Siguen `EAN_YA_ASOCIADO` 409, `EAN_DESCONOCIDO` 404 y
  `CATEGORIA_NO_ENCONTRADA` 404.
- Toda escritura deja su fila en la bitácora en la misma transacción, con antes y después.
  Acciones nuevas: `presentacion.creada`, `presentacion.editada`, `codigo_barras.propuesto`,
  `codigo_barras.validado`, `codigo_barras.marcado`, `codigo_barras.borrado`,
  `comprobante.linea_corregida`.
- DAO con la `tx` de quien llama (ADR-0019). `catalogo` y `comprobantes` están en
  `MIGRADOS_A_DAO`: solo los DAO inyectan `PrismaService`.
- Base de pruebas compartida entre suites (`acopio_test`): ninguna prueba cuenta totales de
  `presentacion` ni de `codigo_barras`. Cada prueba crea su categoría con `unico()` y sus EAN con
  un sufijo propio, y busca sus filas por id o por EAN.
- Si cambia un endpoint, se regeneran `openapi` y `api:tipos` y se versionan los dos.
- Ninguna pantalla se programa sin su maqueta aprobada por Joseph en Stitch (tarea 9). En
  `apps/web` no hay hexadecimales; los íconos nuevos se registran con `node scripts/iconos.mjs`.
- Toda pieza reutilizable nueva (por ejemplo el selector de unidades) se anota en el catálogo de
  `docs/02-arquitectura/patrones-y-practicas.md`.

## Review Focus

- Un Operador escribe «0,5» con «g» en una categoría en kg: son 0,0005 kg, que no caben en tres
  decimales. La pantalla avisa y no manda nada; no redondea a 0,001 ni a 0. Prueba en la tarea 2
  (`aUnidadBase`) y en la 10.
- El Administrador cambia la botella suelta de 600 ml a 5 L y un paquete x12 que la contiene
  pasaría a 60 L: responde 422 `TAMANO_FUERA_DE_TOPE` y no cambia ni la suelta ni el paquete.
  Prueba en la tarea 4.
- En la recepción, el Operador corrige una línea cuyo código ya estaba validado: el código queda
  igual con `por_revisar = true`, la línea cambia de categoría y de `contenido_unitario`, y la
  entrada al saldo va a la categoría corregida. Prueba en la tarea 7.
- Un Operador escanea en la entrada rápida un código que propuso un Donador: no puede registrar
  cantidad hasta confirmarlo o corregirlo. Prueba en la tarea 11.
- Dos Donadores escanean el mismo EAN nuevo: el segundo ve la propuesta del primero marcada «sin
  confirmar» y la usa; no recibe 409 ni crea otra presentación. Prueba en la tarea 6.

---

### Task 1: Esquema, migración, ADR y pendiente

**Files:**
- Modify: `prisma/schema.prisma` (modelos `CodigoBarras` y `Categoria`, modelo y enum nuevos)
- Create: `prisma/migrations/20261024100000_presentaciones/migration.sql`
- Modify: `docs/02-arquitectura/modelo-datos.md` (`presentacion` y el cambio de `codigo_barras`)
- Create: `docs/02-arquitectura/adr/ADR-0021-presentaciones-y-estado-del-codigo.md`, y su fila en
  el README de la carpeta

**Interfaces:**
- Produces:
  - `enum EstadoCatalogo { PROPUESTO VALIDADO }`.
  - `model Presentacion` (tabla `presentacion`): `id` uuid, `categoria_id` uuid (relación con
    `Categoria`), `nombre String @db.Citext`, `tamano Decimal? @db.Decimal(12, 3)`,
    `contiene_id String? @db.Uuid` (relación consigo misma), `unidades Int?`,
    `estado EstadoCatalogo`, `creado_por String @db.Uuid`, `creado_en DateTime @default(now())
    @db.Timestamptz`, `@@unique([categoria_id, nombre])`, `@@index([contiene_id])`.
  - En `CodigoBarras`: salen `contenido`, `descripcion` y `revisado`; entran
    `presentacion_id String? @db.Uuid` (relación), `estado EstadoCatalogo @default(VALIDADO)`,
    `por_revisar Boolean @default(false)`, `@@index([presentacion_id])`. `categoria_id` se queda.

- [ ] **Step 1:** Escribir el esquema y la migración a mano. El `CHECK` `presentacion_clase`:
  `(tamano IS NOT NULL AND tamano > 0 AND contiene_id IS NULL AND unidades IS NULL) OR
  (tamano IS NULL AND contiene_id IS NOT NULL AND unidades BETWEEN 2 AND 1000)`. Sale el `CHECK`
  `codigo_barras_contenido_positivo` junto con la columna. Los permisos de `acopio_app` llegan
  por `ALTER DEFAULT PRIVILEGES` de la migración inicial.
- [ ] **Step 2:** En la misma migración, los datos, antes de borrar las columnas: una suelta
  `VALIDADO` por cada par distinto (`categoria_id`, `contenido`) de los códigos con contenido.
  El nombre es `categoria.nombre || ' ' || trim_scale(contenido) || ' ' || símbolo`, con `kg`,
  `L` o `und.`, y `creado_por` es el autor del código más viejo del par. Cada código apunta a la
  suya. Los códigos sin contenido quedan con `presentacion_id` nulo y `por_revisar = true`, y
  todos los códigos quedan `VALIDADO`.
- [ ] **Step 3:** `bun run --filter @acopio/api db:migrar` contra el Compose con la demo cargada.
  Esperado: `4006381333931` apunta a una suelta de tamaño 1, y `7501031311309` queda sin
  presentación y con `por_revisar = true`. `bun run typecheck` falla solo en `codigos-barras.*`,
  `donaciones.service.ts` y `seed/demo.ts`; eso lo arreglan las tareas 4 a 8.
- [ ] **Step 4:** El ADR-0021 (por qué la presentación es una entidad, por qué el tamaño del
  paquete se calcula y por qué el estado vive en el código) y la sección del modelo de datos.
- [ ] **Step 5:** Commit `Catálogo: esquema de presentaciones y estado del código (P-081)`, junto
  con la tarea 4 si los tipos no compilan antes.

### Task 2: Reglas puras en `shared`

**Files:**
- Create: `packages/shared/src/presentaciones.ts`, `packages/shared/src/presentaciones.test.ts`
- Modify: `packages/shared/src/index.ts` (`export * from './presentaciones.js'`)

**Interfaces:**
- Produces:
  - `TOPES: { presentacion: Record<UnidadBase, number>; linea: number }` con
    `{ presentacion: { KILOGRAMO: 50, LITRO: 50, UNIDAD: 1000 }, linea: 10_000 }`.
  - `UNIDADES_DE_ENTRADA: Record<UnidadBase, { simbolo: string; factor: number }[]>`:
    `KILOGRAMO: [{ simbolo: 'kg', factor: 1 }, { simbolo: 'g', factor: 0.001 }]`,
    `LITRO: [{ simbolo: 'L', factor: 1 }, { simbolo: 'ml', factor: 0.001 }]`,
    `UNIDAD: [{ simbolo: 'und.', factor: 1 }]`.
  - `aUnidadBase(valor: number, factor: number): number | null`: el valor en unidad base
    redondeado a milésimas, o `null` si necesita más de tres decimales.
  - `tamanoDePresentacion(p: { tamano: number | null; unidades: number | null; contiene: { tamano: number } | null }): number`.
  - `errorDeTamano(tamano: number, unidad: UnidadBase): string | null` y
    `errorDeLinea(cantidadBase: number): string | null`. Los mensajes son
    `'Una presentación llega hasta 50 kg'` (`50 L`, `1.000 und.` según la unidad) y
    `'Una línea llega hasta 10.000'` seguido del símbolo.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
it.each([
  [500, 0.001, 0.5],
  [600, 0.001, 0.6],
  [1.5, 1, 1.5],
  [0.5, 0.001, null], // 0,0005 kg no cabe en tres decimales
  [1, 0.001, 0.001],
])('aUnidadBase(%s, %s) → %s', (v, f, esperado) => expect(aUnidadBase(v, f)).toBe(esperado));

it('el tamaño de un paquete es unidades × la suelta de adentro', () => {
  expect(tamanoDePresentacion({ tamano: null, unidades: 12, contiene: { tamano: 0.6 } })).toBe(7.2);
  expect(tamanoDePresentacion({ tamano: 0.5, unidades: null, contiene: null })).toBe(0.5);
});

it('los topes cortan justo después del límite', () => {
  expect(errorDeTamano(50, 'LITRO')).toBeNull();
  expect(errorDeTamano(50.001, 'LITRO')).toBe('Una presentación llega hasta 50 L');
  expect(errorDeTamano(1000, 'UNIDAD')).toBeNull();
  expect(errorDeLinea(10_000)).toBeNull();
  expect(errorDeLinea(10_000.001)).not.toBeNull();
});
```

- [ ] **Step 2:** `cd packages/shared && bunx jest src/presentaciones.test.ts`. Esperado: FAIL,
  el módulo no existe.
- [ ] **Step 3:** Implementar en `presentaciones.ts`. Redondear como
  `apps/api/src/comun/validacion/cantidades.ts` (milésimas con tolerancia de punto flotante), y
  redondear el producto de `tamanoDePresentacion` a milésimas: 12 × 0,6 da 7,199999… en binario.
- [ ] **Step 4:** La misma prueba. Esperado: PASS.
- [ ] **Step 5:** Commit `Shared: unidades de entrada, tamaño de presentación y topes`.

### Task 3: Topes en la API

**Files:**
- Modify: `apps/api/src/comun/validacion/cantidades.ts` (`cantidadDeLinea`)
- Modify: `apps/api/src/modulos/inventario/movimientos.controller.ts` (`cantidad` y
  `cantidadContada`), `apps/api/src/modulos/motor/remisiones.controller.ts`,
  `apps/api/src/modulos/motor/sugerencias.controller.ts`
- Test: `apps/api/src/comun/validacion/cantidades.test.ts`,
  `apps/api/src/pruebas-integracion/movimientos.int.test.ts` (un caso)

**Interfaces:**
- Consumes: `TOPES` (tarea 2).
- Produces: `cantidadDeLinea` (como `cantidadPositiva`, hasta `TOPES.linea`) y
  `cantidadContadaDeLinea` (como `cantidadNoNegativa`, hasta `TOPES.linea`).

- [ ] **Step 1:** Pruebas: `cantidadDeLinea.safeParse(10_000).success` es `true`,
  `safeParse(10_000.001).success` es `false`, y un `POST /api/acopios/:id/entradas` con
  `cantidad: 10001` responde 400.
- [ ] **Step 2:** Correrlas. Esperado: FAIL.
- [ ] **Step 3:** Definir los dos esquemas y usarlos en entrada, salida, ajuste, líneas de
  remisión y aprobación de sugerencia. Umbrales, necesidad y configuración del motor no cambian.
- [ ] **Step 4:** `bunx jest src/comun/validacion` y la suite de movimientos con
  `jest.int.config.cjs`. Esperado: PASS.
- [ ] **Step 5:** Commit `API: tope de 10.000 por línea`.

### Task 4: API de presentaciones

**Files:**
- Create: `apps/api/src/modulos/catalogo/dao/presentacion.dao.ts`,
  `apps/api/src/modulos/catalogo/presentaciones.service.ts`,
  `apps/api/src/modulos/catalogo/presentaciones.controller.ts`
- Modify: `apps/api/src/modulos/catalogo/catalogo.module.ts` (registra y exporta
  `PresentacionesService`), `apps/api/src/comun/respuestas.ts` (`PresentacionDto`)
- Test: `apps/api/src/pruebas-integracion/presentaciones.int.test.ts`

**Interfaces:**
- Consumes: `tamanoDePresentacion`, `errorDeTamano` (tarea 2).
- Produces:
  - `PresentacionDto`: `{ id, categoriaId, categoria, unidad, nombre, clase: 'SUELTA' | 'PAQUETE',
    tamano: number, contieneId: string | null, unidades: number | null,
    estado: 'PROPUESTO' | 'VALIDADO', codigos: number }`. `tamano` va en unidad base y, en un
    paquete, es el calculado.
  - `GET /api/presentaciones?categoriaId=` (ADMIN, OPERADOR, DONADOR): las `VALIDADO` de la
    categoría, más las `PROPUESTO` del propio usuario si es Donador; el Administrador y el
    Operador ven también todas las propuestas.
  - `POST /api/presentaciones` (ADMIN, OPERADOR) con `{ categoriaId, nombre, tamano }` o
    `{ categoriaId, nombre, contieneId, unidades }`. Queda `VALIDADO`.
  - `PATCH /api/presentaciones/:id` (ADMIN) con `{ nombre?, tamano?, contieneId?, unidades?,
    estado?: 'VALIDADO' }`.
  - `PresentacionesService.crearEnTransaccion(tx, usuario, datos, estado: EstadoCatalogo)`, que
    usan las tareas 5 y 6.

- [ ] **Step 1:** Pruebas de integración que fallan, con una categoría `unico('Agua P ')` en
  `LITRO`:
  - Una suelta de 0,6 L y un paquete de 12 que la contiene: el `GET` devuelve el paquete con
    `tamano: 7.2` y `clase: 'PAQUETE'`.
  - Otra suelta llamada igual pero con otras mayúsculas: 409 `PRESENTACION_DUPLICADA`.
  - Un paquete que contiene otro paquete: 422 `PAQUETE_INVALIDO`.
  - Una suelta de 50,001 L: 422 `TAMANO_FUERA_DE_TOPE`.
  - Cambiar la suelta de 0,6 a 5 L deja el paquete en 60 L: 422 `TAMANO_FUERA_DE_TOPE`, y las dos
    filas siguen como estaban.
  - Cambiar la suelta de 0,6 a 0,5 L: el paquete pasa a 6 L, y la fila `presentacion.editada` de
    la bitácora nombra el id del paquete en `despues.paquetesAfectados`.
  - Una suelta de 2,5 en una categoría `UNIDAD`: 422 (`CONTENIDO_FRACCIONARIO`, que ya existe).
- [ ] **Step 2:** `bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/presentaciones.int.test.ts`.
  Esperado: FAIL.
- [ ] **Step 3:** Implementar el DAO (un método por consulta: `listarDeCategoria`, `buscar`,
  `crear`, `actualizar`, `paquetesQueContienen`), el servicio y el controlador. El servicio
  convierte la violación de unicidad en `PRESENTACION_DUPLICADA`, como hace
  `CodigosBarrasService.asociar` con `esLlaveDuplicada`.
- [ ] **Step 4:** La misma suite. Esperado: PASS. Después, `bun run --filter @acopio/api depcruise`.
- [ ] **Step 5:** Commit `Catálogo: presentaciones sueltas y paquetes`.

### Task 5: API de códigos

**Files:**
- Modify: `apps/api/src/modulos/catalogo/codigos-barras.controller.ts`,
  `codigos-barras.service.ts`, `dao/codigo-barras.dao.ts`, `apps/api/src/comun/respuestas.ts`
  (`CodigoBarrasDto`)
- Test: `apps/api/src/pruebas-integracion/codigos-barras.int.test.ts` (se reescribe)

**Interfaces:**
- Consumes: `PresentacionesService` (tarea 4).
- Produces:
  - `CodigoBarrasDto`: `{ ean, categoriaId, categoria, unidad,
    presentacion: { id, nombre, tamano } | null, contenido: number | null, estado, porRevisar,
    grupo, perecedero, creadoPor, creadoEn }`. `contenido` es `presentacion.tamano` y se queda
    para que la entrada rápida siga multiplicando sin cambios. Salen `descripcion` y `revisado`.
  - `GET /api/codigos-barras?q=&estado=&categoriaId=` (ADMIN). `q` busca en el EAN (prefijo), en
    el nombre de la categoría y en el de la presentación, sin tildes, con `acopio_sin_tildes`.
    El orden pone primero `PROPUESTO` y `por_revisar`.
  - `GET /api/codigos-barras/:ean` (ADMIN, OPERADOR): devuelve también los `PROPUESTO`.
  - `POST /api/codigos-barras` (ADMIN, OPERADOR) con `{ ean, presentacionId }`. La categoría sale
    de la presentación y el código queda `VALIDADO`.
  - `POST /api/codigos-barras/:ean/validar` (ADMIN, OPERADOR) con `{ presentacionId }`, para
    confirmar o corregir un `PROPUESTO`. Sobre un `VALIDADO` responde 409 `CODIGO_YA_VALIDADO`.
    Al validar el código, valida también su presentación si estaba `PROPUESTO`.
  - `PATCH /api/codigos-barras/:ean` (ADMIN) con `{ presentacionId?, estado?: 'VALIDADO',
    porRevisar?: false }`, y `DELETE /api/codigos-barras/:ean` (ADMIN).
  - Para otros módulos: `CodigosBarrasService.proponerEnTransaccion(tx, usuario, ean, presentacionId)`,
    `validarEnTransaccion(tx, usuario, ean, presentacionId)` y
    `marcarParaRevisarEnTransaccion(tx, usuario, ean, motivo: string)`. El módulo exporta el
    servicio.

- [ ] **Step 1:** Reescribir la suite de integración con pruebas que fallan:
  - Un Operador asocia y el código queda `VALIDADO` con `contenido` igual al tamaño de la
    presentación.
  - Un segundo `POST` del mismo EAN responde 409 `EAN_YA_ASOCIADO`.
  - `q` con el nombre de la presentación sin tildes encuentra el código.
  - `validar` sobre un `PROPUESTO` lo deja `VALIDADO`, y sobre un `VALIDADO` responde 409.
  - `DELETE` lo borra y deja la fila `codigo_barras.borrado` con el antes.
  - Un Auditor recibe 403 en todas las rutas.
  - Un `presentacionId` de otra categoría que la del código, en el `PATCH`, responde 422
    `PRESENTACION_DE_OTRA_CATEGORIA`.
  Los `PROPUESTO` se siembran con `a.prisma.codigoBarras.create` y `estado: 'PROPUESTO'`.
- [ ] **Step 2:** Correr la suite. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Al cambiar de presentación en el `PATCH`, `categoria_id` sigue a
  la presentación.
- [ ] **Step 4:** La suite y `depcruise`. Esperado: PASS.
- [ ] **Step 5:** Commit `Catálogo: códigos con presentación, estado y búsqueda`.

### Task 6: El Donador propone

**Files:**
- Modify: `apps/api/src/modulos/comprobantes/donaciones.controller.ts`,
  `donaciones.service.ts` (`codigo` y `prepararLinea`)
- Test: `apps/api/src/pruebas-integracion/donaciones.int.test.ts` (casos nuevos)

**Interfaces:**
- Consumes: `CodigosBarrasService.proponerEnTransaccion`,
  `PresentacionesService.crearEnTransaccion` (tareas 4 y 5), `errorDeLinea` (tarea 2).
- Produces:
  - `GET /api/donaciones/codigos/:ean` agrega `estado` y `presentacion`. Un `PROPUESTO` se
    devuelve igual, sea de quien sea.
  - `POST /api/donaciones/codigos` (DONADOR) con `{ ean, presentacionId }` o
    `{ ean, presentacionNueva: { categoriaId, nombre, tamano } | { categoriaId, nombre, contieneId, unidades } }`.
    El código queda `PROPUESTO`, y la presentación nueva también. Si el EAN ya existe, responde lo
    que hay, sin error, para que el segundo Donador use la propuesta del primero.
  - En `prepararLinea`: `contenido_unitario` es el tamaño de la presentación del código; sin
    presentación, 1, como hoy. Si `cantidad × contenido` pasa de `TOPES.linea`, responde 422
    `CANTIDAD_FUERA_DE_TOPE`.

- [ ] **Step 1:** Pruebas que fallan con `crearDonador`:
  - El Donador propone un EAN con una presentación nueva de 0,6 L. El código y la presentación
    quedan `PROPUESTO`, y una donación con ese EAN y `cantidad: 24` guarda `contenido_unitario`
    0,6.
  - Un segundo Donador hace `POST` del mismo EAN y recibe 201 con el código del primero.
  - El `GET` del Operador (`/api/codigos-barras/:ean`) lo muestra `PROPUESTO`.
  - Una donación de 20.000 paquetes x12 de 0,6 L (144.000 L) responde 422
    `CANTIDAD_FUERA_DE_TOPE`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** La suite de donaciones y `depcruise`. Esperado: PASS.
- [ ] **Step 5:** Commit `Comprobantes: el Donador propone códigos y presentaciones`.

### Task 7: La recepción valida o marca

**Files:**
- Modify: `apps/api/src/modulos/comprobantes/comprobantes.controller.ts` (`RecibirDto`),
  `recepcion.service.ts`, el DAO de comprobantes (`actualizarLinea` admite `categoria_id`,
  `ean` y `contenido_unitario`)
- Test: `apps/api/src/pruebas-integracion/recepcion.int.test.ts` (casos nuevos)

**Interfaces:**
- Consumes: `validarEnTransaccion`, `marcarParaRevisarEnTransaccion` (tarea 5),
  `errorDeLinea` (tarea 2).
- Produces: cada línea del cuerpo admite `presentacionId?: uuid`. Las reglas, dentro de la
  transacción de la recepción y antes de la entrada al saldo:
  - Una línea sin `ean` que trae `presentacionId` responde 422 `LINEA_SIN_CODIGO`.
  - Si el código de la línea está `PROPUESTO`, se valida con `presentacionId`, o con su
    presentación si no viene ninguna.
  - Si está `VALIDADO` y `presentacionId` cambia la presentación, solo cambia la línea, y el
    código queda con `por_revisar = true`.
  - Si la línea cambió, toma la categoría y el tamaño de la presentación nueva, y escribe
    `comprobante.linea_corregida` con antes y después.
  - `cantidadConfirmada × contenido_unitario` no pasa de `TOPES.linea`.

- [ ] **Step 1:** Pruebas que fallan (donación preparada en la prueba, recibida por un Operador
  de `ACOPIO_A`):
  - Código `PROPUESTO` sin `presentacionId`: queda `VALIDADO`.
  - Código `PROPUESTO` corregido a la bolsa de 6 L: queda `VALIDADO` con esa presentación, la
    línea guarda `contenido_unitario` 6, y 2 recibidas suman 12 L al saldo.
  - Código `VALIDADO` en «Agua» corregido a una presentación de «Jugo»: el código sigue en
    «Agua» con `por_revisar = true`, la línea queda en «Jugo», y el saldo de «Jugo» sube.
  - Línea sin código con `presentacionId`: 422 `LINEA_SIN_CODIGO`, y el comprobante sigue
    `PREPARADO`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Las líneas se procesan en el orden por categoría que ya existe;
  si una corrección cambia la categoría, se usa la categoría nueva para el orden de candados.
- [ ] **Step 4:** Las suites de recepción, conciliación y seguimiento. Esperado: PASS.
- [ ] **Step 5:** Commit `Comprobantes: la recepción valida o marca los códigos`.

### Task 8: Contrato, tipos y demo

**Files:**
- Modify: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts` (regenerados),
  `apps/api/src/seed/demo.ts`

- [ ] **Step 1:** `bun run --filter @acopio/api openapi` y `bun run --filter @acopio/web api:tipos`.
- [ ] **Step 2:** La demo crea presentaciones en vez de `contenido`, sin `descripcion` ni
  `revisado`: «Botella de agua 600 ml» (0,6 L), «Paquete x12 · botella 600 ml», «Bolsa de arroz
  500 g» (0,5 kg). `4006381333931` apunta a la botella. `7501031311309` queda `PROPUESTO` a nombre
  de `donador1@demo.acopio.local`, para que C18 muestre un propuesto. Sigue siendo idempotente.
- [ ] **Step 3:** `bun run --filter @acopio/api seed:demo` dos veces contra el Compose. Esperado:
  la segunda no falla ni duplica. Después `bun run typecheck`; esperado: la web falla solo donde
  usaba `revisado` o `descripcion`, que lo arreglan las tareas 11 y 12.
- [ ] **Step 4:** Commit `Contrato: presentaciones y estado del código; demo con presentaciones`.

### Task 9: Maquetas en Stitch

**Files:**
- Modify: `docs/03-diseno/stitch/C18-codigos-barras/`, `C04-escaner/` (hoja «Código nuevo» y
  hoja nueva «Nueva presentación»), `C04-recibir-folio/` y `C04-entrada-rapida/` (selector de
  unidad). Cada carpeta queda con captura, HTML de Stitch, maqueta aprobada y nota de diferencias.

- [ ] **Step 1:** Generar en Stitch, con el modelo rápido y prompts cortos, las pantallas de la
  maqueta aprobada en la conversación del 20 de octubre: C18 con buscador, filtro y grupos; la
  hoja «Código nuevo» con la lista de presentaciones; la hoja «Nueva presentación» (suelta y
  paquete); la línea de la recepción con «Es correcto» y «Corregir»; y el campo de cantidad con
  el selector kg/g.
- [ ] **Step 2:** Joseph las aprueba. Sin su aprobación no arrancan las tareas 10 a 13.
- [ ] **Step 3:** Commit `Diseño: maquetas de presentaciones, C18 y recepción`.

### Task 10: Selector de unidades en la web

**Files:**
- Create: `apps/web/src/componentes/SelectorUnidad.tsx`, `SelectorUnidad.test.tsx`
- Modify: `apps/web/src/consola/inventario/EntradaRapida.tsx`, `Salida.tsx`, `Conteo.tsx`,
  `apps/web/src/consola/remisiones/EditorLineas.tsx`, `apps/web/src/donador/Preparar.tsx`, y sus
  pruebas
- Modify: `docs/02-arquitectura/patrones-y-practicas.md` (catálogo de reutilizables)

**Interfaces:**
- Consumes: `UNIDADES_DE_ENTRADA`, `aUnidadBase`, `errorDeLinea` (tarea 2).
- Produces: `SelectorUnidad({ unidad: UnidadBase; factor: number; alCambiar: (factor: number) => void })`,
  que reemplaza la etiqueta fija del símbolo. En `UNIDAD` muestra el símbolo sin opciones.

- [ ] **Step 1:** Pruebas que fallan:
  - En la entrada rápida, Arroz (kg) con «500» y «g» manda `cantidad: 0.5`.
  - Con «0,5» y «g» muestra el aviso y no manda nada.
  - Con «10001» y «kg» muestra «Una línea llega hasta 10.000 kg» y no manda nada.
  - Con un código que trae presentación no aparece el selector, porque se cuentan
    presentaciones.
  - En Salida, Conteo, Remisión y Preparar, una prueba por pantalla con «600» y «ml» que manda
    0,6.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/componentes/SelectorUnidad.test.tsx src/consola/inventario src/consola/remisiones src/donador`.
  Esperado: FAIL.
- [ ] **Step 3:** Implementar. Cada pantalla guarda `factor` en su estado, arranca en 1 y vuelve
  a 1 al cambiar de categoría.
- [ ] **Step 4:** La misma corrida. Esperado: PASS.
- [ ] **Step 5:** Commit `Web: elegir g o ml al escribir una cantidad`.

### Task 11: Código nuevo y presentaciones en la web

**Files:**
- Modify: `apps/web/src/consola/inventario/Escaner.tsx` (`HojaCodigoNuevo`),
  `BuscadorCategoria.tsx`, `EntradaRapida.tsx`, `apps/web/src/api/catalogo.ts`,
  `apps/web/src/api/donaciones.ts`, `apps/web/src/donador/Preparar.tsx`
- Create: `apps/web/src/consola/inventario/HojaNuevaPresentacion.tsx` y su prueba
- Test: `Escaner` y `EntradaRapida`, y `Preparar.test.tsx`

**Interfaces:**
- Consumes: los endpoints de las tareas 4 a 6 y `SelectorUnidad` (tarea 10).
- Produces: `usePresentaciones(categoriaId)`, `useCrearPresentacion()` y
  `useValidarCodigo()` en `api/catalogo.ts`; `useProponerCodigo()` en `api/donaciones.ts`.
  `HojaCodigoNuevo` recibe `soloGuardar?: () => void` y `escribirNumero: boolean`.

- [ ] **Step 1:** Pruebas que fallan:
  - La hoja lista las presentaciones de la categoría elegida, y «Asociar y seguir» manda
    `{ ean, presentacionId }`.
  - «Nueva presentación» como paquete de 12 de la botella de 600 ml muestra «Total: 7,2 L»
    antes de crearla.
  - Crear una suelta de 0,6 L cuando la categoría ya tiene «Botella de agua 600 ml» muestra el
    aviso y ofrece usar la que existe; si se insiste, la crea.
  - En la entrada rápida con red, «Solo guardar el código» asocia y vuelve a la búsqueda sin
    pedir cantidad. Sin red, el botón no aparece.
  - Un código `PROPUESTO` en la entrada rápida muestra la propuesta con «Es correcto» y
    «Corregir», y el teclado de cantidad no aparece hasta confirmar.
  - En Preparar (Donador), un código desconocido abre la hoja con `POST /api/donaciones/codigos`,
    sin campo para escribir el número. Un `PROPUESTO` de otro Donador se usa con la marca «sin
    confirmar».
- [ ] **Step 2:** Correr las pruebas de esas carpetas. Esperado: FAIL.
- [ ] **Step 3:** Implementar según la maqueta de la tarea 9.
- [ ] **Step 4:** Correr las pruebas. Esperado: PASS. Después `node scripts/iconos.mjs` si
  entró un ícono, y `bunx vitest run src/iconos.test.ts`.
- [ ] **Step 5:** Commit `Web: asociar códigos a presentaciones y proponerlos como Donador`.

### Task 12: C18 Códigos

**Files:**
- Modify: `apps/web/src/consola/catalogo/PestanaCodigos.tsx` y su prueba,
  `apps/web/src/api/catalogo.ts` (`useCodigos(filtro)`, `useBorrarCodigo()`)

**Interfaces:**
- Consumes: `GET /api/codigos-barras` con `q`, `estado` y `categoriaId`; `PATCH`, `DELETE` y
  `validar` (tarea 5); `HojaCodigoNuevo` con `escribirNumero: true` (tarea 11).

- [ ] **Step 1:** Pruebas que fallan:
  - El filtro arranca en «Propuestos (N)», con N igual a los `PROPUESTO` más los `por_revisar`.
  - Escribir en el buscador manda `q` a la API, con una espera de 300 ms antes de pedir.
  - Las filas se agrupan por categoría y presentación, con su número de códigos.
  - Abrir una presentación muestra sus códigos, con «Aprobar», «Cambiar de presentación» y
    «Borrar».
  - «Agregar código» abre la hoja con el campo para escribir el número.
  - La pantalla no tiene violaciones graves de accesibilidad.
- [ ] **Step 2:** `bunx vitest run src/consola/catalogo`. Esperado: FAIL.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** La misma corrida. Esperado: PASS.
- [ ] **Step 5:** Commit `Web: C18 busca, agrupa y aprueba códigos`.

### Task 13: Recepción en la web

**Files:**
- Modify: `apps/web/src/consola/comprobantes/RecibirFolio.tsx` y su prueba,
  `apps/web/src/api/comprobantes.ts` (el cuerpo de recibir)

**Interfaces:**
- Consumes: `presentacionId` por línea (tarea 7), `usePresentaciones` (tarea 11).

- [ ] **Step 1:** Pruebas que fallan:
  - Una línea con código `PROPUESTO` muestra «Código propuesto», con «Es correcto» y «Corregir».
  - «Corregir» abre la lista de presentaciones de todas las categorías, y la elegida va como
    `presentacionId` en el cuerpo.
  - Una línea con código `VALIDADO` muestra «Corregir» sin la marca de propuesto.
  - «Terminar recepción» manda las cantidades como hoy.
- [ ] **Step 2:** `bunx vitest run src/consola/comprobantes`. Esperado: FAIL.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** La misma corrida. Esperado: PASS.
- [ ] **Step 5:** Commit `Web: la recepción confirma o corrige los códigos`.

### Task 14: Recorridos, despliegue y cierre

**Files:**
- Modify: `apps/web/recorridos/consola-comprobantes.mjs` y `donador.mjs` (o uno nuevo,
  `presentaciones.mjs`), `docs/06-operacion/recorridos.md`
- Modify: la especificación («Cambios al construir»), este plan («Estado»),
  `docs/05-planes/plan-de-accion.md` (fila y registro), informe de la sesión

- [ ] **Step 1:** Un recorrido de punta a punta con la cámara falsa de Chromium y el EAN
  inyectado: el Donador propone un código con una presentación nueva, el Operador recibe el folio
  y lo confirma, y C18 lo muestra validado.
- [ ] **Step 2:** La verificación completa: `lint`, `typecheck`, `depcruise`, `test`, `test:int`
  (contra un PostgreSQL aparte) y `scripts/revisar-colores.sh`, encadenados con `&&`.
- [ ] **Step 3:** Desplegar y migrar en el servidor de pruebas, y revisar que los códigos que ya
  había allí quedaron con su presentación o marcados para revisar.
- [ ] **Step 4:** Documentos de cierre y PR de la fase, con «Closes» para el issue del bloque.
