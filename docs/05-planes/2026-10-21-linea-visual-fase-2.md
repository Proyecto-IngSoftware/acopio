---
title: "Línea visual, fase 2: el portal · plan"
type: plan
tags: [plan, web, diseno, ux, portal]
estado: vigente
actualizado: 2026-10-21
---

# Línea visual, fase 2: el portal · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** aplicar en las pantallas del portal (P1 a P14 y las del Donador) las piezas que dejó la [fase 1](2026-10-21-linea-visual-fase-1.md): fila de jornada con bloque de fecha, tira de días en P7, franja de la Portada con la cifra real, barras del balance, estados vacíos con ilustración, sello de confirmación, botones ocupados e inhabilitados sólidos y listas que entran escalonadas. La consola queda para la fase 3.

**Arquitectura:** no hay piezas base nuevas salvo `FilaJornada` y dos funciones puras (`textoCuposFila` y `tituloFranja`) con su prueba. Lo demás es cambiar cada pantalla para que use `BloqueFecha`, `TiraDias`, `Barra`, `EstadoVacio` con `ilustracion`, `SelloConfirmacion`, `Desplegable`, `Boton` con `ocupado` y las clases `entra-lista`, `aparece`, `latido` y `gira` de `estilos.css`. La API no cambia.

**Stack:** React 19, React Router 8, TanStack Query, Tailwind 4 con `packages/ui-tokens`, Vitest con Testing Library y axe (`violacionesGraves`).

**Spec:** [2026-10-21-linea-visual-design.md](../superpowers/specs/2026-10-21-linea-visual-design.md). Maqueta: el lienzo <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>, aprobado por Joseph el 2026-10-21.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Fila de jornada | ✅ | |
| 2 P7 con la tira de días | ✅ | |
| 3 Franja de la Portada | ✅ | |
| 4 Balance, «¿Cómo apoyar?» y vacíos de la Portada | ✅ | |
| 5 Reservar y Mi reserva | ✅ | |
| 6 Donador: folio, confirmar correo y mis donaciones | ✅ | |
| 7 Seguimiento, causas y mapa | ✅ | |
| 8 Documentos, verificación y PR | 🟡 | Verificación completa en verde y PR abierto. Faltan los recorridos y las `construida.png` nuevas, que piden el Compose |

## Global Constraints

- Node 22, Bun 1.3, TypeScript 6.0. Sin dependencias nuevas ni librerías de animación.
- Español en código, nombres y textos.
- En `apps/web/src` no se escriben colores hexadecimales (`scripts/revisar-colores.sh`). Se usan clases de token o `var(--token)`.
- Las transparencias de hoy no se tocan (velo de `Hoja`, barra inferior, fondos con opacidad).
- Con «reducir movimiento», `estilos.css` deja `animation: none` y `transition: none`. El estilo base de lo animado es su estado final. En jsdom `prefiereMenosMovimiento()` es verdadero, así que las pruebas ven el estado final sin esperar.
- Fechas en hora de Bogotá con `src/formato.ts`. El bloque de fecha va solo en fechas de agenda (jornadas), nunca en fechas de registro.
- Un estado desactivado lleva siempre etiqueta de texto y no muestra el botón de acción principal.
- Área táctil de 48 px, salvo el botón compacto de la fila (40 px dentro de una fila de al menos 72 px).
- Íconos nuevos: `node scripts/iconos.mjs` en `apps/web`.
- Las pruebas que cambian de texto se ajustan al texto nuevo sin aflojar lo que comprueban.
- Al cerrar cada tarea: `bun run --filter @acopio/web test && bun run --filter @acopio/web typecheck`.
- Una rama y un PR para toda la fase, con pocos commits agrupados por tema. La rama es la que asigna la sesión en la nube (`claude/beautiful-faraday-11mzwz`).

## Review Focus

1. Una fila de jornada no anida un enlace dentro de otro: el título es el enlace que cubre la fila y «Reservar» es un enlace aparte encima. axe no marca nada. Prueba en la tarea 1.
2. Un `?dia=` de un enlace compartido que no cae en la tira sigue filtrando, y la tira no deja ningún día marcado como elegido. Prueba en la tarea 2.
3. El título de la franja cuenta acopios sin repetir: dos categorías que faltan en el mismo acopio dan «en 1 acopio». Con 1 categoría dice «falta 1 categoría». Prueba en la tarea 3.
4. Con la cuenta animada, el lector de pantalla oye la frase final y no los números intermedios. Prueba en la tarea 3.
5. Un botón ocupado (reservar, cancelar, confirmar, subir factura) no envía dos veces. Pruebas en las tareas 5 y 6.

---

### Task 1: Fila de jornada

**Files:**
- Create: `apps/web/src/portal/turnos/FilaJornada.tsx`
- Modify: `apps/web/src/portal/turnos/piezas.tsx` (agrega `textoCuposFila`), `apps/web/src/portal/bloques/JornadasPortada.tsx`
- Delete: `apps/web/src/portal/turnos/TarjetaJornada.tsx` (sus usos en `Jornadas.tsx` pasan a `FilaJornada` en la tarea 2; en esta tarea `Jornadas.tsx` cambia solo el import)
- Test: `apps/web/src/portal/turnos/FilaJornada.test.tsx`

**Interfaces:**
- Consumes: `BloqueFecha` (`tamano`, `apagado`), `Barra` (`tono: 'aviso'`), `EnlaceBoton` (`tamano: 'compacto'`), `marcaJornada`, `Marca`, `NOMBRE_PERFIL`, `rangoHoras`.
- Produces:
  - `textoCuposFila(j: Pick<JornadaPublica, 'cupoMaximo' | 'libres'>): string`: «Quedan 4 de 12», «Queda 1 cupo» o «Sin cupos» (libres ≤ 0).
  - `FilaJornada({ jornada, className?, style? }: { jornada: JornadaPublica; className?: string; style?: CSSProperties })`. Un `article` con `relative`, `toque` y `min-h-[72px]`. A la izquierda el `BloqueFecha` de fila, `apagado` si `marcaJornada(j)` no es null. En la columna: la marca de estado y la de perfil (como hoy), el título como `Link` a `/voluntariado/:id` con `after:absolute after:inset-0` para que toda la fila abra la jornada; el lugar con `verified` relleno o `warehouse` y el horario en una línea `text-body-sm`. Debajo, solo si acepta reservas: una `Barra` con `valor = cupoMaximo - libres`, `total = cupoMaximo`, `tono = 'aviso'` si `libres <= 2`, el texto de `textoCuposFila` en `tertiary-container` con dos o menos libres, y a la derecha `EnlaceBoton tamano="compacto"` «Reservar» con `aria-label="Reservar en <título>"` y `relative z-10`. Desactivada: `opacity-80`, la etiqueta de `marcaJornada` en gris sólido (`bg-surface-container-high text-on-surface-variant`) y sin botón ni barra.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
it('textoCuposFila', () => {
  expect(textoCuposFila({ cupoMaximo: 12, libres: 4 })).toBe('Quedan 4 de 12');
  expect(textoCuposFila({ cupoMaximo: 12, libres: 1 })).toBe('Queda 1 cupo');
  expect(textoCuposFila({ cupoMaximo: 12, libres: 0 })).toBe('Sin cupos');
});
it('abierta: el título abre la jornada y «Reservar» va aparte', () => {
  envolver(<FilaJornada jornada={jornada({ libres: 4 })} />);
  expect(screen.getByRole('link', { name: 'Limpieza del río' })).toHaveAttribute('href', '/voluntariado/j1');
  expect(screen.getByRole('link', { name: 'Reservar en Limpieza del río' })).toBeInTheDocument();
  expect(screen.getByText('Quedan 4 de 12')).toBeInTheDocument();
});
it('con dos libres o menos, la barra va en ámbar', () => { /* meter con la clase bg-tertiary-container dentro */ });
it('llena: etiqueta «Llena», bloque apagado y sin botón', () => {
  envolver(<FilaJornada jornada={jornada({ libres: 0, aceptaReservas: false, motivoSinReserva: 'LLENA' })} />);
  expect(screen.getByText('Llena')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /^Reservar/ })).toBeNull();
  expect(screen.queryByRole('meter')).toBeNull();
});
it('sin violaciones graves de accesibilidad', async () => { /* abierta y llena juntas */ });
```

`jornada(...)` es un ayudante local que arma un `JornadaPublica` completo con `id: 'j1'`, `titulo: 'Limpieza del río'`, `cupoMaximo: 12` y un `inicio` fijo.

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/turnos/FilaJornada.test.tsx` → FAIL.
- [ ] **Step 3: Implementar `textoCuposFila` y `FilaJornada`; `JornadasPortada` usa `FilaJornada`; borrar `TarjetaJornada`.** Los mensajes vacío y error de `JornadasPortada` pasan a `EstadoVacio` con `ilustracion="calendario"` y el mismo texto, con título «Jornadas de voluntariado» como `h2` aparte (como hoy).
- [ ] **Step 4: Correr la suite de la web** — las pruebas de `Portada.test.tsx` y `Jornadas.test.tsx` que buscaban «Reservar cupo» o la tarjeta se ajustan a la fila. → PASS.
- [ ] **Step 5: Commit** (`Web: fila de jornada con bloque de fecha`)

### Task 2: P7 con la tira de días

**Files:**
- Modify: `apps/web/src/portal/turnos/Jornadas.tsx`, `apps/web/src/portal/turnos/Jornadas.test.tsx`

**Interfaces:**
- Consumes: `TiraDias`, `diasDeLaTira(hoy, cantidad, conEventos)`, `DiaTira`, `FilaJornada` (tarea 1), `retrasoEntrada(i)`.
- Produces: nada nuevo para otras tareas.

Cambios:
- El filtro «Día» sale de los botones de arriba y de la hoja (`Clave` queda en `'lugar' | 'perfil'`). La URL sigue usando `dia=AAAA-MM-DD`.
- Una `TiraDias` con `etiqueta="Día"` entre los filtros y `Segmentado`. Sus días: primero `{ clave: 'todos', arriba: 'Todos', numero: String(total), nombre: 'Todos los días', conEventos: false }`, con `total` igual al número de jornadas sin filtrar; después `diasDeLaTira(new Date(), cantidad, conEventos)`, con `conEventos` el conjunto de `diaBogota(j.inicio)` de todas las jornadas y `cantidad` igual a los días hasta la última jornada, entre 7 y 30.
- `elegido` es `filtro.desde ?? 'todos'`. Elegir `todos` quita `dia`; elegir otro lo fija con `replace`.
- La lista ya no agrupa por día: es una columna de `FilaJornada`, cada una con `entra-lista` y `retrasoEntrada(i)`. El contenedor lleva `key` con el día y el chip, así la entrada se repite al filtrar.
- Las jornadas del lugar elegido en el mapa también usan `FilaJornada`.
- `SinJornadas` usa `ilustracion="calendario"` y su botón «Quitar los filtros» pasa a `Boton variante="secundario"`. El mensaje de mapa vacío usa `ilustracion="calendario"`.

- [ ] **Step 1: Escribir y ajustar las pruebas**

```tsx
it('la tira filtra por día y «Todos» quita el filtro', async () => {
  // dos jornadas en días distintos; vista lista
  await userEvent.click(screen.getByRole('button', { name: /^Jueves 22/ }));
  expect(ubicacion().search).toContain('dia=2026-10-22');
  await userEvent.click(screen.getByRole('button', { name: 'Todos los días' }));
  expect(ubicacion().search).not.toContain('dia=');
});
it('ya no hay filtro «Día» en la hoja ni encabezados por día', () => {
  expect(screen.queryByRole('button', { name: 'Día' })).toBeNull();
  expect(screen.queryByRole('region', { name: /^Hoy,/ })).toBeNull();
});
it('un ?dia= fuera de la tira filtra igual y no marca ningún día', () => {
  // ruta /voluntariado?vista=lista&dia=2027-01-15
  expect(screen.getAllByRole('button', { pressed: true }).filter((b) => b.closest('[aria-label="Día"]'))).toHaveLength(0);
});
```

Las pruebas que usaban el filtro de día por la hoja o los encabezados «Hoy, …» se reescriben con la tira, comprobando lo mismo (qué jornadas quedan y qué pide la URL). La hora de las pruebas se fija con `vi.setSystemTime` donde la tira dependa de «hoy».

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/turnos/Jornadas.test.tsx` → FAIL.
- [ ] **Step 3: Implementar los cambios de `Jornadas.tsx`**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: P7 con tira de días y filas de jornada`)

### Task 3: Franja de la Portada

**Files:**
- Create: `apps/web/src/portal/bloques/franja.ts`, `apps/web/src/portal/bloques/franja.test.ts`, `apps/web/src/portal/bloques/CurvasNivel.tsx`
- Modify: `apps/web/src/portal/Portada.tsx`, `apps/web/src/portal/bloques/SelectorEmergencia.tsx`, `apps/web/src/portal/Portada.test.tsx`

**Interfaces:**
- Consumes: `useBalance`, `useNecesidades`, `Desplegable`, clases `gira`, `latido`, `prefiereMenosMovimiento`.
- Produces:
  - `acopiosConFaltantes(necesidades: Pick<NecesidadAcopio, 'acopioId' | 'faltan'>[]): number`, los acopios con al menos una categoría en `faltan`.
  - `tituloFranja(categorias: number, acopios: number): string`:
    - `0` → «Hoy ningún acopio reporta faltantes.»
    - `1, 1` → «Hoy falta 1 categoría en 1 acopio.»
    - `5, 3` → «Hoy faltan 5 categorías en 3 acopios.»
  - `useCuenta(meta: number, ms = 700): number` en `franja.ts`: con menos movimiento devuelve `meta` de una vez; si no, sube de 0 a `meta` con `requestAnimationFrame`.
  - `CurvasNivel()`: SVG `aria-hidden`, `pointer-events-none`, `absolute inset-0`, trazos `stroke-primary-fixed-dim` con `opacity-[.16]`, quieto.

Cambios en la franja: `section` con `relative overflow-hidden` y `CurvasNivel` detrás. Debajo del selector, una línea `text-body-sm text-primary-fixed-dim` con un punto `latido` `bg-primary-fixed` de 8 px y «Datos de los acopios». El `h1` lleva `tituloFranja(...)` cuando balance y necesidades cargaron; mientras cargan o si alguno falla, el texto de hoy. La cifra visible sale de `useCuenta(N)` dentro de un `span aria-hidden`, y la frase final va en un `span sr-only`. El párrafo de abajo no cambia. Sin emergencias, el bloque «No hay emergencias activas» queda en la franja y debajo, en el cuerpo, un `EstadoVacio` con `ilustracion="cajas"` (tarea 4).

`SelectorEmergencia`: la lista pasa a un `Desplegable abierto={abierto}` siempre montado cuando hay varias, y el chevron lleva `gira` y `abierto`. El menú cerrado queda `inert`, así las pruebas que buscan `role="menu"` cerrado siguen sin encontrarlo con `getByRole`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
it('tituloFranja', () => {
  expect(tituloFranja(0, 0)).toBe('Hoy ningún acopio reporta faltantes.');
  expect(tituloFranja(1, 1)).toBe('Hoy falta 1 categoría en 1 acopio.');
  expect(tituloFranja(5, 3)).toBe('Hoy faltan 5 categorías en 3 acopios.');
});
it('acopiosConFaltantes no repite acopios ni cuenta los que no tienen faltantes', () => {
  expect(acopiosConFaltantes([
    { acopioId: 'a', faltan: [c1, c2] }, { acopioId: 'b', faltan: [] }, { acopioId: 'c', faltan: [c1] },
  ])).toBe(2);
});
```

En `Portada.test.tsx`:

```tsx
it('el título dice cuántas categorías faltan y en cuántos acopios', async () => {
  // balance con 2 faltan; necesidades con 2 acopios, uno sin faltantes
  expect(await screen.findByRole('heading', { level: 1, name: 'Hoy faltan 2 categorías en 1 acopio.' })).toBeInTheDocument();
});
it('sin faltantes, el título lo dice', async () => { /* name: 'Hoy ningún acopio reporta faltantes.' */ });
it('mientras carga el balance, queda el título de hoy', () => { /* 'Revisa qué hace falta antes de donar.' */ });
```

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/bloques/franja.test.ts src/portal/Portada.test.tsx` → FAIL.
- [ ] **Step 3: Implementar `franja.ts`, `CurvasNivel`, la franja y el selector**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: franja de la Portada con la cifra real`)

### Task 4: Balance, «¿Cómo apoyar?» y vacíos de la Portada

**Files:**
- Modify: `apps/web/src/portal/bloques/BalanceRecepcion.tsx`, `ComoApoyar.tsx`, `SeccionVacia.tsx`, `RastrearFolio.tsx`, `apps/web/src/portal/Portada.tsx`, sus pruebas en `Portada.test.tsx`

**Interfaces:**
- Consumes: `Barra`, `EstadoVacio` con `ilustracion`, `Boton`, `Icono`.
- Produces: `SeccionVacia({ id, titulo, vacio, ilustracion, children })`. Cambia la prop `icono` por `ilustracion: NombreIlustracion` y suma `vacio: string`, el título del `EstadoVacio` que va bajo el `h2`. El reporte en terreno lo usa con `vacio="Todavía no hay reportes"` y el texto de hoy.

Cambios:
- Balance: cada fila de «Qué hace falta» lleva debajo una `Barra` con `valor = f.acopios`, `total` = el mayor `acopios` de la lista y `etiqueta = "<categoría>: falta en N acopios"`. El texto de la fila sigue «Falta en N acopios». `/api/publico/necesidades` no lista todos los acopios abiertos (omite los que no tienen umbrales ni marcas), así que se usa el caso del spec que mide contra el mayor valor. Se anota en «Cambios al construir».
- Pestañas del balance: una píldora deslizante como la de `Segmentado`, un `span aria-hidden data-pildora` absoluto que se mueve con `translateX` en 300 ms. Su color sigue a la pestaña (`bg-primary-container` o `bg-secondary-container`). Las pestañas siguen siendo `role="tab"`.
- «¿Cómo apoyar?»: ícono en un recuadro `h-10 w-10 rounded-lg bg-primary-fixed text-primary-container`, la línea de detalle `text-body-sm text-on-surface-variant` con los textos fijos del spec («Busca el acopio más cercano», «Directo en el sitio de la entidad», «Reserva un cupo en una jornada»), `toque` en la fila y el chevron con `avanza`.
- Rastrear folio: el botón «Consultar» pasa a `Boton` (`type="submit"`, alto 44 → 48).
- Vacíos: sin emergencias → `EstadoVacio` «Sin emergencias activas» con `ilustracion="cajas"` en el cuerpo de la Portada; reporte en terreno → `ilustracion="mapa"`; jornadas → `calendario` (tarea 1). El folio de la Portada no tiene estado vacío propio; su ilustración va en P10 (tarea 7).

- [ ] **Step 1: Escribir las pruebas que fallan** en `Portada.test.tsx`:

```tsx
it('cada faltante lleva su barra medida contra el mayor', async () => {
  // faltan: Agua en 4, Aseo en 2
  const barras = await screen.findAllByRole('meter');
  expect(barras.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['4', '2']);
  expect(barras.every((b) => b.getAttribute('aria-valuemax') === '4')).toBe(true);
});
it('«¿Cómo apoyar?» trae la línea de cada canal', () => {
  expect(screen.getByRole('link', { name: /Donar productos.*Busca el acopio más cercano/ })).toBeInTheDocument();
});
it('los vacíos llevan su ilustración', async () => {
  expect(await screen.findByRole('img', { name: 'Mapa de curvas de nivel con un punto marcado' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/Portada.test.tsx` → FAIL.
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: balance con barras y vacíos ilustrados en la Portada`)

### Task 5: Reservar y Mi reserva

**Files:**
- Modify: `apps/web/src/portal/turnos/Reservar.tsx`, `apps/web/src/portal/turnos/MiReserva.tsx` y sus pruebas

**Interfaces:**
- Consumes: `BloqueFecha tamano="detalle"`, `SelloConfirmacion`, `Ilustracion`, `Boton ocupado`.

Cambios:
- Reservar: el título va en una fila con el `BloqueFecha` de detalle a la izquierda, `apagado` si la jornada no acepta reservas. La línea `Dato icono="event"` se queda con la fecha en texto y el horario. El botón «Reservar» usa `ocupado={reservar.isPending}` y el texto «Reservando…» mientras corre. `Detalle` lleva `aparece`.
- Mi reserva: el círculo con `check` se cambia por `SelloConfirmacion etiqueta="Reserva confirmada"`. La sección «La jornada» lleva el bloque de detalle junto al título. La reserva cancelada (`Cancelaste tu reserva`) y la jornada cancelada muestran el bloque `apagado` y la etiqueta «Cancelada». `Mensaje` (enlace incompleto, reserva no encontrada) dibuja `Ilustracion nombre="calendario" className="w-28"` en lugar del ícono. «Cancelar reserva» en la hoja usa `ocupado={cancelar.isPending}` con «Cancelando…».

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
// Reservar.test.tsx
it('el detalle muestra el bloque de fecha junto al título', async () => {
  expect(await screen.findByText('Jueves 22 de octubre', { selector: '.sr-only' })).toBeInTheDocument();
});
it('mientras reserva, el botón está ocupado y no envía dos veces', async () => {
  // POST que no responde todavía; dos clics
  expect(screen.getByRole('button', { name: /Reservando/ })).toHaveAttribute('aria-busy', 'true');
  expect(llamadasPost).toBe(1);
});
// MiReserva.test.tsx
it('la reserva activa muestra el sello', async () => {
  expect(await screen.findByRole('img', { name: 'Reserva confirmada' })).toBeInTheDocument();
});
it('sin reserva, el mensaje lleva el calendario', async () => {
  expect(await screen.findByRole('img', { name: 'Calendario con una planta que brota' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/turnos` → FAIL.
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: reservar y mi reserva con fecha, sello y botón ocupado`)

### Task 6: Donador: folio, confirmar correo y mis donaciones

**Files:**
- Modify: `apps/web/src/donador/PasoFolio.tsx`, `Confirmar.tsx`, `MisDonaciones.tsx`, `Preparar.tsx` y sus pruebas

Cambios:
- P9 paso 3: arriba del título «Tu donación está preparada» va `SelloConfirmacion etiqueta="Donación preparada"`, centrado. Los botones de la factura usan `ocupado={subiendo}` en lugar de `disabled={subiendo}` (el que se tocó; el otro queda `disabled`).
- P9 pasos 1 y 2: el botón «Menos» de cantidad cambia `disabled:opacity-40` por `disabled:bg-surface-container-high disabled:text-on-surface-variant`. El botón de volver y el de quitar línea llevan `toque`.
- Confirmar correo: sobre «Elige tu contraseña» va `SelloConfirmacion etiqueta="Enlace verificado"`. El botón de enviar usa `ocupado={enviando}` con «Guardando…».
- Mis donaciones: el vacío lleva `ilustracion="caja-folio"`. La lista lleva `key={filtro}` y cada `li` `entra-lista` con `retrasoEntrada(i)`. Una donación cancelada o vencida lleva `opacity-70` y su etiqueta en `bg-surface-container-high text-on-surface-variant` (ya la tiene). «Sí, cancelar» usa `ocupado={cancelar.isPending}`. «Cancelar donación» pasa a `toque`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
it('el paso del folio muestra el sello', () => {
  expect(screen.getByRole('img', { name: 'Donación preparada' })).toBeInTheDocument();
});
it('confirmar correo muestra el sello del enlace', async () => {
  expect(await screen.findByRole('img', { name: 'Enlace verificado' })).toBeInTheDocument();
});
it('mis donaciones vacía lleva la caja con folio', async () => {
  expect(await screen.findByRole('img', { name: 'Caja con una etiqueta de folio' })).toBeInTheDocument();
});
it('cancelar una donación ocupa el botón y no manda dos veces', async () => { /* aria-busy y una sola llamada */ });
```

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/donador` → FAIL.
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: sello, botones ocupados y vacíos del Donador`)

### Task 7: Seguimiento, causas y mapa

**Files:**
- Modify: `apps/web/src/portal/Seguimiento.tsx`, `apps/web/src/portal/causas/piezas.tsx`, `Directorio.tsx`, `Atendidas.tsx`, `apps/web/src/portal/mapa/Mapa.tsx` y sus pruebas

Cambios:
- P10: antes de buscar, el recuadro con `tag` pasa a `EstadoVacio` «Escribe tu folio» con `ilustracion="caja-folio"` y el mismo texto. El resultado lleva `aparece`. El check de cada paso cumplido es un SVG pequeño con el trazo `sello-check` (`viewBox="12 14 36 30"`, `path d="M19 31 l7 7 l15 -16"`, `stroke-current`), así se traza al aparecer.
- Causas: `ImagenCausa` sin foto dibuja `Ilustracion` dentro del mismo recuadro `aspect-video`, `mapa` para `RESCATISTAS` y `cajas` para las demás categorías, en un contenedor `aria-hidden` (la imagen es decorativa como hoy). `Directorio` y `Atendidas` envuelven la lista con `key` del filtro y cada tarjeta con `entra-lista` y `retrasoEntrada(i)`. Sus vacíos llevan `ilustracion="cajas"`. Los chips de `Chips` llevan `toque`.
- P5: «Ningún acopio con esos filtros» lleva `ilustracion="mapa"`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
it('P10 sin folio muestra la caja con folio', () => {
  expect(screen.getByRole('img', { name: 'Caja con una etiqueta de folio' })).toBeInTheDocument();
});
it('una causa de rescatistas sin foto lleva el mapa', () => {
  const { container } = render(<ImagenCausa causa={causa({ categoria: 'RESCATISTAS', imagen: null })} />);
  expect(container.querySelector('svg[aria-label="Mapa de curvas de nivel con un punto marcado"]')).not.toBeNull();
});
it('P5 sin resultados lleva el mapa', async () => { /* role img con el nombre del mapa */ });
```

- [ ] **Step 2: Correr y ver que fallan** — `cd apps/web && bunx vitest run src/portal/Seguimiento.test.tsx src/portal/causas src/portal/mapa` → FAIL.
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Correr y ver que pasan** → PASS.
- [ ] **Step 5: Commit** (`Web: vacíos ilustrados y listas escalonadas en seguimiento, causas y mapa`)

### Task 8: Documentos, verificación y PR

**Files:**
- Modify: la especificación («Cambios al construir»), `docs/02-arquitectura/patrones-y-practicas.md` (`FilaJornada`, `tituloFranja`, `useCuenta`, `CurvasNivel`), las notas de las pantallas que cambian en `docs/03-diseno/stitch/` (una línea en sus diferencias), `docs/05-planes/plan-de-accion.md` (fila 22 y registro), la tabla de estado de este plan
- Create: `docs/06-operacion/sesiones/2026-10-21-linea-visual-fase-2.md` y su fila en el índice

- [ ] **Step 1: `node scripts/iconos.mjs` en `apps/web`** si entró un ícono nuevo.
- [ ] **Step 2: Verificación completa:** `bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bash scripts/revisar-colores.sh && bun run test && bun run test:int` (integración contra un PostgreSQL aparte) → todo con salida 0.
- [ ] **Step 3: Capturas a 360 px** de P1, P7, P8 y P9 con Playwright si el Compose está disponible; si no, se anota como pendiente con su enlace.
- [ ] **Step 4: Documentos, informe y commit** (`Docs: fase 2 de la línea visual`)
- [ ] **Step 5: Push y PR** hacia `main` con el resumen y el enlace al issue #177.
