---
title: "ADR-0025 · Saldos del historial por bloques de secuencias"
type: adr
tags: [arquitectura, adr, inventario]
estado: vigente
adr: 25
decision: aceptada
actualizado: 2026-11-18
---

# ADR-0025 · Saldos del historial por bloques de secuencias

## Contexto

[RF-INV-006](../../01-requerimientos/funcionales/inventario.md#rf-inv-006--ver-historial-de-una-categoría)
pide el saldo resultante en cada fila. La consulta acumulaba todo el historial de una
categoría y después aplicaba el cursor y el límite. Con 100.000 movimientos procesaba
alrededor de 100.000 filas para devolver 51.

## Decisión

Mantener la variación neta de cada par acopio-categoría en bloques de 1024 secuencias.
El disparador actualiza el bloque junto con el registro del movimiento en la misma
transacción. La migración rellena los bloques desde `movimiento`, la fuente de verdad del
inventario según [ADR-0015](ADR-0015-saldo-en-tabla-por-disparador.md). El rol `acopio_app`
solo puede leer los bloques.

La consulta toma una página por secuencia, parte del saldo actual y resta los bloques
posteriores y las filas más nuevas que comparte con el primer movimiento de la página.
Con ese saldo inicial calcula los demás saldos de la página. El DAO lee movimientos,
saldos y bloques en la misma consulta, y el cursor sigue siendo una secuencia.

## Consecuencias

Cada movimiento de acopio actualiza una fila adicional. El índice por
`(acopio_id, categoria_id, secuencia)` sirve tanto para recorrer la página como para
obtener la parte del bloque que hay que restar. Una página antigua lee más bloques que
la primera página. Si un movimiento confirma fuera de orden, su variación entra en
el bloque de su secuencia y el siguiente lector ve el saldo correcto.

La migración bloquea las escrituras en `movimiento` mientras crea el índice y rellena
los bloques. Antes de aplicarla en el servidor se debe medir esa ventana con un volumen
representativo.
