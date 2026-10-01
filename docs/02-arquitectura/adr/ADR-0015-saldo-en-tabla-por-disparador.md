---
title: "ADR-0015 · El saldo vive en una tabla que mantiene un disparador"
type: adr
tags: [arquitectura, adr, inventario]
estado: vigente
adr: 15
decision: aceptada
actualizado: 2026-10-01
---

# ADR-0015 · El saldo vive en una tabla que mantiene un disparador

**Fecha:** 2026-10-01 · **Estado:** aceptada; precisada al construir el mismo día · **Ajusta:** la estrategia de saldos de
[ADR-0002](ADR-0002-saldo-derivado.md) y de [modelo-datos.md](../modelo-datos.md#estrategia-de-saldos)

## Contexto

ADR-0002 decidió que el saldo se deriva de movimientos inmutables y propuso calcularlo
con una vista materializada «refrescada por disparador, con refresco selectivo por
fila». Al especificar el [Bloque 2](../../superpowers/specs/2026-10-01-bloque-2-inventario-design.md)
apareció que PostgreSQL no refresca una vista materializada por fila: `REFRESH
MATERIALIZED VIEW` la recalcula entera, y dos refrescos simultáneos se bloquean entre
sí. Además, RF-INV-011 pide que el saldo nunca quede negativo con dos Operadores
registrando a la vez, y una vista no puede impedirlo.

## Decisión

**El saldo vive en una tabla `saldo` que mantiene un disparador `AFTER INSERT` sobre
`movimiento`.** El principio de ADR-0002 no cambia: los movimientos son la verdad y
el saldo se deriva de ellos.

- La función del disparador es `SECURITY DEFINER`, del dueño. Primero actualiza la
  fila de `(acopio, categoría)` y, solo si no existe, la inserta. Un `INSERT … ON
  CONFLICT DO UPDATE` directo no sirve: PostgreSQL revisa el `CHECK` sobre la fila
  propuesta, y la de una salida trae cantidad negativa aunque el saldo alcance.
- `saldo.cantidad` tiene `CHECK (cantidad >= 0)`. Una salida que la dejaría negativa
  hace fallar la transacción entera.
- La actualización bloquea solo la fila de `(acopio, categoría)`: los registros sobre
  la misma categoría se ordenan y los de categorías distintas no se estorban.
- Antes de una salida o un ajuste, la API toma `pg_advisory_xact_lock` por `(acopio,
  categoría)` y lee el saldo para responder 409 con el disponible. No usa `SELECT …
  FOR UPDATE`, que pediría permiso de `UPDATE` sobre `saldo`.
- `acopio_app` tiene solo `SELECT` sobre `saldo` y solo `SELECT` e `INSERT` sobre
  `movimiento`.
- Una prueba de integración compara `saldo` con la suma real de los movimientos.

## Alternativas consideradas

**Vista materializada.** La de ADR-0002. Se refresca entera en cada movimiento, los
refrescos de acopios distintos se bloquean y el «no negativo» tendría que ir en el
código.

**Vista simple que suma al consultar, con candado en la API.** La API toma
`pg_advisory_xact_lock` por `(acopio, categoría)`, suma y valida antes de insertar.
Siempre es correcta, pero la regla del «no negativo» queda solo en la aplicación, y el
modelo pide que lo expresable en el esquema vaya en el esquema. La decisión usa el mismo
candado, pero como primera barrera; la segunda es el `CHECK`.

## Consecuencias

### A favor

- El «no negativo» lo garantiza la base de datos, aunque alguien escriba un script.
- Leer saldos es un `SELECT` directo, sin agregación.
- La concurrencia se resuelve con el bloqueo de una fila, que PostgreSQL ya sabe hacer.

### En contra

- El disparador es SQL escrito a mano en una migración, fuera de lo que Prisma genera.
  Si se desalinea con `movimiento`, solo la prueba de integración lo detecta.
- Hay dos lugares con la misma información. La prueba que compara `saldo` con la suma
  de los movimientos es obligatoria en CI.
