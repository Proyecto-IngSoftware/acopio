---
title: "Línea visual, fase 3: la consola · plan"
type: plan
tags: [plan, web, diseno, ux, consola]
estado: vigente
actualizado: 2026-10-21
---

# Línea visual, fase 3: la consola · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** llevar a la consola (C01 a C22, mi acopio y mi zona) las piezas de la [fase 1](2026-10-21-linea-visual-fase-1.md), con la misma paridad que dejó la [fase 2](2026-10-21-linea-visual-fase-2.md) en el portal: bloque de fecha en C14, sello en las confirmaciones, botones que giran mientras esperan, inhabilitado sólido, vacíos ilustrados, estados desactivados con etiqueta y listas que entran escalonadas.

**Arquitectura:** no hay piezas nuevas. Cada tarea cambia pantallas de `apps/web/src/consola/` (y `acceso/` para C01) para usar `BloqueFecha`, `SelloConfirmacion`, `Boton ocupado`, `EstadoVacio` con `ilustracion` y las clases `entra-lista` y `toque`. La API no cambia.

**Stack:** React 19, React Router 8, TanStack Query, Tailwind 4 con `packages/ui-tokens`, Vitest con Testing Library y axe.

**Spec:** [2026-10-21-linea-visual-design.md](../superpowers/specs/2026-10-21-linea-visual-design.md), tabla «Pantalla por pantalla». Maqueta: el lienzo <https://claude.ai/artifact/6E2tVtacyqTcuifM1VNFyR>, aprobado por Joseph el 2026-10-21.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 C14 Turnos con fecha | ✅ | |
| 2 Sellos de confirmación | ✅ | |
| 3 Botones ocupados e inhabilitado sólido | ✅ | |
| 4 Vacíos ilustrados y estados desactivados | ✅ | |
| 5 Listas que entran al filtrar | ✅ | |
| 6 Documentos, verificación y PR | ✅ | Fusionada el 21 con el PR 180; el 181 corrigió el contraste. Faltan las `construida.png` nuevas (#177) |

## Global Constraints

- Las mismas de la fase 2: sin dependencias nuevas, sin hexadecimales en `apps/web/src`, transparencias intactas, «reducir movimiento» deja todo en su estado final, fechas en hora de Bogotá, área táctil de 48 px.
- El bloque de fecha va solo en C14: las fechas de la consola que son registro (bitácora, historial, conciliación, comprobantes, remisiones) siguen en texto.
- Un estado desactivado lleva etiqueta de texto y no muestra la acción principal.
- Un botón que espera una mutación usa `ocupado={m.isPending}` y conserva el texto que diga qué pasa («Guardando…») si la pantalla ya lo tenía. Un `<button>` escrito a mano que hace lo mismo que `Boton` pasa a `Boton`; los enlaces de texto («Rechazar», «Cancelar donación») se quedan como texto, con `toque`.
- Las pruebas que cambian se ajustan sin aflojar lo que comprueban.
- Al cerrar cada tarea: `bun run --filter @acopio/web test && bun run --filter @acopio/web typecheck`.
- Una rama y un PR para toda la fase. La rama es la que asigna la sesión en la nube (`claude/beautiful-faraday-11mzwz`), reiniciada desde `main` tras fusionar la fase 2.

## Review Focus

1. Un botón ocupado no manda dos veces la misma mutación (conciliar, despachar, recibir, guardar una jornada). Pruebas en las tareas 2 y 3.
2. El sello sale solo justo después de la acción, no cada vez que se abre algo que ya estaba conciliado o recibido. Prueba en la tarea 2.
3. Una jornada de C14 cancelada o pasada lleva el bloque en gris y su etiqueta, y no ofrece la acción principal. Prueba en la tarea 1.
4. Los vacíos con ilustración no repiten el nombre del dibujo como si fuera un ícono (`scripts/iconos.mjs`). `iconos.test.ts` lo cubre.
5. Las listas que entran escalonadas no reordenan ni pierden filas al filtrar. Prueba en la tarea 5.

---

### Task 1: C14 Turnos con fecha

**Files:** `apps/web/src/consola/turnos/Turnos.tsx`, `DetalleJornada.tsx`, `CalendarioFechas.tsx`, `Inscritos.tsx`, `FormularioJornada.tsx` y sus pruebas.

- La tarjeta de la lista lleva `BloqueFecha` a la izquierda en lugar de la línea con el ícono `event`; conserva `MarcaGestion`, el horario, el lugar, los cupos y el chevron. La tarjeta lleva `toque`. Una jornada que no admite acción (llena, cerrada, cancelada o pasada) lleva el bloque `apagado`.
- El detalle lleva el bloque de tamaño `detalle` junto al título.
- `CalendarioFechas`: los días que no se pueden elegir cambian `opacity` por gris sólido (`bg-surface-container-high text-on-surface-variant`).
- El vacío lleva `ilustracion="calendario"`.
- Los botones de `DetalleJornada`, `Inscritos` y `FormularioJornada` que esperan una mutación usan `ocupado`.

Pruebas: la lista muestra la fecha de cada jornada en su bloque (`.sr-only` con `diaSemana`); una cancelada lleva el bloque sin `bg-primary-fixed`; el vacío lleva el calendario; guardar una jornada ocupa el botón y no envía dos veces.

Commit: `Web: C14 con bloque de fecha y botones ocupados`.

### Task 2: Sellos de confirmación

**Files:** `consola/comprobantes/RecibirFolio.tsx`, `consola/recepciones/RecibirRemision.tsx`, `consola/comprobantes/Conciliacion.tsx`, `consola/remisiones/DetalleRemision.tsx` y sus pruebas.

- Recibir por folio y recibir remisión: el círculo con `check` pasa a `SelloConfirmacion` con `etiqueta` «Recibido» y «Remisión recibida».
- Conciliar: tras `conciliar.isSuccess` se ve `SelloConfirmacion etiqueta="Donación conciliada"` sobre la línea «Conciliada el …». Una donación que ya llegó conciliada muestra solo la línea, sin sello.
- Despachar: tras despachar, el aviso «… va en camino» lleva `SelloConfirmacion etiqueta="Remisión despachada"`.
- Los botones Conciliar, Revertir rechazo y Despachar usan `ocupado`.

Pruebas: cada sello aparece con su nombre tras la acción; una conciliada al cargar no lo trae; Conciliar ocupado no manda dos veces.

Commit: `Web: sello al recibir, conciliar y despachar`.

### Task 3: Botones ocupados e inhabilitado sólido

**Files:** los demás archivos de `consola/` y `acceso/` con `disabled={…isPending}` o `disabled={enviando}` (catálogo, causas, comprobantes, inventario, motor, recepciones, red, usuarios, `Entrar`, `ActivarCuenta`), más `HojaRechazo.tsx` y `EditorPasos.tsx`.

- `disabled={m.isPending}` pasa a `ocupado={m.isPending}`. Si el botón también se inhabilita por otra razón, queda `disabled={otra}` y `ocupado={m.isPending}`.
- El botón de rechazo de `HojaRechazo`, dibujado a mano, pasa a `Boton`.
- `disabled:opacity-*` en botones pasa a `disabled:bg-surface-container-high disabled:text-on-surface-variant`.

Pruebas: entrar (C01) muestra el botón ocupado mientras espera; rechazar en `HojaRechazo` es un `Boton` y queda ocupado mientras envía. El resto lo cubren las pruebas que ya existen.

Commit: `Web: botones ocupados e inhabilitado sólido en la consola`.

### Task 4: Vacíos ilustrados y estados desactivados

**Files:** los `EstadoVacio` de `consola/` y las listas con estados desactivados.

Ilustración por vacío, según la tabla de la especificación:

| Pantalla | Ilustración |
|---|---|
| Inventario, historial, catálogo y códigos, entidades, usuarios, acopios, bitácora, causas, descartes del motor, matriz de acceso, motor | `cajas` |
| Comprobantes, recepciones, remisiones (lista, nueva, líneas, documento) | `caja-folio` |
| Zonas, mi zona, reportar necesidad | `mapa` |
| Turnos, inscritos | `calendario` |

Desactivados: categoría archivada, emergencia cerrada, usuario suspendido, acopio cerrado y zona cerrada llevan `opacity-70` en la fila y su etiqueta en gris sólido (`bg-surface-container-high text-on-surface-variant`). La etiqueta ya existe en cada caso; si alguno no la tiene, se agrega.

Pruebas: un vacío de cada grupo lleva su ilustración; una categoría archivada se ve atenuada con su etiqueta.

Commit: `Web: vacíos ilustrados y desactivados en la consola`.

### Task 5: Listas que entran al filtrar

**Files:** `consola/remisiones/Remisiones.tsx`, `consola/Bitacora.tsx` y sus pruebas.

- Remisiones (C12): la lista lleva `key` con el estado y la zona, y cada fila `entra-lista` con `retrasoEntrada(i)`. Las píldoras de estado llevan `toque`.
- Bitácora (C17): cada grupo de día lleva `key` con los filtros y sus filas entran escalonadas.

Prueba: al cambiar de estado en C12 se ven las remisiones del estado nuevo, en el mismo orden que da la API.

Commit: `Web: listas de remisiones y bitácora que entran al filtrar`.

### Task 6: Documentos, verificación y PR

- «Cambios al construir» de la especificación, catálogo de patrones si algo nuevo es reutilizable, una sección en la nota de cada pantalla de consola que cambió, la fila 22 del plan de acción y su registro, la tabla de estado de este plan, el informe de la sesión y su fila en el índice.
- Verificación completa: lint, typecheck, depcruise, `revisar-colores.sh`, test y test:int.
- PR hacia `main` con el enlace a #177.
