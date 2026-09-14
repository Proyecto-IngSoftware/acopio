---
title: "ADR-XXXX · Título en una línea"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 0
decision: propuesta
actualizado: 2026-08-20
---

# ADR-XXXX · Título en una línea

**Fecha:** AAAA-MM-DD · **Estado:** propuesta | aceptada | reemplazada por ADR-YYYY

## Contexto

Qué situación obliga a decidir. Hechos, sin juicios todavía.

## Decisión

Qué se decidió. En presente y en afirmativo.

## Alternativas consideradas

Cada una con la razón concreta del descarte.

**Esta sección es la que da valor al documento.** Sin ella nadie sabe si la
alternativa se evaluó o simplemente se ignoró.

## Consecuencias

### A favor

### En contra

Honestas. **Un ADR sin costos es propaganda.**

---

## Cómo usar esta plantilla

1. Copia el archivo a `docs/02-arquitectura/adr/`
2. Nombre: `ADR-000N-descripcion-corta.md`, con el número siguiente disponible
3. Rellena `adr:` y `decision:` en las propiedades
4. Añádelo al índice de [adr/README.md](../02-arquitectura/adr/README.md)

**Las decisiones aceptadas no se editan.** Si una cambia, se escribe otra que la
reemplace y esta pasa a `decision: reemplazada`.
