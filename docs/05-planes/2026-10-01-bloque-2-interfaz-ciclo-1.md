---
title: "Bloque 2 · Interfaz, ciclo 1: entrada rápida, inventario e historial · plan"
type: plan
tags: [plan, interfaz, bloque-2]
estado: vigente
bloque: 2
actualizado: 2026-10-01
---

# Bloque 2 · Interfaz, ciclo 1: entrada rápida, inventario e historial · plan

**Objetivo:** que un Operador registre lo que llega a su acopio con conexión (C4), vea el
saldo de cada categoría con su semáforo (C3) y explique cualquier cifra (Historial). El
Auditor y el Administrador consultan C3 e Historial.

**Especificación:** [Bloque 2](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md),
§6 y §7 (etapa 2). La API ya está construida ([plan](2026-10-01-bloque-2-api.md)).

**Diseños aprobados por Joseph el 2026-10-01, con sus diferencias:**
[C4](../03-diseno/stitch/C04-entrada-rapida/README.md) y
[C3 e Historial](../03-diseno/stitch/C03-inventario/README.md).

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| E-01 | Rutas `/consola/acopios/:id/entrada` (C4), `/consola/acopios/:id/inventario` (C3) y `/consola/acopios/:id/inventario/:categoriaId` (Historial) | Siguen el patrón de «Mi acopio» y «No recibir» |
| E-02 | C4 solo para el Operador; C3 e Historial para Operador, Administrador y Auditor, con `RequiereRol` | V-04 y §1.7 de la especificación |
| E-03 | C4 muestra arriba la tarjeta «Recibir por folio», inactiva, con «Llega con los comprobantes» | Decisión de Joseph del 2026-10-01: la lista prellenada por folio es la entrada principal y llega en el Bloque 3 |
| E-04 | C4 manda un `id` generado en el navegador (`crypto.randomUUID()`) en cada entrada | Un doble toque o un reintento no duplica (idempotencia de la API) y deja lista la cola sin conexión del ciclo 3 |
| E-05 | La cantidad se escribe con el teclado de la pantalla y también con el del equipo (`inputmode="decimal"`); la coma es el separador decimal | Guantes y sol en el teléfono; teclado físico en un computador |
| E-06 | Token nuevo `sobra` (morado) y `sobra-container` en `packages/ui-tokens` para «Sobre el máximo» | RF-INV-005; aprobado con la maqueta |
| E-07 | En «Más», «Mi acopio» suma Entrada rápida (Operador) e Inventario (Operador y Auditor) para la ubicación activa. El Administrador llega a C3 desde el formulario del acopio en C21 | Las herramientas cuelgan de la ubicación activa (§6) |
| E-08 | El escáner no aparece en este ciclo | Llega en el ciclo 2 |

## Tareas

1. **Base:** token `sobra`; ganchos en `src/api/inventario.ts` (saldos, historial con
   «cargar más», registrar entrada); pieza `EtiquetaSemaforo` con ícono y texto; pruebas.
2. **C3 Inventario:** lista, resumen por estado, orden (más urgente, nombre, sin
   movimiento), estados vacío y de error, botón a C4 para el Operador.
3. **Historial:** tarjeta de saldo con umbral y vencimiento estimado, lista de movimientos
   con saldo después, motivo de ajustes, marca de registro sin conexión y «Cargar más».
4. **C4 Entrada rápida:** tarjeta «Recibir por folio», búsqueda de categoría, tarjeta con
   saldo actual, cantidad con teclado, fecha de vencimiento en perecederos, aviso de «no
   recibir», registro con `id` del navegador, saldo resultante y reinicio para la
   siguiente entrada.
5. **Navegación:** rutas, «Más» y enlace desde C21.
6. **Cierre:** recorrido en el Compose con un Operador y un Auditor, axe en Chromium a 360
   × 640, C4 cronometrado (meta: menos de 10 s por entrada), capturas `construida.png` y
   documentación.

Cada tarea sigue el contrato de los ciclos anteriores: pruebas primero con Vitest y
Testing Library (`responderSegun`), `lint`, `typecheck`, `test`, colores y commit a `main`.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Base | ⬜ | |
| 2 C3 | ⬜ | |
| 3 Historial | ⬜ | |
| 4 C4 | ⬜ | |
| 5 Navegación | ⬜ | |
| 6 Cierre | ⬜ | |
