---
title: "Diseño — índice"
type: moc
tags: [moc, diseno]
estado: vigente
actualizado: 2026-10-06
---

# Diseño — índice

| Nota | Qué guarda |
|---|---|
| [sistema-diseno.md](sistema-diseno.md) | Tokens, componentes, reglas móviles, accesibilidad |
| [flujos.md](flujos.md) | Los seis recorridos críticos, de punta a punta |
| [stitch/](stitch/README.md) | **Un diseño por pantalla**: captura y HTML de Stitch, maqueta aprobada y diferencias |
| [prompt-video-donacion.md](prompt-video-donacion.md) | Guion y prompts del video animado: cómo donar, paso a paso |
| [api/](api/README.md) | **Contrato de la API para el frontend**: sesión, invitaciones, errores y endpoints por pantalla. La interfaz se hace con Google Stitch ([ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md)) |

## Las dos reglas que gobiernan todo lo visual

**1 · El color semántico está reservado.** Rojo, ámbar, verde y morado significan
estado de existencias. Por eso la marca es teal.
Ver [ADR-0006](../02-arquitectura/adr/ADR-0006-color-semantico-reservado.md).

**2 · Móvil primero, sin excusas.** Se usa de pie, con guantes, bajo sol, con el
celular al 12 %. Cada decisión —48 px de área táctil, 16 px de piso tipográfico,
antigüedad visible en todo dato— sale de esa frase.

## Cómo nace una pantalla

Se pide a Google Stitch, se arma una maqueta con los tokens de la app y Joseph la
aprueba antes de escribir código ([ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md),
[ADR-0013](../02-arquitectura/adr/ADR-0013-estetica-desde-stitch.md)). Cada pantalla guarda su
diseño en [stitch/](stitch/README.md). La carpeta `canvas-base/` es el lienzo de Claude
Design de septiembre, que se conserva como historia.

## Relacionado

- [Actores](../00-contexto/actores.md) — de aquí salen las condiciones de uso
- [RNF](../01-requerimientos/no-funcionales.md) — accesibilidad y rendimiento
- [ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md) — por qué Stitch y una SPA con Vite
