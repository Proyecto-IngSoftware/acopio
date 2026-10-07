---
title: "ADR-0018 · Las zonas reciben en el mismo libro de movimientos que los acopios"
type: adr
tags: [arquitectura, adr, inventario, motor]
estado: vigente
adr: 18
decision: aceptada
actualizado: 2026-10-07
---

# ADR-0018 · Las zonas reciben en el mismo libro de movimientos que los acopios

**Fecha:** 2026-10-06 · **Estado:** aceptada · **Extiende:**
[ADR-0002](ADR-0002-saldo-derivado.md) y
[ADR-0015](ADR-0015-saldo-en-tabla-por-disparador.md) · **Deriva de:** M-01 de la
[especificación del Bloque 4](../../superpowers/specs/2026-10-06-bloque-4-motor-design.md)

## Contexto

[RF-MOT-003](../../01-requerimientos/funcionales/motor.md#rf-mot-003--calcular-déficit-y-cobertura)
define lo recibido por una zona como la suma de sus movimientos `RECEPCION`. Hasta el
Bloque 3, `movimiento` exigía `acopio_id`, y su disparador mantenía el saldo de cada
acopio. Una zona no tiene acopio, y en ella nadie cuenta existencias: solo importa lo que
llegó.

## Decisión

`movimiento` registra también lo que recibe una zona:

- `acopio_id` pasa a ser opcional y se suman `zona_id` y `remision_id`, con llave foránea
  `RESTRICT`. `tipo` gana `RECEPCION`.
- `movimiento_acopio_o_zona`: cada fila es de un acopio o de una zona, nunca de los dos.
- `movimiento_recepcion_en_zona`: una `RECEPCION` es siempre de una zona, y una zona solo
  tiene `RECEPCION`.
- `movimiento_recepcion_con_remision`: una `RECEPCION` trae su remisión y suma.
- El disparador `movimiento_actualiza_saldo` corre solo `WHEN (NEW.acopio_id IS NOT NULL)`.
  Las zonas no tienen saldo.

Los tres `CHECK` comparan `tipo::text`. PostgreSQL no deja usar un valor de enum en la
misma transacción que lo agrega, y la migración hace las dos cosas.

La tabla sigue siendo append-only para `acopio_app`, igual que antes.

## Alternativas

1. Una tabla `recepcion_zona` aparte. No toca el núcleo del Bloque 2, pero sería un
   segundo libro append-only con sus propios permisos, y RF-MOT-003 tendría que cambiar.
2. Sumar `linea_remision.cantidad_recibida` de las remisiones recibidas. Es lo más simple,
   pero en la zona no quedaría ningún registro propio de lo que llegó.

## Consecuencias

- El código que lee `movimiento` recibe `acopio_id: string | null`. En el Bloque 4 se
  ajustaron tres sitios con un filtro o una guarda explícita: la vista de movimientos,
  los vencimientos estimados de C3 y la vinculación de entradas a un folio.
- Todo lo que se mueve, en un acopio o en una zona, queda en una sola tabla que no se
  edita ni se borra. La ventana de lo recibido (M-02) se calcula con el índice
  `(zona_id, categoria_id, ocurrido_en)`.
