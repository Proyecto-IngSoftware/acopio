---
title: "Mapa de necesidades · plan"
type: plan
tags: [plan, inventario, red, turnos, api, web]
estado: vigente
actualizado: 2026-10-20
---

# Mapa de necesidades · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** cada acopio del mapa público lleva encima una etiqueta con lo que le falta, lo que
le sobra, lo que no recibe o «al día», con chips para filtrar por estado y por categoría. Además,
voluntariado gana un mapa con «Faltan N personas», «Quedan N cupos» o «Llena».

**Arquitectura:** `inventario` expone `GET /publico/necesidades`, que reúne por acopio las
categorías en falta, de sobra, al día y sin recibir, con el `semaforo` de `@acopio/shared` y los
DAO que ya usa `BalanceService`. La web cruza esa lista con `GET /acopios` y decide la etiqueta
con funciones puras en `portal/mapa/necesidad.ts`. Voluntariado no cambia la API: las reglas de
cupos van en `portal/turnos/cupos.ts` y el mapa en `portal/turnos/MapaJornadas.tsx`.

**Stack:** NestJS 11, Prisma 7.10, zod con `crearDto`; React 19, TanStack Query 5, Leaflet con
`react-leaflet` y `leaflet.markercluster`, Tailwind 4 con `packages/ui-tokens`, Vitest con
`responderSegun`, Playwright para los recorridos.

**Spec:** [2026-10-20-mapa-de-necesidades-design.md](../superpowers/specs/2026-10-20-mapa-de-necesidades-design.md)

**Maqueta aprobada:** [maqueta-necesidades.html](../03-diseno/stitch/P05-mapa/maqueta-necesidades.html)
(<https://claude.ai/artifact/EekofY8Z5Ky2VprW6FXLe4>), aprobada por Joseph el 2026-10-20.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 API de necesidades | ⬜ | |
| 2 Reglas de las etiquetas en la web | ⬜ | |
| 3 Marcador con etiqueta y color | ⬜ | |
| 4 Chips, categoría y tarjeta en P5 | ⬜ | |
| 5 Voluntariado en mapa | ⬜ | |
| 6 Documentos, recorridos y cierre | ⬜ | |

Rama `mapa-necesidades`, un solo PR al final (tarea 6).

## Global Constraints

- Node 22, Bun 1.3, TypeScript 6.0, NestJS 11, Prisma 7.10. No entran dependencias nuevas.
- Español en código, rutas y textos; términos de `docs/00-contexto/glosario.md`.
- Ningún endpoint ni pantalla pública muestra cantidades de inventario. Solo nombres de
  categoría.
- Estados: falta es `semaforo` `BAJO`; de sobra, `SOBRE`; al día, `EN_RANGO` o `CERCA`; no
  recibe, una marca de «no recibir» vigente. Sin umbral no hay falta, sobra ni al día.
- Orden de urgencia de un acopio: falta, no recibe, de sobra, al día. En voluntariado: faltan,
  quedan, llena.
- Colores por token, nunca hexadecimales en `apps/web`. Falta: `secondary-container` con
  `on-secondary`. De sobra: `tertiary-container` con `on-primary`. Al día: `primary-fixed` con
  `primary` en la etiqueta y `primary-container` en el círculo. No recibe:
  `surface-container-high` con `on-surface-variant` en la etiqueta y `on-surface-variant` en el
  círculo.
- Cada estado tiene su ícono además del color (RNF-11): `priority_high`, `inventory_2`,
  `check`, `block`. Los íconos nuevos se registran con `node scripts/iconos.mjs` en `apps/web`.
- `inventario` está en `MIGRADOS_A_DAO`: solo los DAO inyectan `PrismaService`.
- Base de pruebas compartida (`acopio_test`): ninguna prueba cuenta todos los acopios ni todas
  las categorías. Cada prueba crea sus categorías con `unico()` y busca sus filas por id.
- Si cambia un endpoint, se regeneran `openapi` y `api:tipos` y se versionan los dos.
- Toda pieza reutilizable nueva (los chips de estado) se anota en el catálogo de
  `docs/02-arquitectura/patrones-y-practicas.md`.

## Review Focus

- Un acopio con saldo igual al mínimo de una categoría da `CERCA`, que en el mapa es «al día» y
  no «falta». Prueba en la tarea 1.
- La API de necesidades no trae cantidades: el cuerpo no tiene ninguna clave `cantidad`,
  `minimo` ni `maximo`. Prueba en la tarea 1.
- Un acopio pausado con categorías en falta no lleva etiqueta, no cambia de color y no entra en
  los chips. Prueba en las tareas 2 y 4.
- Con «Arroz» elegido, un acopio sin umbral de arroz ni marca queda sin etiqueta y con el
  círculo verde; no cuenta como «al día». Prueba en la tarea 2.
- Una jornada con 5 cupos, 3 ocupados y 0 de ajuste no está bajo la mitad (3 ≥ 2,5): dice
  «QUEDAN 2 CUPOS» y no «FALTAN». Prueba en la tarea 5.

---

### Task 1: API de necesidades

**Files:**
- Modify: `apps/api/src/modulos/inventario/balance.service.ts`,
  `apps/api/src/modulos/inventario/balance.controller.ts`, `apps/api/src/comun/respuestas.ts`
- Test: `apps/api/src/pruebas-integracion/necesidades-publico.int.test.ts`
- Regenerar: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts`

**Interfaces:**
- Produces: `GET /api/publico/necesidades`, público, 200 con `NecesidadAcopioDto[]`:
  `{ acopioId: uuid; faltan: Cat[]; sobran: Cat[]; alDia: Cat[]; noRecibe: Cat[] }`, con
  `Cat = { categoriaId: uuid; categoria: string }`. Cada lista va en orden alfabético `es`. Solo
  salen acopios no cerrados con al menos un umbral o una marca vigente.
- Produces: `BalanceService.necesidades(): Promise<NecesidadAcopio[]>`.

- [ ] **Step 1: Escribir la prueba de integración.** `beforeAll` crea con `unico()` las
  categorías propias `Falta`, `Sobra`, `Rango`, `Cerca` y `NoRecibe`. En `ACOPIO_A`: `Falta` con
  mínimo 5 y máximo 20, sin movimientos; `Sobra` con mínimo 1 y máximo 2, y una `ENTRADA` de 5;
  `Rango` con mínimo 1 y máximo 10, y una `ENTRADA` de 5; `Cerca` con mínimo 4 y máximo 10, y una
  `ENTRADA` de 4 (4 ≤ 4 × 1,25 = 5, da `CERCA`); marca de «no recibir» en `NoRecibe`. Las
  entradas se crean con `a.prisma.movimiento.create`, como en `despacho.int.test.ts`. Casos:
  - `'sin sesión clasifica cada categoría del acopio'`: la fila de `ACOPIO_A` tiene `Falta` en
    `faltan`, `Sobra` en `sobran`, `Rango` y `Cerca` en `alDia`, y `NoRecibe` en `noRecibe`.
  - `'no publica cantidades'`: `JSON.stringify(cuerpo)` no contiene `"cantidad"`, `"minimo"` ni
    `"maximo"`.
  - `'un acopio cerrado no aparece'`: con `ACOPIO_B` en `CERRADO` (de vuelta a `ACTIVO` en el
    `finally`), ninguna fila tiene `acopioId === ACOPIO_B`.
  - `'una marca vencida no cuenta'`: con `hasta` en 2000-01-01, `NoRecibe` no está en
    `noRecibe` de `ACOPIO_A`.
- [ ] **Step 2:** `cd apps/api && bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/necesidades-publico.int.test.ts`
  contra el contenedor de pruebas (`PRUEBAS_PG_URL`). Esperado: FAIL con 404.
- [ ] **Step 3: Implementar.** `NecesidadAcopioDto` en `respuestas.ts`, junto a `BalanceDto`.
  `necesidades()` en `BalanceService` usa `umbrales.deAcopiosAbiertos()`,
  `marcas.vigentesAbiertas(hoyEnBogota())` y `saldos.deVarios(...)`, igual que `balance()`;
  agrupa por acopio y clasifica con `semaforo`. La ruta es `@Get('necesidades')` en
  `BalanceController`, con `@Publico()`, `@ApiOperation` («Qué falta, qué sobra, qué está al día
  y qué no recibe cada acopio, solo por categoría. No exige sesión») y
  `@ApiOkResponse({ type: NecesidadAcopioDto, isArray: true })`.
- [ ] **Step 4:** la misma prueba. Esperado: PASS. Después `bun run typecheck` y
  `bun run --filter @acopio/api depcruise`; esperado: código de salida 0.
- [ ] **Step 5:** `bun run --filter @acopio/api openapi` y `bun run --filter @acopio/web api:tipos`.
- [ ] **Step 6:** Commit `Inventario: necesidades públicas por acopio para el mapa`.

### Task 2: Reglas de las etiquetas en la web

**Files:**
- Modify: `apps/web/src/api/inventario.ts`
- Create: `apps/web/src/portal/mapa/necesidad.ts`
- Test: `apps/web/src/portal/mapa/necesidad.test.ts`

**Interfaces:**
- Consumes: `NecesidadAcopioDto` de la tarea 1.
- Produces, en `api/inventario.ts`: `type NecesidadAcopio = S['NecesidadAcopioDto']` y
  `useNecesidades()`, un `useQuery` con clave `['inventario', 'necesidades']` sobre
  `GET /api/publico/necesidades`.
- Produces, en `necesidad.ts`:
  - `type EstadoMapa = 'falta' | 'sobra' | 'aldia' | 'norecibe'`
  - `interface EtiquetaMapa { estado: EstadoMapa; texto: string }`
  - `estadoDeCategoria(n: NecesidadAcopio | undefined, categoriaId: string): EstadoMapa | null`
  - `etiquetaAcopio(a: AcopioPublico, n: NecesidadAcopio | undefined, opciones: { categoria?:
    { id: string; nombre: string }; estado?: Exclude<EstadoMapa, 'aldia'> }): EtiquetaMapa | null`
  - `tieneEstado(n: NecesidadAcopio | undefined, estado: EstadoMapa): boolean`
  - `contarEstados(acopios: AcopioPublico[], porId: Map<string, NecesidadAcopio>, categoriaId?:
    string): Record<EstadoMapa, number> & { todos: number }`
  - `fraseCategoria(nombre: string, cuenta: Record<EstadoMapa, number>): string`

- [ ] **Step 1: Escribir las pruebas** con un acopio `ACTIVO` y `OPERADO` y la necesidad
  `{ faltan: [Agua potable, Arroz, Pañales], sobran: [Ropa], alDia: [Aceite], noRecibe:
  [Colchones] }`:
  - sin opciones da `{ estado: 'falta', texto: 'FALTA: Agua potable +2' }`.
  - con `estado: 'sobra'` da `{ estado: 'sobra', texto: 'DE SOBRA: Ropa' }`.
  - con `estado: 'norecibe'` da `{ estado: 'norecibe', texto: 'NO RECIBE: Colchones' }`.
  - solo `alDia: [Aceite]` da `{ estado: 'aldia', texto: 'AL DÍA' }`.
  - con la categoría Arroz da `{ estado: 'falta', texto: 'FALTA ARROZ' }`; con Ropa,
    `'ROPA DE SOBRA'`; con Aceite, `'ACEITE AL DÍA'`; con Colchones, `{ estado: 'norecibe',
    texto: 'NO RECIBE COLCHONES' }`; con una categoría que no está en ninguna lista, `null`.
  - el mismo acopio con `estado: 'PAUSADO'` da `null`; uno `REFERENCIADO`, `null`; con la
    necesidad `undefined`, `null`.
  - `contarEstados` con ese acopio, uno pausado con faltas y uno al día da `{ todos: 2, falta: 1,
    sobra: 1, norecibe: 1, aldia: 1 }`: el pausado no cuenta y el primero entra en tres.
  - `fraseCategoria('Arroz', { falta: 2, aldia: 2, sobra: 1, norecibe: 0 })` da
    `'Arroz: falta en 2 acopios, está al día en 2 y sobra en 1.'`; con `falta: 1` y lo demás
    en 0, `'Arroz: falta en 1 acopio.'`; con todo en 0, `'Ningún acopio tiene umbral para
    arroz.'`. Sin artículo, porque «el» o «la» dependen de la categoría.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/portal/mapa/necesidad.test.ts`. Esperado:
  FAIL, el módulo no existe.
- [ ] **Step 3: Implementar** `necesidad.ts` y `useNecesidades`. Las mayúsculas usan
  `toLocaleUpperCase('es-CO')`. Con categoría elegida, «no recibe» gana sobre las demás listas.
- [ ] **Step 4:** la misma prueba. Esperado: PASS.
- [ ] **Step 5:** Commit `Mapa: reglas de las etiquetas de necesidad`.

### Task 3: Marcador con etiqueta y color

**Files:**
- Modify: `apps/web/src/portal/mapa/marcador.ts`, `apps/web/src/portal/mapa/MapaAcopios.tsx`
- Test: `apps/web/src/portal/mapa/marcador.test.ts`

**Interfaces:**
- Consumes: `EtiquetaMapa` de la tarea 2.
- Produces: `htmlMarcador(a: AcopioPublico, elegido: boolean, etiqueta?: EtiquetaMapa | null,
  apagado?: boolean): string`. `MapaAcopios` gana las props `etiquetas?: Map<string,
  EtiquetaMapa>` y `apagados?: Set<string>`.

- [ ] **Step 1: Escribir las pruebas** en `marcador.test.ts`:
  - un acopio activo con `{ estado: 'falta', texto: 'FALTA: Arroz' }` da un HTML con
    `FALTA: Arroz`, `priority_high`, `bg-secondary-container` y `warehouse`, sin el nombre corto
    del acopio.
  - `sobra` lleva `bg-tertiary-container` e `inventory_2`; `aldia`, `bg-primary-fixed` y
    `check`; `norecibe`, `bg-surface-container-high` y `block`.
  - sin etiqueta, un acopio activo da el círculo `bg-primary-container` con `warehouse` y sin
    texto.
  - `apagado` añade `opacity-45` y quita la etiqueta.
  - un pausado y un referenciado siguen con su píldora de hoy y su nombre (las pruebas que ya
    existen siguen pasando).
  - el texto de la etiqueta se escapa: `<b>` sale como `&lt;b&gt;`.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/portal/mapa/marcador.test.ts`. Esperado:
  FAIL en las pruebas nuevas.
- [ ] **Step 3: Implementar.** El acopio operado activo es un círculo de 32 px (40 px y anillo
  si está elegido) con la etiqueta encima, como en la maqueta. `MapaAcopios` calcula `iconSize`
  e `iconAnchor` para que la punta de abajo del círculo quede en la coordenada, y pasa la
  etiqueta y el apagado de cada acopio. El `title` del marcador sigue siendo
  `etiquetaMarcador(a)`, y si hay etiqueta se le suma: `Acopio Chapinero. Falta: Arroz`.
- [ ] **Step 4:** la misma prueba y `bun run typecheck`. Esperado: PASS y código 0.
- [ ] **Step 5:** `node scripts/iconos.mjs` en `apps/web` y `bunx vitest run src/iconos.test.ts`.
  Esperado: PASS.
- [ ] **Step 6:** Commit `Mapa: punto del acopio con el color y la etiqueta de su estado`.

### Task 4: Chips, categoría y tarjeta en P5

**Files:**
- Create: `apps/web/src/componentes/ChipsEstado.tsx`
- Modify: `apps/web/src/portal/mapa/Mapa.tsx`, `apps/web/src/portal/mapa/TarjetaAcopio.tsx`,
  `docs/02-arquitectura/patrones-y-practicas.md`
- Test: `apps/web/src/portal/mapa/Mapa.test.tsx`, `apps/web/src/componentes/componentes.test.tsx`

**Interfaces:**
- Consumes: `useNecesidades`, `etiquetaAcopio`, `tieneEstado`, `contarEstados` y
  `fraseCategoria` (tarea 2); las props de `MapaAcopios` (tarea 3).
- Produces: `ChipsEstado<T extends string>({ etiqueta, valor, alCambiar, opciones }: { etiqueta:
  string; valor: T; alCambiar: (v: T) => void; opciones: { valor: T; texto: string; cuenta:
  number; punto?: string }[] })`. Son botones con `aria-pressed`; un chip con `cuenta` 0 no se
  dibuja, salvo el elegido, y `punto` es la clase del puntito de color. La tarea 5 también la
  usa.

- [ ] **Step 1: Escribir las pruebas** en `Mapa.test.tsx`, con `'GET /api/publico/necesidades'`
  en `RESPUESTAS`: Chapinero (`x1`) con `faltan: [Agua potable]` y `sobran: [Ropa usada]`; un
  acopio nuevo `x3` con `alDia: [Ropa usada]`; Suba (`x2`, pausado) con `noRecibe: [Ropa
  usada]`.
  - `'la lista lleva la etiqueta de cada acopio'`: Chapinero dice `FALTA: Agua potable`; Suba no
    lleva etiqueta.
  - `'los chips cuentan y filtran por estado, y quedan en la URL'`: hay `Todos 2`, `Falta 1` y
    `De sobra 1`, y no hay chip `No recibe` porque el único que no recibe está pausado. Al
    pulsar `De sobra`, la URL lleva `estado=sobra`, solo queda Chapinero y su etiqueta dice
    `DE SOBRA: Ropa usada`.
  - la prueba `'lo que vas a llevar oculta…'` pasa a ser
    `'lo que vas a llevar apaga los que no lo reciben y resume la categoría'`: con «Ropa usada»
    aparece la frase que da `fraseCategoria` para esos acopios, Suba sale al final con
    `No recibe ropa usada` y nada dice «Ocultamos».
  - `'la tarjeta del acopio elegido dice qué falta y qué sobra'`: en la vista de mapa, al elegir
    Chapinero se ven `Qué falta hoy` con `Agua potable`, y `Ya tienen de sobra` con `Ropa usada`
    y `Mejor llévalo a otro acopio`.
  - en `componentes.test.tsx`: `ChipsEstado` no dibuja un chip con 0 y marca el elegido con
    `aria-pressed="true"`.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/portal/mapa/Mapa.test.tsx src/componentes/componentes.test.tsx`.
  Esperado: FAIL en las nuevas.
- [ ] **Step 3: Implementar.** En `Mapa.tsx`, `useNecesidades()` reemplaza a
  `useAcopiosQueNoReciben` para saber quién no recibe la categoría. Si la consulta falla, el
  mapa sigue sin etiquetas ni chips. Los chips van bajo «¿Qué vas a llevar?» y el parámetro
  `estado` (`falta`, `sobra`, `norecibe`) se lee de la URL. Con un chip distinto de «Todos» se
  ocultan los puntos de RedAcopio. Con categoría elegida, «No recibe» no sale como chip, la
  frase va bajo el selector y los acopios que no la reciben pasan a `apagados` en el mapa y al
  final de la lista con «No recibe <categoría>». El subtítulo pasa a «Antes de salir, revisa qué
  falta y qué no reciben.». La leyenda bajo el mapa nombra los cuatro estados. `Elegido` gana
  los bloques «Qué falta hoy» y «Ya tienen de sobra»; con categoría elegida, el primero se
  titula con su estado («Falta arroz») y debajo dice «También les falta: …». `TarjetaAcopio`
  recibe `etiqueta?: EtiquetaMapa | null` y la muestra junto al nombre. Si
  `useAcopiosQueNoReciben` queda sin uso, se borra de `api/red.ts`. `ChipsEstado` se anota en
  el catálogo de `patrones-y-practicas.md`.
- [ ] **Step 4:** las mismas pruebas, `bun run --filter @acopio/web test` y `bun run typecheck`.
  Esperado: PASS y código 0.
- [ ] **Step 5:** Commit `Mapa: chips de estado, categoría elegida y tarjeta con lo que falta y sobra`.

### Task 5: Voluntariado en mapa

**Files:**
- Create: `apps/web/src/portal/turnos/cupos.ts`, `apps/web/src/portal/turnos/MapaJornadas.tsx`
- Modify: `apps/web/src/portal/turnos/Jornadas.tsx`
- Test: `apps/web/src/portal/turnos/cupos.test.ts`, `apps/web/src/portal/turnos/Jornadas.test.tsx`

**Interfaces:**
- Consumes: `ChipsEstado` (tarea 4) y `JornadaPublica` de `api/turnos.ts`.
- Produces, en `cupos.ts`:
  - `type EstadoCupos = 'faltan' | 'cupos' | 'llena'`
  - `estadoCupos(j: JornadaPublica): { estado: EstadoCupos; texto: string } | null`. Da `null`
    si la jornada no acepta reservas y su motivo no es `LLENA`.
  - `porLugar(jornadas: JornadaPublica[]): { lugar: JornadaPublica['lugar']; jornadas:
    JornadaPublica[] }[]`, solo con lugares que tienen `lat` y `lng`, y la jornada más urgente
    primero.
- Produces: `MapaJornadas({ grupos, elegido, alElegir })`, `export default`, cargado con `lazy`.

- [ ] **Step 1: Escribir las pruebas** en `cupos.test.ts`:
  - `cupoMaximo 10, ocupados 3, ajuste 0, libres 7` da `{ estado: 'faltan', texto: 'FALTAN 7
    PERSONAS' }`.
  - `cupoMaximo 5, ocupados 3, ajuste 0, libres 2` da `{ estado: 'cupos', texto: 'QUEDAN 2
    CUPOS' }`, porque 3 ≥ 2,5.
  - `libres 1` sin estar bajo la mitad da `'QUEDA 1 CUPO'`; `libres 0`, `{ estado: 'llena',
    texto: 'LLENA' }`.
  - `aceptaReservas false` con `motivoSinReserva 'PLAZO'` da `null`.
  - `porLugar` con dos jornadas en el mismo acopio (una llena y una con faltan) y una en un lugar
    sin coordenadas da un solo grupo, con la de faltan primero.
  - en `Jornadas.test.tsx`: `'la vista de mapa queda en la URL y los chips filtran'`. Al elegir
    «Mapa», la URL lleva `vista=mapa`. Con las jornadas de prueba hay `Todas`, `Falta gente 1` y
    `Con cupos 1`; al pulsar `Falta gente`, la URL lleva `estado=faltan` y la lista muestra solo
    esa jornada. También `'una jornada sin coordenadas lo avisa bajo el mapa'`.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/portal/turnos/cupos.test.ts src/portal/turnos/Jornadas.test.tsx`.
  Esperado: FAIL.
- [ ] **Step 3: Implementar.** `Jornadas.tsx` gana el `Segmentado` «Lista» y «Mapa» bajo los
  filtros (`vista=mapa` en la URL; la lista sigue por defecto) y `ChipsEstado` con «Todas»,
  «Falta gente» y «Con cupos» (`estado=faltan|cupos`). Con un chip elegido, la lista deja solo
  las jornadas de ese estado. `MapaJornadas` reutiliza `MOSAICOS`, `ATRIBUCION` y
  `CENTRO_INICIAL` de `componentes/mapa/MapaLeaflet.tsx`, y el mismo círculo con etiqueta de la
  tarea 3, con los íconos `priority_high`, `event_available` y `block` y los colores de falta,
  al día y no recibe de las Global Constraints. Si el lugar tiene más jornadas, la etiqueta suma
  «+N jornadas». Al tocar un punto, debajo del mapa salen con `TarjetaJornada` las jornadas de
  ese lugar que pasan el chip. Si hay jornadas sin coordenadas, bajo el mapa dice: «N jornadas
  no tienen ubicación en el mapa; están en la lista.»
- [ ] **Step 4:** las mismas pruebas, `node scripts/iconos.mjs`, `bun run --filter @acopio/web test`
  y `bun run typecheck`. Esperado: PASS y código 0.
- [ ] **Step 5:** Commit `Voluntariado: mapa de jornadas con lo que falta de gente y los cupos`.

### Task 6: Documentos, recorridos y cierre

**Files:**
- Modify: `docs/01-requerimientos/funcionales/red.md` (RF-RED-002),
  `docs/01-requerimientos/funcionales/turnos.md` (el requisito de P7, si nombra la vista),
  `docs/03-diseno/stitch/P05-mapa/README.md`, `docs/03-diseno/stitch/P07-voluntariado/README.md`,
  `docs/06-operacion/recorridos.md`, los recorridos que pasan por P5 y P7
  (`apps/web/recorridos/referenciados.mjs`, `consola-recepciones.mjs`, `portal-turnos.mjs`),
  `docs/05-planes/plan-de-accion.md`, este plan y un informe en `docs/06-operacion/sesiones/`

- [ ] **Step 1:** RF-RED-002 con las etiquetas, los chips y los acopios apagados en vez de
  ocultos. Notas de P5 y P7 con la maqueta aprobada y sus diferencias con Stitch: sin «Poco» y
  con un círculo sin nombre en vez de la píldora con nombre. Capturas
  `construida-necesidades.png` y `construida-mapa.png` desde los recorridos. Cada texto pasa por
  `humanizer:humanizer`.
- [ ] **Step 2:** Los recorridos. En P5 se comprueba una etiqueta de la demo y el chip «Falta»;
  en P7 se abre «Mapa» y se comprueba una etiqueta de cupos. Se corren contra la API del Compose
  (`bun run servicios:todo`, `seed:demo`). Esperado: todos pasan.
- [ ] **Step 3:** Verificación completa por código de salida: `bun run lint && bun run typecheck
  && bun run --filter @acopio/api depcruise && bash scripts/revisar-colores.sh && bun run test &&
  bun run test:int` (la integración, contra el contenedor aparte).
- [ ] **Step 4:** Plan de acción (fila nueva en «Ahora» y línea en el registro), estado de este
  plan e informe de la sesión con sus pendientes enlazados.
- [ ] **Step 5:** Commit de cierre, push, `gh pr create` y fusión cuando el CI pase
  (`gh pr checks <n> --watch && gh pr review <n> --comment -b "Revisado" && gh pr merge <n> --merge`).
