---
title: "Línea visual, fase 1: piezas base y movimiento · plan"
type: plan
tags: [plan, web, diseno, ux]
estado: vigente
actualizado: 2026-10-21
---

# Línea visual, fase 1: piezas base y movimiento · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** dejar en `apps/web` las piezas comunes de la línea visual y el movimiento global, para que las fases 2 (portal) y 3 (consola) solo las apliquen pantalla por pantalla. Las piezas son el bloque de fecha, la tira de días, la barra que se llena, las ilustraciones, el sello y los botones con toque, inhabilitado sólido y ocupado. El movimiento global cubre la entrada de página, la hoja, los desplegables y la píldora deslizante.

**Arquitectura:** las animaciones son clases CSS con `@keyframes` en `src/estilos.css`, y la regla global de `prefers-reduced-motion` que ya existe las apaga. El estilo base de cada elemento es su estado final. Lo que decide algo (fechas, dirección de la entrada, si hay que esperar la salida de una hoja) vive en funciones puras con su prueba. Las piezas nuevas van en `src/componentes/`, y lo que toca el marco del portal (barra inferior, cabeceras, entrada de página) va en `src/portal/`.

**Stack:** React 19, React Router 8 (`BrowserRouter`), Tailwind 4 con `packages/ui-tokens`, Vitest con Testing Library y axe (`violacionesGraves`).

**Spec:** [2026-10-21-linea-visual-design.md](../superpowers/specs/2026-10-21-linea-visual-design.md). Maqueta: el lienzo <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 `partesFecha` y `diasDeLaTira` | ✅ | |
| 2 Clases de movimiento, `movimiento.ts` y esqueleto con brillo | ✅ | |
| 3 Botones: toque, inhabilitado sólido, ocupado y compacto | ✅ | |
| 4 Bloque de fecha | ✅ | |
| 5 Tira de días | ✅ | |
| 6 Barra que se llena | ✅ | |
| 7 Ilustraciones y estado vacío | ✅ | |
| 8 Sello de confirmación | ✅ | |
| 9 Hoja que entra y sale | ✅ | |
| 10 Píldora deslizante en `Segmentado` y en la barra inferior | ✅ | |
| 11 Desplegable en las cabeceras | ✅ | |
| 12 Entrada de página | ✅ | |
| 13 Documentos, verificación y PR | ✅ | Fusionada el 21 con el PR 178, a pedido de Joseph |

## Global Constraints

- Node 22, Bun 1.3, TypeScript 6.0. No entran dependencias nuevas ni librerías de animación.
- Español en código, nombres y textos.
- En `apps/web/src` no se escriben colores hexadecimales: `scripts/revisar-colores.sh` revisa `.ts`, `.tsx` y `.css`. Se usan clases de token (`bg-primary-fixed`, `fill-surface-tint`) o `var(--token)`. La tabla de equivalencias del lienzo está en el spec, sección «Restricciones».
- Las transparencias de hoy no se tocan: el velo de `Hoja` (`bg-inverse-surface/60`), la barra inferior (`bg-surface/90 backdrop-blur-xl`) y los fondos con opacidad.
- Curva común `cubic-bezier(.2,.8,.2,1)`. La hoja sube con `cubic-bezier(.2,.9,.25,1)`.
- Duraciones del spec: toque 150 ms, entrada de página 300 ms con 24 px de desplazamiento, hoja 380 ms y velo 250 ms, desplegable 300 ms, píldora 320 ms, barra 1 s, lista 60 ms por fila hasta la sexta, sello 500 ms, contenido tras cargar 200 ms y punto en vivo cada 2 s.
- Con «reducir movimiento», la regla de `estilos.css` deja `animation: none` y `transition: none`. Por eso el estilo base de un elemento animado es su estado final y los `@keyframes` solo definen el `from`.
- Fechas en hora de Bogotá con los ayudantes de `src/formato.ts`.
- Íconos nuevos: correr `node scripts/iconos.mjs` en `apps/web`. `src/iconos.test.ts` falla si falta alguno.
- Al cerrar cada tarea: `bun run --filter @acopio/web test && bun run --filter @acopio/web typecheck`. Vitest quita los tipos sin revisarlos.
- Una rama `linea-visual-fase-1` y un PR para toda la fase, con pocos commits agrupados por tema.

## Review Focus

1. Con «reducir movimiento» encendido, el sello, la barra y el contenido de la página se ven en su estado final y no a medias. Pruebas en las tareas 6 y 12; revisión visual en la 13.
2. Una fecha cerca de la medianoche de Bogotá se muestra con el día de Colombia aunque el navegador esté en otra zona. Prueba en la tarea 1.
3. Cerrar una hoja dos veces durante su salida (Escape y luego tocar el velo) llama a `alCerrar` una sola vez. Prueba en la tarea 9.
4. Una barra con total 0 no dibuja `NaN%`. Prueba en la tarea 6.
5. El botón «atrás» del navegador hace entrar la página desde la izquierda, y un botón ocupado no responde al clic. Pruebas en las tareas 12 y 3.

---

### Task 1: `partesFecha` y `diasDeLaTira`

**Files:**
- Modify: `apps/web/src/formato.ts`
- Test: `apps/web/src/formato.test.ts`

**Interfaces:**
- Produces:
  - `partesFecha(fecha: string, hoy?: Date): { semana: string; dia: string; mes: string; lejana: boolean }`. `semana` y `mes` van abreviados, en minúscula y sin punto («jue», «nov»). `dia` va sin cero a la izquierda. `lejana` es verdadero si el día de Bogotá de `fecha` no está entre hoy y hoy + 6.
  - `interface DiaTira { clave: string; arriba: string; numero: string; nombre: string; conEventos: boolean }`.
  - `diasDeLaTira(hoy: Date, cantidad: number, conEventos: Set<string>): DiaTira[]`. `clave` es `YYYY-MM-DD` (de `diaBogota`), `arriba` es «Hoy» en el primer día y `semana` en los demás, y `nombre` sale de `diaSemana`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
describe('partesFecha', () => {
  const hoy = new Date('2026-10-21T15:00:00Z'); // miércoles 21 en Bogotá
  it('día de la semana, número y mes en hora de Bogotá', () => {
    expect(partesFecha('2026-10-22T13:00:00Z', hoy)).toEqual({ semana: 'jue', dia: '22', mes: 'oct', lejana: false });
  });
  it('cerca de la medianoche cuenta el día de Colombia', () => {
    // 04:30 UTC del 23 son las 23:30 del 22 en Bogotá (UTC-5)
    expect(partesFecha('2026-10-23T04:30:00Z', hoy)).toMatchObject({ semana: 'jue', dia: '22' });
  });
  it('hoy + 6 está cerca y hoy + 7 ya es lejana', () => {
    expect(partesFecha('2026-10-27T15:00:00Z', hoy).lejana).toBe(false); // martes 27
    expect(partesFecha('2026-10-28T15:00:00Z', hoy).lejana).toBe(true);
  });
  it('una fecha pasada o a doce días es lejana y trae el mes', () => {
    expect(partesFecha('2026-10-20T15:00:00Z', hoy).lejana).toBe(true);
    expect(partesFecha('2026-11-02T15:00:00Z', hoy)).toEqual({ semana: 'lun', dia: '2', mes: 'nov', lejana: true });
  });
});

describe('diasDeLaTira', () => {
  it('arranca en Hoy y marca los días con eventos', () => {
    const dias = diasDeLaTira(new Date('2026-10-21T15:00:00Z'), 3, new Set(['2026-10-22']));
    expect(dias).toEqual([
      { clave: '2026-10-21', arriba: 'Hoy', numero: '21', nombre: 'Miércoles 21 de octubre', conEventos: false },
      { clave: '2026-10-22', arriba: 'jue', numero: '22', nombre: 'Jueves 22 de octubre', conEventos: true },
      { clave: '2026-10-23', arriba: 'vie', numero: '23', nombre: 'Viernes 23 de octubre', conEventos: false },
    ]);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/formato.test.ts`
Expected: FAIL, `partesFecha is not a function`

- [ ] **Step 3: Implementar las dos funciones en `formato.ts`**

Con `Intl.DateTimeFormat('es-CO', { timeZone: BOGOTA, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts`, quitando el punto y pasando a minúscula. La diferencia de días resta las fechas `YYYY-MM-DD` de `diaBogota` leídas como mediodía UTC. `diasDeLaTira` suma días al día de Bogotá de `hoy` sobre esa misma base.

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd apps/web && bunx vitest run src/formato.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: partesFecha y diasDeLaTira para el bloque de fecha`)

### Task 2: Clases de movimiento, `movimiento.ts` y esqueleto con brillo

**Files:**
- Modify: `apps/web/src/estilos.css`
- Create: `apps/web/src/componentes/movimiento.ts`
- Modify: `apps/web/src/componentes/Esqueleto.tsx`
- Test: `apps/web/src/componentes/movimiento.test.ts`

**Interfaces:**
- Produces, en `estilos.css` dentro de `@layer components`. Todas usan `var(--curva)`, que vale `cubic-bezier(.2,.8,.2,1)` y se declara en `:root` del mismo archivo:

  | Clase | Efecto |
  |---|---|
  | `toque` | `transition: transform 150ms`; con `:active` escala a .97; con `:disabled:active` no escala |
  | `avanza` | Ícono dentro de `.toque` que se corre 3 px a la derecha con `:hover` del padre |
  | `entra-adelante` / `entra-atras` | Entra desde `translateX(24px)` o `translateX(-24px)` con opacidad 0, en 300 ms |
  | `aparece` | Opacidad de 0 a 1 en 200 ms |
  | `entra-lista` | Sube 8 px y aparece en 400 ms; el retraso lo pone `retrasoEntrada` |
  | `latido` | Anillo `primary-fixed` que se expande cada 2 s, sin fin |
  | `esqueleto-brillo` | Degradado de `transparent` a `color-mix(in srgb, var(--surface-container-lowest) 60%, transparent)` que barre en 1,4 s, sin fin |
  | `desplegable` / `desplegable abierto` | `display: grid` con `grid-template-rows` de `0fr` a `1fr`, opacidad de 0 a 1 y `translateY(-6px)` a 0, en 300 ms |
  | `gira` | Rota 180° en 300 ms (chevron de un desplegable abierto) |
  | `sello`, `sello-aro`, `sello-check` | El círculo crece de .4 a 1.12 y vuelve a 1 en 500 ms; el aro se dibuja con `stroke-dasharray: 170` en 550 ms; el check se traza con `stroke-dasharray: 40` en 350 ms tras 350 ms de espera |
  | `hoja-entra` / `hoja-sale` | Sube desde `translateY(100%)` en 380 ms con `cubic-bezier(.2,.9,.25,1)`; baja a `translateY(100%)` en 250 ms con `forwards` |
  | `velo-entra` / `velo-sale` | Opacidad de 0 a 1 en 250 ms; de 1 a 0 en 250 ms con `forwards` |

  Además, `.icono { transition: font-variation-settings 250ms }` para que el relleno de un ícono cambie suave.
- Produces, en `movimiento.ts`:
  - `prefiereMenosMovimiento(): boolean`. Verdadero si `window.matchMedia` no existe (jsdom) o si coincide `(prefers-reduced-motion: reduce)`.
  - `retrasoEntrada(i: number): CSSProperties`. Devuelve `{ animationDelay: `${Math.min(i, 5) * 60}ms` }`.

- [ ] **Step 1: Escribir la prueba que falla**

```ts
it('sin matchMedia (jsdom) se comporta como con menos movimiento', () => {
  vi.stubGlobal('matchMedia', undefined);
  expect(prefiereMenosMovimiento()).toBe(true);
});
it('lee la preferencia del sistema', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
  expect(prefiereMenosMovimiento()).toBe(false);
});
it('el retraso crece 60 ms por fila y se detiene en la sexta', () => {
  expect(retrasoEntrada(0)).toEqual({ animationDelay: '0ms' });
  expect(retrasoEntrada(2)).toEqual({ animationDelay: '120ms' });
  expect(retrasoEntrada(9)).toEqual({ animationDelay: '300ms' });
});
```

Con `afterEach(() => vi.unstubAllGlobals())`.

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/web && bunx vitest run src/componentes/movimiento.test.ts`
Expected: FAIL, el módulo no existe

- [ ] **Step 3: Crear `movimiento.ts`, agregar las clases a `estilos.css` y cambiar `animate-pulse` por `esqueleto-brillo` en `Esqueleto`**

El fondo `bg-surface-container-high` del esqueleto se queda y el brillo va encima con `background-image`.

- [ ] **Step 4: Correr las pruebas y la revisión de colores**

Run: `cd apps/web && bunx vitest run src/componentes && cd ../.. && sh scripts/revisar-colores.sh`
Expected: PASS y «Sin colores hexadecimales fuera de packages/ui-tokens»

- [ ] **Step 5: Commit** (`Web: clases de movimiento y esqueleto con brillo`)

### Task 3: Botones: toque, inhabilitado sólido, ocupado y compacto

**Files:**
- Modify: `apps/web/src/componentes/Boton.tsx`
- Modify: `apps/web/src/componentes/Menu.tsx` (la `FilaMenu` enlazada lleva `toque`)
- Modify: `apps/web/index.html` (con `node scripts/iconos.mjs`)
- Test: `apps/web/src/componentes/componentes.test.tsx`

**Interfaces:**
- Consumes: clases `toque` y `avanza` (Task 2).
- Produces:
  - `Boton` acepta además `ocupado?: boolean` y `tamano?: 'normal' | 'compacto'`.
    - `ocupado` inhabilita el botón, pone `aria-busy="true"` y dibuja `<Icono nombre="progress_activity" className="animate-spin text-[20px]" />` antes del texto.
    - `compacto` cambia `min-h-[48px] px-space-md` por `min-h-[40px] px-space-sm`.
  - `EnlaceBoton` acepta `tamano`.
  - Las clases base suman `toque`. En lugar de `disabled:opacity-60` llevan `disabled:border-transparent disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:shadow-none`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
it('ocupado: inhabilitado, anuncia que trabaja y no responde al clic', async () => {
  const alPulsar = vi.fn();
  render(<Boton ocupado onClick={alPulsar}>Guardar</Boton>);
  const boton = screen.getByRole('button', { name: 'Guardar' });
  expect(boton).toBeDisabled();
  expect(boton).toHaveAttribute('aria-busy', 'true');
  await userEvent.click(boton);
  expect(alPulsar).not.toHaveBeenCalled();
});
it('inhabilitado usa relleno sólido y no transparencia', () => {
  render(<Boton disabled>Guardar</Boton>);
  const clases = screen.getByRole('button').className;
  expect(clases).toContain('disabled:bg-surface-container-high');
  expect(clases).not.toContain('opacity');
});
it('compacto mide 40 px de alto', () => {
  render(<Boton tamano="compacto">Reservar</Boton>);
  const clases = screen.getByRole('button').className;
  expect(clases).toContain('min-h-[40px]');
  expect(clases).not.toContain('min-h-[48px]');
});
```

Agregar `<Boton ocupado>Tres</Boton>` a la prueba de accesibilidad del bloque `estados`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/componentes.test.tsx`
Expected: FAIL en las tres nuevas

- [ ] **Step 3: Implementar en `Boton.tsx` y agregar `toque` a la fila enlazada de `FilaMenu`**

- [ ] **Step 4: Regenerar íconos y correr**

Run: `cd apps/web && node scripts/iconos.mjs && bunx vitest run src/componentes src/iconos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: botones con toque, inhabilitado sólido y estado ocupado`)

Los `disabled={x.isPending}` de las pantallas pasan a `ocupado` en las fases 2 y 3, pantalla por pantalla.

### Task 4: Bloque de fecha

**Files:**
- Create: `apps/web/src/componentes/BloqueFecha.tsx`
- Test: `apps/web/src/componentes/BloqueFecha.test.tsx`

**Interfaces:**
- Consumes: `partesFecha` (Task 1) y `diaSemana` de `formato.ts`.
- Produces: `BloqueFecha({ fecha, tamano = 'fila', apagado = false, hoy }: { fecha: string; tamano?: 'fila' | 'detalle'; apagado?: boolean; hoy?: Date })`.
  - Un `span` con dos líneas `aria-hidden`. Arriba va `mes` si `lejana` y si no `semana`, en `text-[12px] font-semibold`. Abajo va `dia` en `font-extrabold tabular-nums`. Además lleva un `span className="sr-only"` con `diaSemana(fecha)`.
  - Tamaños: `fila` es `h-14 w-[52px]` con el número en `text-[21px]`, y `detalle` es `h-[68px] w-16` con el número en `text-[26px]`. Los dos llevan `rounded-xl shrink-0`.
  - Color: `bg-primary-fixed text-on-primary-fixed`, o `bg-surface-container text-on-surface-variant` si `apagado`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
const hoy = new Date('2026-10-21T15:00:00Z');
it('muestra el día de la semana y el número, y lee la fecha completa', () => {
  render(<BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} />);
  expect(screen.getByText('jue')).toBeInTheDocument();
  expect(screen.getByText('22')).toBeInTheDocument();
  expect(screen.getByText('Jueves 22 de octubre')).toHaveClass('sr-only');
});
it('a más de siete días muestra el mes en lugar del día de la semana', () => {
  render(<BloqueFecha fecha="2026-11-02T15:00:00Z" hoy={hoy} />);
  expect(screen.getByText('nov')).toBeInTheDocument();
  expect(screen.queryByText('lun')).not.toBeInTheDocument();
});
it('apagado usa el gris sólido', () => {
  const { container } = render(<BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} apagado />);
  expect(container.firstChild).toHaveClass('bg-surface-container');
  expect(container.firstChild).not.toHaveClass('bg-primary-fixed');
});
it('no tiene violaciones graves', async () => {
  const { container } = render(<BloqueFecha fecha="2026-10-22T13:00:00Z" hoy={hoy} tamano="detalle" />);
  expect(await violacionesGraves(container)).toEqual([]);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/BloqueFecha.test.tsx`
Expected: FAIL, el módulo no existe

- [ ] **Step 3: Implementar `BloqueFecha.tsx`**

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd apps/web && bunx vitest run src/componentes/BloqueFecha.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: bloque de fecha`)

### Task 5: Tira de días

**Files:**
- Create: `apps/web/src/componentes/TiraDias.tsx`
- Test: `apps/web/src/componentes/TiraDias.test.tsx`

**Interfaces:**
- Consumes: `DiaTira` (Task 1) y `toque` (Task 2).
- Produces: `TiraDias({ etiqueta, dias, elegido, alElegir }: { etiqueta: string; dias: DiaTira[]; elegido: string; alElegir: (clave: string) => void })`.
  - Un `div role="group" aria-label={etiqueta}` que se desliza en horizontal, sin barra de desplazamiento visible.
  - Un `button` por día con `aria-pressed`, `aria-label={dia.nombre}` y `toque`, de `min-h-[64px] min-w-[52px]`. Muestra `arriba`, `numero` y, solo si `conEventos`, un punto `aria-hidden` con `data-punto`.
  - El elegido lleva `bg-primary-container text-on-primary` y punto `bg-primary-fixed`. Los demás llevan `bg-surface-container-lowest`, borde `outline-variant` y punto `bg-surface-tint`. Un día sin eventos lleva el texto en `text-outline`.
  - La opción «Todos» la arma quien llama, como un `DiaTira` más con `clave: 'todos'`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
const dias: DiaTira[] = [
  { clave: 'todos', arriba: 'Todos', numero: '5', nombre: 'Todos los días', conEventos: false },
  { clave: '2026-10-21', arriba: 'Hoy', numero: '21', nombre: 'Miércoles 21 de octubre', conEventos: false },
  { clave: '2026-10-22', arriba: 'jue', numero: '22', nombre: 'Jueves 22 de octubre', conEventos: true },
];
it('marca el elegido y avisa la clave del que se toca', async () => {
  const alElegir = vi.fn();
  render(<TiraDias etiqueta="Días" dias={dias} elegido="todos" alElegir={alElegir} />);
  expect(screen.getByRole('button', { name: 'Todos los días' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Jueves 22 de octubre' }));
  expect(alElegir).toHaveBeenCalledWith('2026-10-22');
});
it('solo los días con eventos llevan punto', () => {
  const { container } = render(<TiraDias etiqueta="Días" dias={dias} elegido="todos" alElegir={() => {}} />);
  expect(container.querySelectorAll('[data-punto]')).toHaveLength(1);
});
```

Más la prueba de accesibilidad con `violacionesGraves`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/TiraDias.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `TiraDias.tsx`**

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd apps/web && bunx vitest run src/componentes/TiraDias.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: tira de días`)

### Task 6: Barra que se llena

**Files:**
- Create: `apps/web/src/componentes/Barra.tsx`
- Test: `apps/web/src/componentes/Barra.test.tsx`

**Interfaces:**
- Consumes: `prefiereMenosMovimiento` (Task 2).
- Produces: `Barra({ valor, total, etiqueta, tono = 'marca', className }: { valor: number; total: number; etiqueta: string; tono?: 'marca' | 'aviso'; className?: string })`.
  - Un `div role="meter"` con `aria-label`, `aria-valuemin={0}`, `aria-valuemax={total}` y `aria-valuenow={valor}`, de 6 px de alto, `rounded-full` y fondo `bg-surface-container-high`.
  - El relleno es `bg-surface-tint`, o `bg-tertiary-container` con `tono="aviso"`. Su `width` es `Math.min(100, valor / total * 100)` en porcentaje, o 0 si `total <= 0`, con `transition: width 1s var(--curva)`.
  - Arranca en 0 y pasa al valor con un `setTimeout` de 30 ms después de montar. Si `prefiereMenosMovimiento()`, arranca lleno.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
it('es un medidor con su valor y su total', () => {
  render(<Barra valor={8} total={12} etiqueta="Cupos tomados" />);
  const barra = screen.getByRole('meter', { name: 'Cupos tomados' });
  expect(barra).toHaveAttribute('aria-valuenow', '8');
  expect(barra).toHaveAttribute('aria-valuemax', '12');
});
it('con menos movimiento (jsdom) se ve llena desde el principio', () => {
  render(<Barra valor={8} total={12} etiqueta="Cupos tomados" />);
  const relleno = screen.getByRole('meter').firstElementChild as HTMLElement;
  expect(relleno.style.width).toBe(`${(8 / 12) * 100}%`); // 66,66…%
});
it('con total 0 no dibuja NaN', () => {
  render(<Barra valor={0} total={0} etiqueta="Cupos tomados" />);
  expect((screen.getByRole('meter').firstElementChild as HTMLElement).style.width).toBe('0%');
});
it('el tono aviso usa el ámbar', () => {
  render(<Barra valor={11} total={12} etiqueta="Cupos tomados" tono="aviso" />);
  expect(screen.getByRole('meter').firstElementChild).toHaveClass('bg-tertiary-container');
});
```

Más la prueba de accesibilidad.

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/Barra.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `Barra.tsx`**

- [ ] **Step 4: Correr y ver que pasan**

Run: `cd apps/web && bunx vitest run src/componentes/Barra.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: barra que se llena`)

### Task 7: Ilustraciones y estado vacío

**Files:**
- Create: `apps/web/src/componentes/ilustraciones/Ilustracion.tsx`
- Modify: `apps/web/src/componentes/EstadoVacio.tsx`
- Test: `apps/web/src/componentes/componentes.test.tsx`

**Interfaces:**
- Produces:
  - `type NombreIlustracion = 'cajas' | 'calendario' | 'mapa' | 'caja-folio'`.
  - `Ilustracion({ nombre, className }: { nombre: NombreIlustracion; className?: string })`: un `svg` con `role="img"` y estos `aria-label`:
    - `cajas`: «Cajas de ayuda ordenadas en una bodega»
    - `calendario`: «Calendario con una planta que brota»
    - `mapa`: «Mapa de curvas de nivel con un punto marcado»
    - `caja-folio`: «Caja con una etiqueta de folio»
  - `EstadoVacio({ titulo, children, ilustracion }: { titulo: string; children: ReactNode; ilustracion?: NombreIlustracion })`. Con `ilustracion` la dibuja a la izquierda, de 96 px de ancho, con `gap-space-md` y el texto al lado. Sin ella se ve igual que hoy.

Los trazos se copian de `project/Vacios.dc.html` del lienzo (se lee con la herramienta Artifact, acción `read` con `path`). Cada hexadecimal pasa a su clase de token según la tabla del spec; por ejemplo, `fill="#b0efe1"` queda como `className="fill-primary-fixed"`. `mapa` es una versión compacta de 96 × 88 con los mismos elementos: tres curvas de nivel, la mancha y el pin. Ninguna se anima.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
it('EstadoVacio con ilustración la muestra con su nombre', () => {
  render(<EstadoVacio titulo="Sin jornadas" ilustracion="calendario">Todavía no hay jornadas.</EstadoVacio>);
  expect(screen.getByRole('img', { name: 'Calendario con una planta que brota' })).toBeInTheDocument();
});
it('EstadoVacio sin ilustración no dibuja imagen', () => {
  render(<EstadoVacio titulo="Sin jornadas">Todavía no hay jornadas.</EstadoVacio>);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
it.each(['cajas', 'calendario', 'mapa', 'caja-folio'] as const)('la ilustración %s tiene nombre', (nombre) => {
  render(<Ilustracion nombre={nombre} />);
  expect(screen.getByRole('img')).toHaveAccessibleName();
});
```

Agregar `<EstadoVacio titulo="Con dibujo" ilustracion="cajas">Texto</EstadoVacio>` a la prueba de accesibilidad del bloque `estados`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/componentes.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `Ilustracion.tsx` y la prop de `EstadoVacio`**

- [ ] **Step 4: Correr las pruebas y la revisión de colores**

Run: `cd apps/web && bunx vitest run src/componentes && cd ../.. && sh scripts/revisar-colores.sh`
Expected: PASS y sin hexadecimales

- [ ] **Step 5: Commit** (`Web: ilustraciones y estado vacío con dibujo`)

### Task 8: Sello de confirmación

**Files:**
- Create: `apps/web/src/componentes/SelloConfirmacion.tsx`
- Test: `apps/web/src/componentes/componentes.test.tsx`

**Interfaces:**
- Consumes: `sello`, `sello-aro` y `sello-check` (Task 2).
- Produces: `SelloConfirmacion({ etiqueta, className }: { etiqueta: string; className?: string })`. Un `svg` de 72 px con `viewBox="0 0 60 60"`, la clase `sello`, `role="img"` y `aria-label={etiqueta}`. Por dentro:
  - un círculo `fill-primary-fixed` de radio 27;
  - un aro `sello-aro` con `stroke-primary-container` de 3, rotado −90°;
  - el check `sello-check` en `M19 31 l7 7 l15 -16`, con `stroke-primary-container` de 4,5 y puntas redondas.

- [ ] **Step 1: Escribir la prueba que falla**

```tsx
it('SelloConfirmacion se lee con su etiqueta', () => {
  render(<SelloConfirmacion etiqueta="Cupo reservado" />);
  expect(screen.getByRole('img', { name: 'Cupo reservado' })).toHaveClass('sello');
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/web && bunx vitest run src/componentes/componentes.test.tsx -t SelloConfirmacion`
Expected: FAIL

- [ ] **Step 3: Implementar `SelloConfirmacion.tsx`**

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd apps/web && bunx vitest run src/componentes/componentes.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: sello de confirmación`)

### Task 9: Hoja que entra y sale

**Files:**
- Modify: `apps/web/src/componentes/Hoja.tsx`
- Test: `apps/web/src/componentes/Hoja.test.tsx`

**Interfaces:**
- Consumes: `prefiereMenosMovimiento` y las clases `hoja-entra`, `hoja-sale`, `velo-entra` y `velo-sale` (Task 2).
- Produces: la firma de hoy, sin cambios. Por dentro, Escape, el botón «Cerrar» y el velo llaman a una sola función `cerrar()`:
  - con `prefiereMenosMovimiento()`, llama a `alCerrar` de inmediato;
  - si no, marca `saliendo`, cambia las clases a `hoja-sale` y `velo-sale` y llama a `alCerrar` a los 250 ms;
  - una segunda llamada mientras `saliendo` no hace nada, y el temporizador se limpia al desmontar.

  El velo conserva `bg-inverse-surface/60`.

- [ ] **Step 1: Escribir las pruebas que fallan**

```tsx
describe('con animaciones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('espera la salida antes de cerrar', () => {
    render(<ConFormulario />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText('cerrada')).toBeInTheDocument();
  });

  it('cerrar dos veces durante la salida avisa una sola vez', () => {
    const alCerrar = vi.fn();
    render(<Hoja titulo="Prueba" alCerrar={alCerrar}><p>x</p></Hoja>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    act(() => vi.advanceTimersByTime(300));
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });
});
```

Las dos pruebas de hoy no cambian: en jsdom no hay `matchMedia` y la hoja cierra de inmediato.

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/componentes/Hoja.test.tsx`
Expected: FAIL en «espera la salida», porque hoy cierra de inmediato

- [ ] **Step 3: Implementar en `Hoja.tsx`**

- [ ] **Step 4: Correr toda la suite de la web**

Run: `cd apps/web && bunx vitest run`
Expected: PASS. Las pantallas con hojas siguen cerrando de inmediato en sus pruebas.

- [ ] **Step 5: Commit** (`Web: la hoja entra y sale con animación`)

### Task 10: Píldora deslizante en `Segmentado` y en la barra inferior

**Files:**
- Create: `apps/web/src/portal/secciones.ts`
- Modify: `apps/web/src/componentes/Segmentado.tsx`
- Modify: `apps/web/src/portal/BarraNavegacion.tsx`
- Test: `apps/web/src/componentes/Segmentado.test.tsx`, `apps/web/src/portal/BarraNavegacion.test.tsx` (nuevo), `apps/web/src/portal/secciones.test.ts` (nuevo)

**Interfaces:**
- Produces:
  - `secciones.ts` exporta `DESTINOS`, el arreglo que hoy vive en `BarraNavegacion`, sin cambios, y `seccionDe(ruta: string): number`, que da el índice en `DESTINOS`:
    - `/` exacto: 0
    - `/mapa` y `/acopios/…`: 1
    - `/causas…`: 2
    - `/voluntariado…`: 3
    - `/mas` y `/consola/…`: 4
    - cualquier otra ruta: −1
  - En `Segmentado`, un `span aria-hidden data-pildora` absoluto con `bg-primary-container rounded-lg`. Lleva `top`, `bottom` y `left` de `0.25rem`, `width: calc((100% - 0.5rem - (n - 1) * 0.25rem) / n)` y `transform: translateX(calc(i * (100% + 0.25rem)))`, con `transition: transform 320ms var(--curva)`. Las etiquetas quedan encima (`relative`). Dejan `has-checked:bg-primary-container` y conservan `has-checked:text-on-primary`.
  - En `BarraNavegacion`, la lista pasa a `grid grid-cols-5`. Una píldora `aria-hidden` con `data-posicion={i}`, de 56 × 32 px, `bg-primary-fixed rounded-full`, va detrás del ícono de la sección `seccionDe(ruta)` y se mueve con `transition: left 320ms`. Con −1 no se dibuja. El fondo translúcido de la barra no cambia.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
// secciones.test.ts
it.each([
  ['/', 0], ['/mapa', 1], ['/acopios/abc', 1], ['/causas/x', 2],
  ['/voluntariado/123', 3], ['/mas', 4], ['/consola/turnos', 4], ['/privacidad', -1],
])('seccionDe(%s) = %i', (ruta, i) => expect(seccionDe(ruta)).toBe(i));
```

```tsx
// BarraNavegacion.test.tsx
it.each([['/voluntariado', '3'], ['/consola/turnos', '4']])('en %s la píldora va en %s', (ruta, pos) => {
  const { container } = render(<MemoryRouter initialEntries={[ruta]}><BarraNavegacion /></MemoryRouter>);
  expect(container.querySelector('[data-posicion]')).toHaveAttribute('data-posicion', pos);
});
it('fuera de las secciones no hay píldora', () => {
  const { container } = render(<MemoryRouter initialEntries={['/privacidad']}><BarraNavegacion /></MemoryRouter>);
  expect(container.querySelector('[data-posicion]')).toBeNull();
});
```

```tsx
// Segmentado.test.tsx, prueba nueva
it('la píldora se mueve a la opción elegida', async () => {
  const { container } = render(<Prueba />);
  await userEvent.click(screen.getByRole('radio', { name: 'Pausado' }));
  expect((container.querySelector('[data-pildora]') as HTMLElement).style.transform).toBe('translateX(calc(1 * (100% + 0.25rem)))');
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/portal/secciones.test.ts src/portal/BarraNavegacion.test.tsx src/componentes/Segmentado.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `secciones.ts`, la píldora de `Segmentado` y la de `BarraNavegacion`**

`seccionDe` reemplaza a `marcadaPor` en `BarraNavegacion`. `aria-current="page"` sigue en el enlace de la sección activa, con la regla de hoy para `/consola` y `/acopios/`.

- [ ] **Step 4: Correr toda la suite de la web**

Run: `cd apps/web && bunx vitest run`
Expected: PASS

- [ ] **Step 5: Commit** (`Web: píldora deslizante en Segmentado y en la barra inferior`)

### Task 11: Desplegable en las cabeceras

**Files:**
- Create: `apps/web/src/componentes/Desplegable.tsx`
- Modify: `apps/web/src/portal/cabecera/CabeceraConSesion.tsx`, `apps/web/src/portal/cabecera/SelectorUbicacion.tsx`
- Test: `apps/web/src/componentes/componentes.test.tsx`; las de `portal/cabecera/` sin cambios

**Interfaces:**
- Consumes: `desplegable`, `abierto` y `gira` (Task 2).
- Produces: `Desplegable({ abierto, className, children }: { abierto: boolean; className?: string; children: ReactNode })`. Un `div` con `desplegable`, más `abierto` cuando corresponde, `aria-hidden={!abierto}` e `inert={!abierto}`, y por dentro un `div className="overflow-hidden"` con los hijos. Siempre está montado, así que anima al abrir y al cerrar.

En las dos cabeceras el menú deja de montarse con `{abierto && …}` y va dentro de `<Desplegable abierto={abierto}>`. El ícono `expand_more` lleva `gira` cuando está abierto. Lo que posiciona el menú (`absolute right-0 mt-space-xs w-64`) pasa al `className` del `Desplegable`.

- [ ] **Step 1: Escribir la prueba que falla**

```tsx
it('Desplegable cerrado esconde su contenido a los lectores y abierto lo muestra', () => {
  const { rerender } = render(<Desplegable abierto={false}><button>Salir</button></Desplegable>);
  expect(screen.queryByRole('button', { name: 'Salir' })).not.toBeInTheDocument();
  rerender(<Desplegable abierto><button>Salir</button></Desplegable>);
  expect(screen.getByRole('button', { name: 'Salir' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd apps/web && bunx vitest run src/componentes/componentes.test.tsx -t Desplegable`
Expected: FAIL

- [ ] **Step 3: Implementar `Desplegable.tsx` y usarlo en las dos cabeceras**

- [ ] **Step 4: Correr las pruebas de cabecera sin tocarlas**

Run: `cd apps/web && bunx vitest run src/componentes src/portal/cabecera`
Expected: PASS. Si alguna prueba de cabecera buscaba el menú cerrado con `container.querySelector`, se cambia a `queryByRole`, que respeta `aria-hidden`, y se anota en el PR.

- [ ] **Step 5: Commit** (`Web: desplegable animado en las cabeceras`)

### Task 12: Entrada de página

**Files:**
- Create: `apps/web/src/portal/direccion.ts`
- Modify: `apps/web/src/portal/MarcoPortal.tsx`
- Test: `apps/web/src/portal/direccion.test.ts`, `apps/web/src/portal/MarcoPortal.test.tsx` (nuevo)

**Interfaces:**
- Consumes: `seccionDe` (Task 10), `entra-adelante` y `entra-atras` (Task 2).
- Produces: `direccionEntre(anterior: string | null, actual: string, tipo: 'POP' | 'PUSH' | 'REPLACE'): 'adelante' | 'atras' | 'ninguna'`, con estas reglas en orden:
  1. `anterior` nulo o igual a `actual`: `ninguna`.
  2. `tipo === 'POP'`: `atras`.
  3. Las dos secciones son conocidas (≥ 0) y distintas: `adelante` si la de `actual` es mayor, `atras` si no.
  4. En otro caso: `adelante` si `actual` tiene más segmentos que `anterior`, `atras` si tiene menos y `adelante` si tienen los mismos.

`MarcoPortal` guarda la ruta anterior en un `useRef`, que se actualiza en un efecto, y lee `useNavigationType()`. Envuelve el `Suspense` en `<div key={pathname} className={`flex w-full flex-1 flex-col ${clase}`}>`, donde la clase es `entra-adelante`, `entra-atras` o ninguna. `main` suma `overflow-x-clip` para que el desplazamiento no abra una barra horizontal.

- [ ] **Step 1: Escribir las pruebas que fallan**

```ts
it.each([
  [null, '/', 'PUSH', 'ninguna'],
  ['/', '/', 'PUSH', 'ninguna'],
  ['/voluntariado/1', '/voluntariado', 'POP', 'atras'],
  ['/', '/mapa', 'PUSH', 'adelante'],
  ['/voluntariado', '/causas', 'PUSH', 'atras'],
  ['/voluntariado', '/voluntariado/1', 'PUSH', 'adelante'],
  ['/consola/turnos/1', '/consola/turnos', 'PUSH', 'atras'],
  ['/privacidad', '/seguimiento', 'PUSH', 'adelante'],
] as const)('de %s a %s (%s) es %s', (a, b, t, esperado) => {
  expect(direccionEntre(a, b, t)).toBe(esperado);
});
```

```tsx
// MarcoPortal.test.tsx, con envolver(...) de src/pruebas/utilidades.tsx en '/'.
// Rutas: MarcoPortal con los hijos '/' → <p>inicio</p> y '/mapa' → <p>mapa</p>
it('al tocar Mapa en la barra, la página entra desde la derecha', async () => {
  await userEvent.click(screen.getByRole('link', { name: 'Mapa' }));
  expect(await screen.findByText('mapa')).toBeInTheDocument();
  expect(screen.getByText('mapa').closest('.entra-adelante')).not.toBeNull();
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `cd apps/web && bunx vitest run src/portal/direccion.test.ts src/portal/MarcoPortal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implementar `direccion.ts` y el envoltorio de `MarcoPortal`**

- [ ] **Step 4: Correr toda la suite y el typecheck**

Run: `cd apps/web && bunx vitest run && cd ../.. && bun run --filter @acopio/web typecheck`
Expected: PASS y sin errores de tipos

- [ ] **Step 5: Commit** (`Web: entrada de página según la dirección`)

### Task 13: Documentos, verificación y PR

**Files:**
- Create: `docs/02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md` (el número se confirma con `ls docs/02-arquitectura/adr/`), con su fila en el `README.md` de esa carpeta
- Modify: `docs/03-diseno/sistema-diseno.md` (§5, §6, §8 y la fila «Batería baja» de §1), `docs/03-diseno/stitch/_compartidos/README.md`, `docs/02-arquitectura/patrones-y-practicas.md`, `docs/05-planes/plan-de-accion.md` y la tabla de estado de este plan
- Create: `docs/06-operacion/sesiones/2026-10-21-linea-visual-fase-1.md` con la plantilla, y su fila en el índice

- [ ] **Step 1: Issue de la línea visual.** `gh issue create` con las etiquetas `diseño` y `enhancement`. El cuerpo enlaza el spec, el lienzo y este plan, y lleva una casilla por fase. Se anota el número.

- [ ] **Step 2: ADR y bóveda.**
  - El ADR dice que las piezas y el movimiento salen del lienzo que Joseph aprobó el 2026-10-21 y que Stitch sigue fijando la estructura de cada pantalla. Dice también que las ilustraciones propias reemplazan la regla «cero ilustración» y que lo único que se repite solo es el punto en vivo. Aclara ADR-0013.
  - En el sistema de diseño se actualizan §5 (piezas nuevas), §6 (la tabla de movimiento del spec), §8 (imagen) y la fila «Batería baja».
  - `_compartidos` suma las piezas con el enlace al lienzo.
  - El catálogo de `patrones-y-practicas.md` suma `BloqueFecha`, `TiraDias`, `Barra`, `Ilustracion`, `SelloConfirmacion`, `Desplegable`, `partesFecha`, `diasDeLaTira`, `direccionEntre`, `seccionDe` y las clases de movimiento.
  - Cada texto pasa por humanizer en el mismo turno en que se escribe.

- [ ] **Step 3: Verificación completa**

Run, desde la raíz, con el PostgreSQL de pruebas levantado aparte como dice el CLAUDE.md:
```bash
set -o pipefail && bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && sh scripts/revisar-colores.sh && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int; echo "salida: $?"
```
Expected: `salida: 0`

- [ ] **Step 4: Revisión visual.** Con la web en `localhost:5173` contra la API del Compose, Playwright toma capturas a 360 px de Más con el menú de la cuenta abierto, de C14 con `Segmentado` y de una navegación de Inicio a Mapa. Se repiten con `reducedMotion: 'reduce'` para comprobar que nada queda a medias. Las capturas van en la carpeta de la sesión. Las `construida.png` de cada pantalla cambian en las fases 2 y 3.

- [ ] **Step 5: Recorridos.** Se corren los de `apps/web/recorridos/` como dice `docs/06-operacion/recorridos.md`. Expected: todos en verde.

- [ ] **Step 6: Commit de documentos, push y PR.** Un commit `Docs: ADR-0022 y línea visual en la bóveda`, luego `git push -u origin linea-visual-fase-1` y `gh pr create`. El cuerpo, escrito con humanizer, enlaza el issue con «Refs #N», porque el issue sigue abierto para las fases 2 y 3.

- [ ] **Step 7: Fusión.** `gh pr checks <n> --watch`, cero alertas abiertas de code scanning, el comentario «Revisado» y `gh pr merge <n> --merge`, como dice el CLAUDE.md. Después se actualizan este plan y el plan de acción con su registro de cambios, se comenta el avance en el issue y se ajusta la memoria «Stitch manda en estética» al ADR.
