---
title: "ADR-0005 · Offline limitado a la captura de movimientos"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 5
decision: aceptada
actualizado: 2026-08-20
---

# ADR-0005 · Offline limitado a la captura de movimientos

**Fecha:** 2026-08-20 · **Estado:** aceptada

## Contexto

En bodega de acopio y en zona de desastre la señal es intermitente o inexistente.
El equipo pidió capacidad offline.

Una aplicación offline completa —lectura y escritura de todo el modelo con
sincronización bidireccional— es un proyecto en sí mismo: colas de operaciones,
detección de conflictos, resolución de escrituras concurrentes.

El motor de emparejamiento es el aporte original del proyecto y no puede quedar
sin terminar.

## Decisión

**El modo offline se limita al formulario de movimiento de inventario (C04).**

- Cola local en IndexedDB
- Los movimientos son **append-only**: nunca edición, nunca borrado
- Sincronización por reenvío en orden, con reintento y espera creciente
- Todo lo demás de la aplicación requiere conexión

## Por qué esto sí es viable

Un movimiento es un **hecho inmutable**: *entraron 200 L de agua al Acopio Norte a
las 3:14 pm*. No es un estado editable.

Dos dispositivos que sincronizan colas de hechos simplemente insertan todo; el
orden no altera la suma. **No hay conflictos que resolver porque no hay estado
compartido que sobrescribir.**

Si en cambio se sincronizara el saldo —un estado editable—, dos dispositivos con
valores distintos exigirían decidir cuál gana, y cualquier respuesta produce
pérdida de datos. Ese es el problema difícil que esta decisión esquiva.

Depende directamente de [ADR-0002](ADR-0002-saldo-derivado.md). Sin saldo derivado,
esta decisión no sería posible.

## Alternativas consideradas

**Offline completo con CRDT o con una base local replicada.** Elegante y muy caro.
Descartada por riesgo de calendario.

**Sin offline.** Más simple, pero deja al operador sin poder registrar en el
momento en que la señal falla — que es justo cuando más carga hay.

## Consecuencias

### A favor
- Sincronización sin resolución de conflictos
- Cubre el caso de uso crítico: el operador nunca deja de poder registrar
- Contenido acotado, estimable, recortable

### En contra
- Los saldos mostrados sin conexión pueden estar desactualizados. Se marcan como
  estimados
- El dispositivo debe estar previamente autenticado; sin conexión no se inicia
  sesión (ver [ADR-0001](ADR-0001-supabase-solo-auth.md))
- Un movimiento rechazado por el servidor al sincronizar debe mostrarse al operador
  con su motivo, sin perderse

### Requisitos derivados
- Indicador permanente de cuántos movimientos hay pendientes de sincronizar
- `ocurrido_en` local separado de `registrado_en` del servidor
- Bandeja de movimientos rechazados, con su motivo

### Prioridad

Es el **primer recorte** si el calendario aprieta. Está clasificado como `DEBERÍA`,
no `DEBE`, precisamente para que sacrificarlo no rompa nada más.
