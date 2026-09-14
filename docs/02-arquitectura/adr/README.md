---
title: "Registro de decisiones de arquitectura"
type: moc
tags: [moc, adr]
estado: vigente
actualizado: 2026-09-12
---

# Registro de decisiones de arquitectura

Una decisión por archivo. **Nunca se editan las decisiones aceptadas**: si una
cambia, se escribe una nueva que la reemplace y la anterior pasa a estado
`reemplazada por ADR-XXXX`.

Esa regla es lo que convierte esta carpeta en memoria del proyecto y no en un
documento que se reescribe hasta perder la historia.

## Índice

| ADR | Decisión | Estado |
|---|---|---|
| [0001](ADR-0001-supabase-solo-auth.md) | Supabase solo para autenticación | aceptada |
| [0002](ADR-0002-saldo-derivado.md) | El saldo se deriva, no se guarda | aceptada |
| [0003](ADR-0003-rol-global-alcance-multiple.md) | Rol global, alcance múltiple | aceptada |
| [0004](ADR-0004-frontend-lovable-spa.md) | Frontend SPA generado con Lovable | reemplazada por ADR-0009 |
| [0005](ADR-0005-offline-solo-movimientos.md) | Offline limitado a movimientos | aceptada |
| [0006](ADR-0006-color-semantico-reservado.md) | El color semántico está reservado | aceptada |
| [0007](ADR-0007-donador-excepcion-rol.md) | El Donador, excepción controlada al modelo de roles | aceptada |
| [0008](ADR-0008-arquitectura-stack-inicial.md) | Arquitectura y selección tecnológica inicial — el «ADR-001» del curso | aceptada |
| [0009](ADR-0009-mockups-claude-design.md) | Mockups con Claude Design, interfaz implementada por el equipo | aceptada |
| [0010](ADR-0010-varias-emergencias-activas.md) | Varias emergencias activas; el acopio no pertenece a ninguna. Modifica una restricción de ADR-0008 | aceptada |

## Cuándo escribir una

Cuando una decisión sea **cara de revertir** y alguien pueda preguntar en tres
meses «¿por qué se hizo así?». Elección de stack, límites de módulo, modelo de
datos, estrategia de seguridad, dependencias externas.

No para lo que se cambia en una tarde.

## Plantilla

```markdown
# ADR-XXXX · Título en una línea

**Fecha:** AAAA-MM-DD · **Estado:** propuesta | aceptada | reemplazada por ADR-YYYY

## Contexto
Qué situación obliga a decidir. Sin juicios todavía.

## Decisión
Qué se decidió. En presente y en afirmativo.

## Alternativas consideradas
Cada una con la razón concreta del descarte. Esta sección es la que da valor al
documento: sin ella, nadie sabe si la alternativa se evaluó o se ignoró.

## Consecuencias
### A favor
### En contra
Honestas. Un ADR sin costos es propaganda.
```
