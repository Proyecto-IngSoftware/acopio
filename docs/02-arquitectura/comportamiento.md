---
title: "Comportamiento"
type: arquitectura
tags: [arquitectura, comprobantes, diagrama]
estado: vigente
actualizado: 2026-10-30
---

# Comportamiento

Diagramas de comportamiento de lo que ya está construido. Se dibujan a mano en SVG en
[diagramas/comportamiento.html](diagramas/comportamiento.html) y se exportan a PNG con
`node diagramas/exportar-complemento.mjs`, igual que el diagrama de paquetes.

## Ciclo de vida de la donación

![Estados de la donación: PREPARADO, PENDIENTE, CONCILIADO, RECHAZADO y CANCELADO, con nueve transiciones numeradas y coloreadas según quién las dispara.](../assets/diagramas/comportamiento-01-estados-de-la-donacion.png)

El diagrama sigue a una donación (tabla `comprobante`, enum `EstadoComprobante`) desde que el
Donador la prepara en el portal hasta que un Auditor la concilia contra las entradas de
inventario, la rechaza, o hasta que se cancela. Corresponde a la historia
[HU-006](../01-requerimientos/historias/README.md) («Comprobar que mi donación llegó») y a los
requerimientos RF-CMP-001B, RF-CMP-001C, RF-CMP-004, RF-CMP-005 y RF-CMP-006 de
[comprobantes.md](../01-requerimientos/funcionales/comprobantes.md). Es un diagrama de estados
porque en la donación intervienen cuatro actores (Donador, Operador, Auditor y una tarea
programada) y lo que cada uno puede hacer depende del estado en que la encuentra.

El color de cada flecha dice quién dispara el cambio, y cada etiqueta sigue la notación UML
«evento [guarda] / efecto». Las cajas grises de borde grueso son estados finales. Los números son
los de esta tabla:

| # | Transición | Quién | Guarda que exige la API | Método en `modulos/comprobantes/` |
|---|---|---|---|---|
| 1 | inicio → PREPARADO | Donador | El acopio está abierto y el Donador tiene menos de 5 donaciones preparadas | `DonacionesService.crear` |
| 2 | PREPARADO → PENDIENTE | Operador | Tiene asignado ese acopio y confirma cada línea una vez | `RecepcionService.recibir` |
| 3 | PREPARADO → PENDIENTE | Auditor o Admin | Las entradas son del mismo acopio y no pertenecen a otra donación | `ConciliacionService.vincular` |
| 4 | PENDIENTE → PENDIENTE | Auditor o Admin | Igual que 3 | `ConciliacionService.vincular` |
| 5 | PENDIENTE → CONCILIADO | Auditor o Admin | Hay al menos una entrada vinculada | `ConciliacionService.conciliar` |
| 6 | PENDIENTE → RECHAZADO | Auditor o Admin | Indica un motivo; si el Donador tiene correo, se encola el aviso | `ConciliacionService.rechazar` |
| 7 | RECHAZADO → PENDIENTE | Auditor o Admin | El acopio está en su alcance | `ConciliacionService.revertirRechazo` |
| 8 | PREPARADO → CANCELADO | Donador | La donación es suya | `DonacionesService.cancelar` |
| 9 | PREPARADO → CANCELADO | Tarea `preparadas-vencidas`, 00:15 hora de Colombia | Pasaron 7 días sin entregarla | `TareasCustodiaService.cancelarVencidas` |

Los límites de 5 preparadas y 7 días son los valores por defecto de `PREPARADAS_MAXIMO` y
`PREPARADA_VIGENCIA_DIAS` (`apps/api/src/config/entorno.ts`).

Cada cambio de estado exige el estado anterior en el mismo `UPDATE` (`cambiarSiEstado` del DAO de
comprobantes). Si el Operador recibe un folio en el mismo instante en que la tarea diaria lo
cancela (flechas 2 y 9), una de las dos operaciones ya no encuentra la fila en `PREPARADO` y no
cambia nada.

## Cola de correo

El diagrama de productores, cola y consumidor de `correo_saliente` está en
[diagramas/concurrencia.html](diagramas/concurrencia.html), y su explicación en la sección 3 del
[complemento de la sustentación](../entregas/complemento-sustentacion.md).
